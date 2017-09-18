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
	buildNodes: function (geometry) {
		var navigationMesh = buildNavigationMesh(geometry);

		var zoneNodes = groupNavMesh(navigationMesh);

		return zoneNodes;
	},
	setZoneData: function (zone, data) {
		zoneNodes[zone] = data;
	},
	getGroup: function (zone, position) {

		if (!zoneNodes[zone]) return null;

		var closestNodeGroup = null;

		var distance = Math.pow(50, 2);

		zoneNodes[zone].groups.forEach((group, index) => {
			group.forEach((node) => {
				var measuredDistance = utils.distanceToSquared(node.centroid, position);
				if (measuredDistance < distance) {
					closestNodeGroup = index;
					distance = measuredDistance;
				}
			});
		});

		return closestNodeGroup;
	},
	getRandomNode: function (zone, group, nearPosition, nearRange) {

		if (!zoneNodes[zone]) return new THREE.Vector3();

		nearPosition = nearPosition || null;
		nearRange = nearRange || 0;

		var candidates = [];

		var polygons = zoneNodes[zone].groups[group];

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
	getClosestNode: function (position, zone, group, checkPolygon = false) {
		const nodes = zoneNodes[zone].groups[group];
		const vertices = zoneNodes[zone].vertices;
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
	findPath: function (startPosition, targetPosition, zone, group) {
		const nodes = zoneNodes[zone].groups[group];
		const vertices = zoneNodes[zone].vertices;

		const closestNode = this.getClosestNode(startPosition, zone, group);
		const farthestNode = this.getClosestNode(targetPosition, zone, group, true);

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
