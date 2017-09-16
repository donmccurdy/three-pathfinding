const utils = require('./utils');
const Channel = require('./channel');

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

// javascript-astar
// http://github.com/bgrins/javascript-astar
// Freely distributable under the MIT License.
// Implements the astar search algorithm in javascript using a binary heap.

function BinaryHeap(scoreFunction) {
	this.content = [];
	this.scoreFunction = scoreFunction;
}

BinaryHeap.prototype = {
	push: function (element) {
		// Add the new element to the end of the array.
		this.content.push(element);

		// Allow it to sink down.
		this.sinkDown(this.content.length - 1);
	},
	pop: function () {
		// Store the first element so we can return it later.
		var result = this.content[0];
		// Get the element at the end of the array.
		var end = this.content.pop();
		// If there are any elements left, put the end element at the
		// start, and let it bubble up.
		if (this.content.length > 0) {
			this.content[0] = end;
			this.bubbleUp(0);
		}
		return result;
	},
	remove: function (node) {
		var i = this.content.indexOf(node);

		// When it is found, the process seen in 'pop' is repeated
		// to fill up the hole.
		var end = this.content.pop();

		if (i !== this.content.length - 1) {
			this.content[i] = end;

			if (this.scoreFunction(end) < this.scoreFunction(node)) {
				this.sinkDown(i);
			} else {
				this.bubbleUp(i);
			}
		}
	},
	size: function () {
		return this.content.length;
	},
	rescoreElement: function (node) {
		this.sinkDown(this.content.indexOf(node));
	},
	sinkDown: function (n) {
		// Fetch the element that has to be sunk.
		var element = this.content[n];

		// When at 0, an element can not sink any further.
		while (n > 0) {

			// Compute the parent element's index, and fetch it.
			var parentN = ((n + 1) >> 1) - 1,
				parent = this.content[parentN];
			// Swap the elements if the parent is greater.
			if (this.scoreFunction(element) < this.scoreFunction(parent)) {
				this.content[parentN] = element;
				this.content[n] = parent;
				// Update 'n' to continue at the new position.
				n = parentN;
			}

			// Found a parent that is less, no need to sink any further.
			else {
				break;
			}
		}
	},
	bubbleUp: function (n) {
		// Look up the target element and its score.
		var length = this.content.length,
			element = this.content[n],
			elemScore = this.scoreFunction(element);

		while (true) {
			// Compute the indices of the child elements.
			var child2N = (n + 1) << 1,
				child1N = child2N - 1;
			// This is used to store the new position of the element,
			// if any.
			var swap = null;
			// If the first child exists (is inside the array)...
			if (child1N < length) {
				// Look it up and compute its score.
				var child1 = this.content[child1N],
					child1Score = this.scoreFunction(child1);

				// If the score is less than our element's, we need to swap.
				if (child1Score < elemScore)
					swap = child1N;
			}

			// Do the same checks for the other child.
			if (child2N < length) {
				var child2 = this.content[child2N],
					child2Score = this.scoreFunction(child2);
				if (child2Score < (swap === null ? elemScore : child1Score)) {
					swap = child2N;
				}
			}

			// If the element needs to be moved, swap it, and continue.
			if (swap !== null) {
				this.content[n] = this.content[swap];
				this.content[swap] = element;
				n = swap;
			}

			// Otherwise, we are done.
			else {
				break;
			}
		}
	}
};

var astar = {
	init: function (graph) {
		for (var x = 0; x < graph.length; x++) {
			//for(var x in graph) {
			var node = graph[x];
			node.f = 0;
			node.g = 0;
			node.h = 0;
			node.cost = 1.0;
			node.visited = false;
			node.closed = false;
			node.parent = null;
		}
	},
	cleanUp: function (graph) {
		for (var x = 0; x < graph.length; x++) {
			var node = graph[x];
			delete node.f;
			delete node.g;
			delete node.h;
			delete node.cost;
			delete node.visited;
			delete node.closed;
			delete node.parent;
		}
	},
	heap: function () {
		return new BinaryHeap(function (node) {
			return node.f;
		});
	},
	search: function (graph, start, end) {
		astar.init(graph);
		//heuristic = heuristic || astar.manhattan;


		var openHeap = astar.heap();

		openHeap.push(start);

		while (openHeap.size() > 0) {

			// Grab the lowest f(x) to process next.  Heap keeps this sorted for us.
			var currentNode = openHeap.pop();

			// End case -- result has been found, return the traced path.
			if (currentNode === end) {
				var curr = currentNode;
				var ret = [];
				while (curr.parent) {
					ret.push(curr);
					curr = curr.parent;
				}
				this.cleanUp(ret);
				return ret.reverse();
			}

			// Normal case -- move currentNode from open to closed, process each of its neighbours.
			currentNode.closed = true;

			// Find all neighbours for the current node. Optionally find diagonal neighbours as well (false by default).
			var neighbours = astar.neighbours(graph, currentNode);

			for (var i = 0, il = neighbours.length; i < il; i++) {
				var neighbour = neighbours[i];

				if (neighbour.closed) {
					// Not a valid node to process, skip to next neighbour.
					continue;
				}

				// The g score is the shortest distance from start to current node.
				// We need to check if the path we have arrived at this neighbour is the shortest one we have seen yet.
				var gScore = currentNode.g + neighbour.cost;
				var beenVisited = neighbour.visited;

				if (!beenVisited || gScore < neighbour.g) {

					// Found an optimal (so far) path to this node.  Take score for node to see how good it is.
					neighbour.visited = true;
					neighbour.parent = currentNode;
					if (!neighbour.centroid || !end.centroid) throw new Error('Unexpected state');
					neighbour.h = neighbour.h || astar.heuristic(neighbour.centroid, end.centroid);
					neighbour.g = gScore;
					neighbour.f = neighbour.g + neighbour.h;

					if (!beenVisited) {
						// Pushing to heap will put it in proper place based on the 'f' value.
						openHeap.push(neighbour);
					} else {
						// Already seen the node, but since it has been rescored we need to reorder it in the heap
						openHeap.rescoreElement(neighbour);
					}
				}
			}
		}

		// No result was found - empty array signifies failure to find path.
		return [];
	},
	heuristic: function (pos1, pos2) {
		return utils.distanceToSquared(pos1, pos2);
	},
	neighbours: function (graph, node) {
		var ret = [];

		for (var e = 0; e < node.neighbours.length; e++) {
			ret.push(graph[node.neighbours[e]]);
		}

		return ret;
	}
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
	findPath: function (startPosition, targetPosition, zone, group) {

		var allNodes = zoneNodes[zone].groups[group];
		var vertices = zoneNodes[zone].vertices;

		var closestNode = null;
		var distance = Math.pow(50, 2);

		allNodes.forEach((node) => {
			var measuredDistance = utils.distanceToSquared(node.centroid, startPosition);
			if (measuredDistance < distance) {
				closestNode = node;
				distance = measuredDistance;
			}
		});


		var farthestNode = null;
		distance = Math.pow(50, 2);

		allNodes.forEach((node) => {
			var measuredDistance = utils.distanceToSquared(node.centroid, targetPosition);
			if (measuredDistance < distance &&
				utils.isVectorInPolygon(targetPosition, node, vertices)) {
				farthestNode = node;
				distance = measuredDistance;
			}
		});

		// If we can't find any node, just go straight to the target
		if (!closestNode || !farthestNode) {
			return null;
		}

		var paths = astar.search(allNodes, closestNode, farthestNode);

		var getPortalFromTo = function (a, b) {
			for (var i = 0; i < a.neighbours.length; i++) {
				if (a.neighbours[i] === b.id) {
					return a.portals[i];
				}
			}
		};

		// We got the corridor
		// Now pull the rope

		var channel = new Channel();

		channel.push(startPosition);

		for (var i = 0; i < paths.length; i++) {
			var polygon = paths[i];

			var nextPolygon = paths[i + 1];

			if (nextPolygon) {
				var portals = getPortalFromTo(polygon, nextPolygon);
				channel.push(
					vertices[portals[0]],
					vertices[portals[1]]
				);
			}

		}

		channel.push(targetPosition);

		channel.stringPull();


		var threeVectors = [];

		channel.path.forEach((c) => {
			var vec = new THREE.Vector3(c.x, c.y, c.z);

			// Ensure the intermediate steps aren't too close to the start position
			// var dist = vec.clone().sub(startPosition).lengthSq();
			// if (dist > 0.01 * 0.01) {
				threeVectors.push(vec);
			// }


		});

		// We don't need the first one, as we already know our start position
		threeVectors.shift();

		return threeVectors;
	}
};
