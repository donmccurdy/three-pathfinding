import {
	Vector3,
	Plane,
	Triangle,
} from 'three';

import { Utils } from './Utils';
import { AStar } from './AStar';
import { Builder } from './Builder';
import { Channel } from './Channel';

/**
 * Defines an instance of the pathfinding module, with one or more zones.
 */
class Pathfinding {
	constructor () {
		this.zones = {};
	}

	/**
	 * (Static) Builds a zone/node set from navigation mesh geometry.
	 * @param  {BufferGeometry} geometry
	 * @param  {number} tolerance Vertex welding tolerance.
	 * @return {Zone}
	 */
	static createZone (geometry, tolerance = 1e-4) {
		return Builder.buildZone(geometry, tolerance);
	}

	/**
	 * Sets data for the given zone.
	 * @param {string} zoneID
	 * @param {Zone} zone
	 */
	setZoneData (zoneID, zone) {
		this.zones[zoneID] = zone;
	}

	/**
	 * Returns a random node within a given range of a given position.
	 * @param  {string} zoneID
	 * @param  {number} groupID
	 * @param  {Vector3} nearPosition
	 * @param  {number} nearRange
	 * @return {Node}
	 */
	getRandomNode (zoneID, groupID, nearPosition, nearRange) {

		if (!this.zones[zoneID]) return new Vector3();

		nearPosition = nearPosition || null;
		nearRange = nearRange || 0;

		const candidates = [];
		const polygons = this.zones[zoneID].groups[groupID];

		polygons.forEach((p) => {
			if (nearPosition && nearRange) {
				if (Utils.distanceToSquared(nearPosition, p.centroid) < nearRange * nearRange) {
					candidates.push(p.centroid);
				}
			} else {
				candidates.push(p.centroid);
			}
		});

		return Utils.sample(candidates) || new Vector3();
	}

	/**
	 * Returns the closest node to the target position.
	 * @param  {Vector3} position
	 * @param  {string}  zoneID
	 * @param  {number}  groupID
	 * @param  {boolean} checkPolygon
	 * @return {Node}
	 */
	getClosestNode (position, zoneID, groupID, checkPolygon = false) {
		const nodes = this.zones[zoneID].groups[groupID];
		const vertices = this.zones[zoneID].vertices;
		let closestNode = null;
		let closestDistance = Infinity;

		nodes.forEach((node) => {
			const distance = Utils.distanceToSquared(node.centroid, position);
			if (distance < closestDistance
					&& (!checkPolygon || Utils.isVectorInPolygon(position, node, vertices))) {
				closestNode = node;
				closestDistance = distance;
			}
		});

		return closestNode;
	}

	/**
	 * Returns a path between given start and end points. If a complete path
	 * cannot be found, will return the nearest endpoint available.
	 *
	 * @param  {Vector3} startPosition Start position.
	 * @param  {Vector3} targetPosition Destination.
	 * @param  {string} zoneID ID of current zone.
	 * @param  {number} groupID Current group ID.
	 * @return {Array<Vector3>} Array of points defining the path.
	 */
	findPath (startPosition, targetPosition, zoneID, groupID) {
		const nodes = this.zones[zoneID].groups[groupID];
		const vertices = this.zones[zoneID].vertices;

		const closestNode = this.getClosestNode(startPosition, zoneID, groupID, true);
		const farthestNode = this.getClosestNode(targetPosition, zoneID, groupID, true);

		// If we can't find any node, just go straight to the target
		if (!closestNode || !farthestNode) {
			return null;
		}

		const paths = AStar.search(nodes, closestNode, farthestNode);

		const getPortalFromTo = function (a, b) {
			for (var i = 0; i < a.neighbours.length; i++) {
				if (a.neighbours[i] === b.id) {
					return a.portals[i];
				}
			}
		};

		// We have the corridor, now pull the rope.
		const channel = new Channel();
		channel.push(startPosition);
		for (let i = 0; i < paths.length; i++) {
			const polygon = paths[i];
			const nextPolygon = paths[i + 1];

			if (nextPolygon) {
				const portals = getPortalFromTo(polygon, nextPolygon);
				channel.push(
					vertices[portals[0]],
					vertices[portals[1]]
				);
			}
		}
		channel.push(targetPosition);
		channel.stringPull();

		// Return the path, omitting first position (which is already known).
		const path = channel.path.map((c) => new Vector3(c.x, c.y, c.z));
		path.shift();
		return path;
	}
}

/**
 * Returns closest node group ID for given position.
 * @param  {string} zoneID
 * @param  {Vector3} position
 * @return {number}
 */
Pathfinding.prototype.getGroup = (function() {
	const plane = new Plane();
	return function (zoneID, position, checkPolygon = false) {
		if (!this.zones[zoneID]) return null;

		let closestNodeGroup = null;
		let distance = Math.pow(50, 2);
		const zone = this.zones[zoneID];

		for (let i = 0; i < zone.groups.length; i++) {
			const group = zone.groups[i];
			for (const node of group) {
				if (checkPolygon) {
					plane.setFromCoplanarPoints(
						zone.vertices[node.vertexIds[0]],
						zone.vertices[node.vertexIds[1]],
						zone.vertices[node.vertexIds[2]]
					);
					if (Math.abs(plane.distanceToPoint(position)) < 0.01) {
						const poly = [
							zone.vertices[node.vertexIds[0]],
							zone.vertices[node.vertexIds[1]],
							zone.vertices[node.vertexIds[2]]
						];
						if(Utils.isPointInPoly(poly, position)) {
							return i;
						}
					}
				}
				const measuredDistance = Utils.distanceToSquared(node.centroid, position);
				if (measuredDistance < distance) {
					closestNodeGroup = i;
					distance = measuredDistance;
				}
			}
		}

		return closestNodeGroup;
	};
}());

/**
 * Clamps a step along the navmesh, given start and desired endpoint. May be
 * used to constrain first-person / WASD controls.
 *
 * @param  {Vector3} start
 * @param  {Vector3} end Desired endpoint.
 * @param  {Node} node
 * @param  {string} zoneID
 * @param  {number} groupID
 * @param  {Vector3} endTarget Updated endpoint.
 * @return {Node} Updated node.
 */
Pathfinding.prototype.clampStep = (function () {
	const point = new Vector3();
	const plane = new Plane();
	const triangle = new Triangle();

	const endPoint = new Vector3();

	let closestNode;
	let closestPoint = new Vector3();
	let closestDistance;

	return function (startRef, endRef, node, zoneID, groupID, endTarget) {
		const vertices = this.zones[zoneID].vertices;
		const nodes = this.zones[zoneID].groups[groupID];

		const nodeQueue = [node];
		const nodeDepth = {};
		nodeDepth[node.id] = 0;

		closestNode = undefined;
		closestPoint.set(0, 0, 0);
		closestDistance = Infinity;

		// Project the step along the current node.
		plane.setFromCoplanarPoints(
			vertices[node.vertexIds[0]],
			vertices[node.vertexIds[1]],
			vertices[node.vertexIds[2]]
		);
		plane.projectPoint(endRef, point);
		endPoint.copy(point);

		for (let currentNode = nodeQueue.pop(); currentNode; currentNode = nodeQueue.pop()) {

			triangle.set(
				vertices[currentNode.vertexIds[0]],
				vertices[currentNode.vertexIds[1]],
				vertices[currentNode.vertexIds[2]]
			);

			triangle.closestPointToPoint(endPoint, point);

			if (point.distanceToSquared(endPoint) < closestDistance) {
				closestNode = currentNode;
				closestPoint.copy(point);
				closestDistance = point.distanceToSquared(endPoint);
			}

			const depth = nodeDepth[currentNode.id];
			if (depth > 2) continue;

			for (let i = 0; i < currentNode.neighbours.length; i++) {
				const neighbour = nodes[currentNode.neighbours[i]];
				if (neighbour.id in nodeDepth) continue;

				nodeQueue.push(neighbour);
				nodeDepth[neighbour.id] = depth + 1;
			}
		}

		endTarget.copy(closestPoint);
		return closestNode;
	};
}());

/**
 * Defines a zone of interconnected groups on a navigation mesh.
 *
 * @type {Object}
 * @property {Array<Group>} groups
 * @property {Array<Vector3>} vertices
 */
const Zone = {}; // jshint ignore:line

/**
 * Defines a group within a navigation mesh.
 *
 * @type {Object}
 */
const Group = {}; // jshint ignore:line

/**
 * Defines a node (or polygon) within a group.
 *
 * @type {Object}
 * @property {number} id
 * @property {Array<number>} neighbours IDs of neighboring nodes.
 * @property {Array<number>} vertexIds
 * @property {Vector3} centroid
 * @property {Array<Array<number>>} portals Array of portals, each defined by two vertex IDs.
 * @property {boolean} closed
 * @property {number} cost
 */
const Node = {}; // jshint ignore:line

export { Pathfinding };
