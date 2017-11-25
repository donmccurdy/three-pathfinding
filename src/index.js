/* global THREE */

const utils = require('./utils');
const AStar = require('./AStar');
const Channel = require('./Channel');

var polygonId = 1;

var buildPolygonGroups = function (navigationMesh) {

	var polygons = navigationMesh.polygons;

	var polygonGroups = [];
	var groupCount = 0;

	var spreadGroupId = function (polygon) {
		polygon.neighbours.forEach((neighbour) => {
			if (neighbour.group === undefined) {
				neighbour.group = polygon.group;
				spreadGroupId(neighbour);
			}
		});
	};

	polygons.forEach((polygon) => {

		if (polygon.group === undefined) {
			polygon.group = groupCount++;
			// Spread it
			spreadGroupId(polygon);
		}

		if (!polygonGroups[polygon.group]) polygonGroups[polygon.group] = [];

		polygonGroups[polygon.group].push(polygon);
	});

	console.log('Groups built: ', polygonGroups.length);

	return polygonGroups;
};

var buildPolygonNeighbours = function (polygon, navigationMesh) {
	polygon.neighbours = [];

	// All other nodes that contain at least two of our vertices are our neighbours
	for (var i = 0, len = navigationMesh.polygons.length; i < len; i++) {
		if (polygon === navigationMesh.polygons[i]) continue;

		// Don't check polygons that are too far, since the intersection tests take a long time
		if (polygon.centroid.distanceToSquared(navigationMesh.polygons[i].centroid) > 100 * 100) continue;

		var matches = utils.array_intersect(polygon.vertexIds, navigationMesh.polygons[i].vertexIds);

		if (matches.length >= 2) {
			polygon.neighbours.push(navigationMesh.polygons[i]);
		}
	}
};

var buildPolygonsFromGeometry = function (geometry) {

	console.log('Vertices:', geometry.vertices.length, 'polygons:', geometry.faces.length);

	var polygons = [];
	var vertices = geometry.vertices;
	var faceVertexUvs = geometry.faceVertexUvs;

	// Convert the faces into a custom format that supports more than 3 vertices
	geometry.faces.forEach((face) => {
		polygons.push({
			id: polygonId++,
			vertexIds: [face.a, face.b, face.c],
			centroid: face.centroid,
			normal: face.normal,
			neighbours: []
		});
	});

	var navigationMesh = {
		polygons: polygons,
		vertices: vertices,
		faceVertexUvs: faceVertexUvs
	};

	// Build a list of adjacent polygons
	polygons.forEach((polygon) => {
		buildPolygonNeighbours(polygon, navigationMesh);
	});

	return navigationMesh;
};

var buildNavigationMesh = function (geometry) {
	// Prepare geometry
	utils.computeCentroids(geometry);
	geometry.mergeVertices();
	return buildPolygonsFromGeometry(geometry);
};

var getSharedVerticesInOrder = function (a, b) {

	var aList = a.vertexIds;
	var bList = b.vertexIds;

	var sharedVertices = [];

	aList.forEach((vId) => {
		if (bList.includes(vId)) {
			sharedVertices.push(vId);
		}
	});

	if (sharedVertices.length < 2) return [];

	// console.log("TRYING aList:", aList, ", bList:", bList, ", sharedVertices:", sharedVertices);

	if (sharedVertices.includes(aList[0]) && sharedVertices.includes(aList[aList.length - 1])) {
		// Vertices on both edges are bad, so shift them once to the left
		aList.push(aList.shift());
	}

	if (sharedVertices.includes(bList[0]) && sharedVertices.includes(bList[bList.length - 1])) {
		// Vertices on both edges are bad, so shift them once to the left
		bList.push(bList.shift());
	}

	// Again!
	sharedVertices = [];

	aList.forEach((vId) => {
		if (bList.includes(vId)) {
			sharedVertices.push(vId);
		}
	});

	return sharedVertices;
};

var groupNavMesh = function (navigationMesh) {

	var saveObj = {};

	navigationMesh.vertices.forEach((v) => {
		v.x = utils.roundNumber(v.x, 2);
		v.y = utils.roundNumber(v.y, 2);
		v.z = utils.roundNumber(v.z, 2);
	});

	saveObj.vertices = navigationMesh.vertices;

	var groups = buildPolygonGroups(navigationMesh);

	saveObj.groups = [];

	var findPolygonIndex = function (group, p) {
		for (var i = 0; i < group.length; i++) {
			if (p === group[i]) return i;
		}
	};

	groups.forEach((group) => {

		var newGroup = [];

		group.forEach((p) => {

			var neighbours = [];

			p.neighbours.forEach((n) => {
				neighbours.push(findPolygonIndex(group, n));
			});


			// Build a portal list to each neighbour
			var portals = [];
			p.neighbours.forEach((n) => {
				portals.push(getSharedVerticesInOrder(p, n));
			});


			p.centroid.x = utils.roundNumber(p.centroid.x, 2);
			p.centroid.y = utils.roundNumber(p.centroid.y, 2);
			p.centroid.z = utils.roundNumber(p.centroid.z, 2);

			newGroup.push({
				id: findPolygonIndex(group, p),
				neighbours: neighbours,
				vertexIds: p.vertexIds,
				centroid: p.centroid,
				portals: portals
			});

		});

		saveObj.groups.push(newGroup);
	});

	return saveObj;
};

var zoneNodes = {};

module.exports = {
	/**
	 * Builds a zone/node set from navigation mesh.
	 * @param  {THREE.Geometry} geometry
	 * @return {Path.Zone}
	 */
	buildNodes: function (geometry) {
		return groupNavMesh(buildNavigationMesh(geometry));
	},

	/**
	 * Sets data for the given zone.
	 * @param {string} zoneID
	 * @param {Path.Zone} zone
	 */
	setZoneData: function (zoneID, zone) {
		zoneNodes[zoneID] = zone;
	},
	/**
	 * Returns closest node group for given position.
	 * @param  {string} zoneID
	 * @param  {THREE.Vector3} position
	 * @return {Path.Group}
	 */
	getGroup: function (zoneID, position) {
		if (!zoneNodes[zoneID]) return null;

		let closestNodeGroup = null;
		let distance = Math.pow(50, 2);

		zoneNodes[zoneID].groups.forEach((group, index) => {
			group.forEach((node) => {
				const measuredDistance = utils.distanceToSquared(node.centroid, position);
				if (measuredDistance < distance) {
					closestNodeGroup = index;
					distance = measuredDistance;
				}
			});
		});

		return closestNodeGroup;
	},

	/**
	 * Returns a random node within a given range of a given position.
	 * @param  {string} zoneID
	 * @param  {Path.Group} group
	 * @param  {THREE.Vector3} nearPosition
	 * @param  {number} nearRange
	 * @return {Path.Node}
	 */
	getRandomNode: function (zoneID, group, nearPosition, nearRange) {

		if (!zoneNodes[zoneID]) return new THREE.Vector3();

		nearPosition = nearPosition || null;
		nearRange = nearRange || 0;

		var candidates = [];

		var polygons = zoneNodes[zoneID].groups[group];

		polygons.forEach((p) => {
			if (nearPosition && nearRange) {
				if (utils.distanceToSquared(nearPosition, p.centroid) < nearRange * nearRange) {
					candidates.push(p.centroid);
				}
			} else {
				candidates.push(p.centroid);
			}
		});

		return utils.sample(candidates) || new THREE.Vector3();
	},

	/**
	 * Returns the closest node to the target position.
	 * @param  {THREE.Vector3} position
	 * @param  {string}  zoneID
	 * @param  {Path.Group}  group
	 * @param  {boolean} checkPolygon
	 * @return {Path.Node}
	 */
	getClosestNode: function (position, zoneID, group, checkPolygon = false) {
		const nodes = zoneNodes[zoneID].groups[group];
		const vertices = zoneNodes[zoneID].vertices;
		let closestNode = null;
		let closestDistance = Infinity;

		nodes.forEach((node) => {
			const distance = utils.distanceToSquared(node.centroid, position);
			if (distance < closestDistance
					&& (!checkPolygon || utils.isVectorInPolygon(position, node, vertices))) {
				closestNode = node;
				closestDistance = distance;
			}
		});

		return closestNode;
	},
	/**
	 * Clamps a step along the navmesh, given start and desired endpoint. May be
	 * used to constrain first-person / WASD controls.
	 *
	 * @param  {THREE.Vector3} start
	 * @param  {THREE.Vector3} end Desired endpoint.
	 * @param  {Path.Node} node
	 * @param  {string} zoneID
	 * @param  {Path.Group} group
	 * @param  {THREE.Vector3} endTarget Updated endpoint.
	 * @return {Path.Node} Updated node.
	 */
	clampStep: (function () {
		const point = new THREE.Vector3();
		const plane = new THREE.Plane();
		const triangle = new THREE.Triangle();

		let closestNode;
		let closestPoint = new THREE.Vector3();
		let closestDistance;

		return function (start, end, node, zoneID, group, endTarget) {
			const vertices = zoneNodes[zoneID].vertices;
			const nodes = zoneNodes[zoneID].groups[group];

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
			plane.projectPoint(end, point);
			end.copy(point);

			for (let currentNode = nodeQueue.pop(); currentNode; currentNode = nodeQueue.pop()) {

				triangle.set(
					vertices[currentNode.vertexIds[0]],
					vertices[currentNode.vertexIds[1]],
					vertices[currentNode.vertexIds[2]]
				);

				if (triangle.containsPoint(end)) {
					endTarget.copy(end);
					return currentNode;
				}

				triangle.closestPointToPoint(end, point);

				if (point.distanceToSquared(end) < closestDistance) {
					closestNode = currentNode;
					closestPoint.copy(point);
					closestDistance = point.distanceToSquared(end);
				}

				const depth = nodeDepth[currentNode];
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
	}()),

	/**
	 * Returns a path between given start and end points.
	 * @param  {THREE.Vector3} startPosition
	 * @param  {THREE.Vector3} targetPosition
	 * @param  {string} zoneID
	 * @param  {Path.Group} group
	 * @return {Array<THREE.Vector3>}
	 */
	findPath: function (startPosition, targetPosition, zoneID, group) {
		const nodes = zoneNodes[zoneID].groups[group];
		const vertices = zoneNodes[zoneID].vertices;

		const closestNode = this.getClosestNode(startPosition, zoneID, group);
		const farthestNode = this.getClosestNode(targetPosition, zoneID, group, true);

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
		const path = channel.path.map((c) => new THREE.Vector3(c.x, c.y, c.z));
		path.shift();
		return path;
	}
};
