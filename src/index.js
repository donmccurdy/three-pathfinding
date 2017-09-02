const THREE = require('three');

var computeCentroids = function (geometry) {
	var f, fl, face;

	for ( f = 0, fl = geometry.faces.length; f < fl; f ++ ) {

		face = geometry.faces[ f ];
		face.centroid = new THREE.Vector3( 0, 0, 0 );

		face.centroid.add( geometry.vertices[ face.a ] );
		face.centroid.add( geometry.vertices[ face.b ] );
		face.centroid.add( geometry.vertices[ face.c ] );
		face.centroid.divideScalar( 3 );

	}
};


function roundNumber(number, decimals) {
    var newnumber = Number(number + '').toFixed(parseInt(decimals));
    return parseFloat(newnumber);
}

function sample (list) {
	return list[Math.floor(Math.random() * list.length)];
}

var polygonId = 1;

var mergeVertexIds = function (aList, bList) {

	var sharedVertices = [];

	aList.forEach((vID) => {
		if (bList.indexOf(vID) >= 0) {
			sharedVertices.push(vID);
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

	var clockwiseMostSharedVertex = sharedVertices[1];
	var counterClockwiseMostSharedVertex = sharedVertices[0];


	var cList = aList.slice();
	while (cList[0] !== clockwiseMostSharedVertex) {
		cList.push(cList.shift());
	}

	var c = 0;

	var temp = bList.slice();
	while (temp[0] !== counterClockwiseMostSharedVertex) {
		temp.push(temp.shift());

		if (c++ > 10) debugger;
	}

	// Shave
	temp.shift();
	temp.pop();

	cList = cList.concat(temp);

	return cList;
};

var setPolygonCentroid = function (polygon, navigationMesh) {
	var sum = new THREE.Vector3();

	var vertices = navigationMesh.vertices;

	polygon.vertexIds.forEach((vId) => {
		sum.add(vertices[vId]);
	});

	sum.divideScalar(polygon.vertexIds.length);

	polygon.centroid.copy(sum);
};

var cleanPolygon = function (polygon, navigationMesh) {

	var newVertexIds = [];

	var vertices = navigationMesh.vertices;

	for (var i = 0; i < polygon.vertexIds.length; i++) {

		var vertex = vertices[polygon.vertexIds[i]];

		var nextVertexId, previousVertexId;
		var nextVertex, previousVertex;

		// console.log("nextVertex: ", nextVertex);

		if (i === 0) {
			nextVertexId = polygon.vertexIds[1];
			previousVertexId = polygon.vertexIds[polygon.vertexIds.length - 1];
		} else if (i === polygon.vertexIds.length - 1) {
			nextVertexId = polygon.vertexIds[0];
			previousVertexId = polygon.vertexIds[polygon.vertexIds.length - 2];
		} else {
			nextVertexId = polygon.vertexIds[i + 1];
			previousVertexId = polygon.vertexIds[i - 1];
		}

		nextVertex = vertices[nextVertexId];
		previousVertex = vertices[previousVertexId];

		var a = nextVertex.clone().sub(vertex);
		var b = previousVertex.clone().sub(vertex);

		var angle = a.angleTo(b);

		// console.log(angle);

		if (angle > Math.PI - 0.01 && angle < Math.PI + 0.01) {
			// Unneccesary vertex
			// console.log("Unneccesary vertex: ", polygon.vertexIds[i]);
			// console.log("Angle between "+previousVertexId+", "+polygon.vertexIds[i]+" "+nextVertexId+" was: ", angle);


			// Remove the neighbours who had this vertex
			var goodNeighbours = [];
			polygon.neighbours.forEach((neighbour) => {
				if (!neighbour.vertexIds.includes(polygon.vertexIds[i])) {
					goodNeighbours.push(neighbour);
				}
			});
			polygon.neighbours = goodNeighbours;


			// TODO cleanup the list of vertices and rebuild vertexIds for all polygons
		} else {
			newVertexIds.push(polygon.vertexIds[i]);
		}

	}

	// console.log("New vertexIds: ", newVertexIds);

	polygon.vertexIds = newVertexIds;

	setPolygonCentroid(polygon, navigationMesh);

};

var isConvex = function (polygon, navigationMesh) {

	var vertices = navigationMesh.vertices;

	if (polygon.vertexIds.length < 3) return false;

	var convex = true;

	var total = 0;

	var results = [];

	for (var i = 0; i < polygon.vertexIds.length; i++) {

		var vertex = vertices[polygon.vertexIds[i]];

		var nextVertex, previousVertex;

		// console.log("nextVertex: ", nextVertex);

		if (i === 0) {
			nextVertex = vertices[polygon.vertexIds[1]];
			previousVertex = vertices[polygon.vertexIds[polygon.vertexIds.length - 1]];
		} else if (i === polygon.vertexIds.length - 1) {
			nextVertex = vertices[polygon.vertexIds[0]];
			previousVertex = vertices[polygon.vertexIds[polygon.vertexIds.length - 2]];
		} else {
			nextVertex = vertices[polygon.vertexIds[i + 1]];
			previousVertex = vertices[polygon.vertexIds[i - 1]];
		}

		var a = nextVertex.clone().sub(vertex);
		var b = previousVertex.clone().sub(vertex);

		var angle = a.angleTo(b);
		total += angle;

		// console.log(angle);
		if (angle === Math.PI || angle === 0) return false;

		var r = a.cross(b).y;
		results.push(r);
		// console.log("pushed: ", r);
	}

	// if ( total > (polygon.vertexIds.length-2)*Math.PI ) return false;

	results.forEach((r) => {
		if (r === 0) convex = false;
	});

	if (results[0] > 0) {
		results.forEach((r) => {
			if (r < 0) convex = false;
		});
	} else {
		results.forEach((r) => {
			if (r > 0) convex = false;
		});
	}

	return convex;
};

var buildPolygonGroups = function (navigationMesh) {

	var polygons = navigationMesh.polygons;
	var vertices = navigationMesh.vertices;

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

	console.log("Groups built: ", polygonGroups.length);

	return polygonGroups;
};

function array_intersect() {
	var i, all, shortest, nShortest, n, len, ret = [],
		obj = {},
		nOthers;
	nOthers = arguments.length - 1;
	nShortest = arguments[0].length;
	shortest = 0;
	for (i = 0; i <= nOthers; i++) {
		n = arguments[i].length;
		if (n < nShortest) {
			shortest = i;
			nShortest = n;
		}
	}

	for (i = 0; i <= nOthers; i++) {
		n = (i === shortest) ? 0 : (i || shortest); //Read the shortest array first. Read the first array instead of the shortest
		len = arguments[n].length;
		for (var j = 0; j < len; j++) {
			var elem = arguments[n][j];
			if (obj[elem] === i - 1) {
				if (i === nOthers) {
					ret.push(elem);
					obj[elem] = 0;
				} else {
					obj[elem] = i;
				}
			} else if (i === 0) {
				obj[elem] = 0;
			}
		}
	}
	return ret;
}

var buildPolygonNeighbours = function (polygon, navigationMesh) {
	polygon.neighbours = [];

	// All other nodes that contain at least two of our vertices are our neighbours
	for (var i = 0, len = navigationMesh.polygons.length; i < len; i++) {
		if (polygon === navigationMesh.polygons[i]) continue;

		// Don't check polygons that are too far, since the intersection tests take a long time
		if (polygon.centroid.distanceToSquared(navigationMesh.polygons[i].centroid) > 100 * 100) continue;

		var matches = array_intersect(polygon.vertexIds, navigationMesh.polygons[i].vertexIds);

		if (matches.length >= 2) {
			polygon.neighbours.push(navigationMesh.polygons[i]);
		}
	}
};

var buildPolygonsFromGeometry = function (geometry) {

	console.log("Vertices:", geometry.vertices.length, "polygons:", geometry.faces.length);

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

var cleanNavigationMesh = function (navigationMesh) {

	var polygons = navigationMesh.polygons;
	var vertices = navigationMesh.vertices;


	// Remove steep triangles
	var up = new THREE.Vector3(0, 1, 0);
	polygons = polygons.filter((polygon) => {
		var angle = Math.acos(up.dot(polygon.normal));
		return angle < (Math.PI / 4);
	});


	// Remove unnecessary edges using the Hertel-Mehlhorn algorithm

	// 1. Find a pair of adjacent nodes (i.e., two nodes that share an edge between them)
	//    whose normals are nearly identical (i.e., their surfaces face the same direction).


	var newPolygons = [];

	polygons.forEach((polygon) => {

		if (polygon.toBeDeleted) return;

		var keepLooking = true;

		while (keepLooking) {
			keepLooking = false;

			polygon.neighbours.forEach((otherPolygon) => {

				if (polygon === otherPolygon) return;

				if (Math.acos(polygon.normal.dot(otherPolygon.normal)) < 0.01) {
					// That's pretty equal alright!

					// Merge otherPolygon with polygon

					var testVertexIdList = [];

					var testPolygon = {
						vertexIds: mergeVertexIds(polygon.vertexIds, otherPolygon.vertexIds),
						neighbours: polygon.neighbours,
						normal: polygon.normal.clone(),
						centroid: polygon.centroid.clone()
					};

					cleanPolygon(testPolygon, navigationMesh);

					if (isConvex(testPolygon, navigationMesh)) {
						otherPolygon.toBeDeleted = true;


						// Inherit the neighbours from the to be merged polygon, except ourself
						otherPolygon.neighbours.forEach((otherPolygonNeighbour) => {

							// Set this poly to be merged to be no longer our neighbour
							otherPolygonNeighbour.neighbours = otherPolygonNeighbour.neighbours.filter((poly) => poly !== otherPolygon);

							if (otherPolygonNeighbour !== polygon) {
								// Tell the old Polygon's neighbours about the new neighbour who has merged
								otherPolygonNeighbour.neighbours.push(polygon);
							} else {
								// For ourself, we don't need to know about ourselves
								// But we inherit the old neighbours
								polygon.neighbours = polygon.neighbours.concat(otherPolygon.neighbours);
								polygon.neighbours = Array.from(new Set(polygon.neighbours));

								// Without ourselves in it!
								polygon.neighbours = polygon.neighbours.filter((poly) => poly !== polygon);
							}
						});

						polygon.vertexIds = mergeVertexIds(polygon.vertexIds, otherPolygon.vertexIds);

						// console.log(polygon.vertexIds);
						// console.log("Merge!");

						cleanPolygon(polygon, navigationMesh);

						keepLooking = true;
					}

				}
			});
		}


		if (!polygon.toBeDeleted) {
			newPolygons.push(polygon);
		}

	});

	var isUsed = function (vId) {
		var contains = false;
		newPolygons.forEach((p) => {
			if (!contains && p.vertexIds.includes(vId)) {
				contains = true;
			}
		});
		return contains;
	};

	// Clean vertices
	var keepChecking = false;
	for (var i = 0; i < vertices.length; i++) {
		if (!isUsed(i)) {

			// Decrement all vertices that are higher than i
			newPolygons.forEach((p) => {
				for (var j = 0; j < p.vertexIds.length; j++) {
					if (p.vertexIds[j] > i) {
						p.vertexIds[j] --;
					}
				}
			});

			vertices.splice(i, 1);
			i--;
		}

	};


	navigationMesh.polygons = newPolygons;
	navigationMesh.vertices = vertices;

};

var buildNavigationMesh = function (geometry) {

	// Prepare geometry
	computeCentroids(geometry);
	geometry.mergeVertices();
	// THREE.GeometryUtils.triangulateQuads(geometry);

	// console.log("vertices:", geometry.vertices.length, "polygons:", geometry.faces.length);

	var navigationMesh = buildPolygonsFromGeometry(geometry);

	// cleanNavigationMesh(navigationMesh);
	// console.log("Pre-clean:", navigationMesh.polygons.length, "polygons,", navigationMesh.vertices.length, "vertices.");

	// console.log("")
	// console.log("Vertices:", navigationMesh.vertices.length, "polygons,", navigationMesh.polygons.length, "vertices.");

	return navigationMesh;
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
		v.x = roundNumber(v.x, 2);
		v.y = roundNumber(v.y, 2);
		v.z = roundNumber(v.z, 2);
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


			p.centroid.x = roundNumber(p.centroid.x, 2);
			p.centroid.y = roundNumber(p.centroid.y, 2);
			p.centroid.z = roundNumber(p.centroid.z, 2);

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

var distanceToSquared = function (a, b) {
	var dx = a.x - b.x;
	var dy = a.y - b.y;
	var dz = a.z - b.z;

	return dx * dx + dy * dy + dz * dz;
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
					if (!neighbour.centroid || !end.centroid) debugger;
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
		return distanceToSquared(pos1, pos2);
	},
	neighbours: function (graph, node) {
		var ret = [];

		for (var e = 0; e < node.neighbours.length; e++) {
			ret.push(graph[node.neighbours[e]]);
		}

		return ret;
	}
};


var distanceToSquared = function (a, b) {

	var dx = a.x - b.x;
	var dy = a.y - b.y;
	var dz = a.z - b.z;

	return dx * dx + dy * dy + dz * dz;

};


//+ Jonas Raoni Soares Silva
//@ http://jsfromhell.com/math/is-point-in-poly [rev. #0]
function isPointInPoly(poly, pt) {
	for (var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i)
		((poly[i].z <= pt.z && pt.z < poly[j].z) || (poly[j].z <= pt.z && pt.z < poly[i].z)) && (pt.x < (poly[j].x - poly[i].x) * (pt.z - poly[i].z) / (poly[j].z - poly[i].z) + poly[i].x) && (c = !c);
	return c;
}

function isVectorInPolygon(vector, polygon, vertices) {

	// reference point will be the centroid of the polygon
	// We need to rotate the vector as well as all the points which the polygon uses

	var center = polygon.centroid;

	var lowestPoint = 100000;
	var highestPoint = -100000;

	var polygonVertices = [];

	polygon.vertexIds.forEach((vId) => {
		lowestPoint = Math.min(vertices[vId].y, lowestPoint);
		highestPoint = Math.max(vertices[vId].y, highestPoint);
		polygonVertices.push(vertices[vId]);
	});

	if (vector.y < highestPoint + 0.5 && vector.y > lowestPoint - 0.5 &&
		isPointInPoly(polygonVertices, vector)) {
		return true;
	}
	return false;
}


function triarea2(a, b, c) {
	var ax = b.x - a.x;
	var az = b.z - a.z;
	var bx = c.x - a.x;
	var bz = c.z - a.z;
	return bx * az - ax * bz;
}

function vequal(a, b) {
	return distanceToSquared(a, b) < 0.00001;
}

function Channel() {
	this.portals = [];
}

Channel.prototype.push = function (p1, p2) {
	if (p2 === undefined) p2 = p1;
	this.portals.push({
		left: p1,
		right: p2
	});
};

Channel.prototype.stringPull = function () {
	var portals = this.portals;
	var pts = [];
	// Init scan state
	var portalApex, portalLeft, portalRight;
	var apexIndex = 0,
		leftIndex = 0,
		rightIndex = 0;

	portalApex = portals[0].left;
	portalLeft = portals[0].left;
	portalRight = portals[0].right;

	// Add start point.
	pts.push(portalApex);

	for (var i = 1; i < portals.length; i++) {
		var left = portals[i].left;
		var right = portals[i].right;

		// Update right vertex.
		if (triarea2(portalApex, portalRight, right) <= 0.0) {
			if (vequal(portalApex, portalRight) || triarea2(portalApex, portalLeft, right) > 0.0) {
				// Tighten the funnel.
				portalRight = right;
				rightIndex = i;
			} else {
				// Right over left, insert left to path and restart scan from portal left point.
				pts.push(portalLeft);
				// Make current left the new apex.
				portalApex = portalLeft;
				apexIndex = leftIndex;
				// Reset portal
				portalLeft = portalApex;
				portalRight = portalApex;
				leftIndex = apexIndex;
				rightIndex = apexIndex;
				// Restart scan
				i = apexIndex;
				continue;
			}
		}

		// Update left vertex.
		if (triarea2(portalApex, portalLeft, left) >= 0.0) {
			if (vequal(portalApex, portalLeft) || triarea2(portalApex, portalRight, left) < 0.0) {
				// Tighten the funnel.
				portalLeft = left;
				leftIndex = i;
			} else {
				// Left over right, insert right to path and restart scan from portal right point.
				pts.push(portalRight);
				// Make current right the new apex.
				portalApex = portalRight;
				apexIndex = rightIndex;
				// Reset portal
				portalLeft = portalApex;
				portalRight = portalApex;
				leftIndex = apexIndex;
				rightIndex = apexIndex;
				// Restart scan
				i = apexIndex;
				continue;
			}
		}
	}

	if ((pts.length === 0) || (!vequal(pts[pts.length - 1], portals[portals.length - 1].left))) {
		// Append last point to path.
		pts.push(portals[portals.length - 1].left);
	}

	this.path = pts;
	return pts;
};

var zoneNodes = {};
var path = null;

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
				var measuredDistance = distanceToSquared(node.centroid, position);
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
				if (distanceToSquared(nearPosition, p.centroid) < nearRange * nearRange) {
					candidates.push(p.centroid);
				}
			} else {
				candidates.push(p.centroid);
			}
		});

		return sample(candidates) || new THREE.Vector3();
	},
	findPath: function (startPosition, targetPosition, zone, group) {

		var allNodes = zoneNodes[zone].groups[group];
		var vertices = zoneNodes[zone].vertices;

		var closestNode = null;
		var distance = Math.pow(50, 2);

		allNodes.forEach((node) => {
			var measuredDistance = distanceToSquared(node.centroid, startPosition);
			if (measuredDistance < distance) {
				closestNode = node;
				distance = measuredDistance;
			}
		});


		var farthestNode = null;
		distance = Math.pow(50, 2);

		allNodes.forEach((node) => {
			var measuredDistance = distanceToSquared(node.centroid, targetPosition);
			if (measuredDistance < distance &&
				isVectorInPolygon(targetPosition, node, vertices)) {
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

			// console.log(vec.clone().sub(startPosition).length());

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
