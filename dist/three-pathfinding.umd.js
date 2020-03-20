(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('three')) :
	typeof define === 'function' && define.amd ? define(['exports', 'three'], factory) :
	(global = global || self, factory(global.pathfinding = {}, global.THREE));
}(this, (function (exports, three) { 'use strict';

	var Utils = function Utils () {};

	Utils.roundNumber = function roundNumber (value, decimals) {
	  var factor = Math.pow(10, decimals);
	  return Math.round(value * factor) / factor;
	};

	Utils.sample = function sample (list) {
	  return list[Math.floor(Math.random() * list.length)];
	};

	Utils.distanceToSquared = function distanceToSquared (a, b) {

	  var dx = a.x - b.x;
	  var dy = a.y - b.y;
	  var dz = a.z - b.z;

	  return dx * dx + dy * dy + dz * dz;

	};

	//+ Jonas Raoni Soares Silva
	//@ http://jsfromhell.com/math/is-point-in-poly [rev. #0]
	Utils.isPointInPoly = function isPointInPoly (poly, pt) {
	  for (var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i)
	    { ((poly[i].z <= pt.z && pt.z < poly[j].z) || (poly[j].z <= pt.z && pt.z < poly[i].z)) && (pt.x < (poly[j].x - poly[i].x) * (pt.z - poly[i].z) / (poly[j].z - poly[i].z) + poly[i].x) && (c = !c); }
	  return c;
	};

	Utils.isVectorInPolygon = function isVectorInPolygon (vector, polygon, vertices) {

	  // reference point will be the centroid of the polygon
	  // We need to rotate the vector as well as all the points which the polygon uses

	  var lowestPoint = 100000;
	  var highestPoint = -100000;

	  var polygonVertices = [];

	  polygon.vertexIds.forEach((vId) => {
	    lowestPoint = Math.min(vertices[vId].y, lowestPoint);
	    highestPoint = Math.max(vertices[vId].y, highestPoint);
	    polygonVertices.push(vertices[vId]);
	  });

	  if (vector.y < highestPoint + 0.5 && vector.y > lowestPoint - 0.5 &&
	    this.isPointInPoly(polygonVertices, vector)) {
	    return true;
	  }
	  return false;
	};

	Utils.triarea2 = function triarea2 (a, b, c) {
	  var ax = b.x - a.x;
	  var az = b.z - a.z;
	  var bx = c.x - a.x;
	  var bz = c.z - a.z;
	  return bx * az - ax * bz;
	};

	Utils.vequal = function vequal (a, b) {
	  return this.distanceToSquared(a, b) < 0.00001;
	};

	// javascript-astar
	// http://github.com/bgrins/javascript-astar
	// Freely distributable under the MIT License.
	// Implements the astar search algorithm in javascript using a binary heap.

	var BinaryHeap = function BinaryHeap (scoreFunction) {
	  this.content = [];
	  this.scoreFunction = scoreFunction;
	};

	BinaryHeap.prototype.push = function push (element) {
	  // Add the new element to the end of the array.
	  this.content.push(element);

	  // Allow it to sink down.
	  this.sinkDown(this.content.length - 1);
	};

	BinaryHeap.prototype.pop = function pop () {
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
	};

	BinaryHeap.prototype.remove = function remove (node) {
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
	};

	BinaryHeap.prototype.size = function size () {
	  return this.content.length;
	};

	BinaryHeap.prototype.rescoreElement = function rescoreElement (node) {
	  this.sinkDown(this.content.indexOf(node));
	};

	BinaryHeap.prototype.sinkDown = function sinkDown (n) {
	  // Fetch the element that has to be sunk.
	  var element = this.content[n];

	  // When at 0, an element can not sink any further.
	  while (n > 0) {
	    // Compute the parent element's index, and fetch it.
	    var parentN = ((n + 1) >> 1) - 1;
	    var parent = this.content[parentN];

	    if (this.scoreFunction(element) < this.scoreFunction(parent)) {
	      // Swap the elements if the parent is greater.
	      this.content[parentN] = element;
	      this.content[n] = parent;
	      // Update 'n' to continue at the new position.
	      n = parentN;
	    } else {
	      // Found a parent that is less, no need to sink any further.
	      break;
	    }
	  }
	};

	BinaryHeap.prototype.bubbleUp = function bubbleUp (n) {
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
	    var child1Score = (void 0);
	    // If the first child exists (is inside the array)...
	    if (child1N < length) {
	      // Look it up and compute its score.
	      var child1 = this.content[child1N];
	      child1Score = this.scoreFunction(child1);

	      // If the score is less than our element's, we need to swap.
	      if (child1Score < elemScore) {
	        swap = child1N;
	      }
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
	};

	var AStar = function AStar () {};

	AStar.init = function init (graph) {
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
	};

	AStar.cleanUp = function cleanUp (graph) {
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
	};

	AStar.heap = function heap () {
	  return new BinaryHeap(function (node) {
	    return node.f;
	  });
	};

	AStar.search = function search (graph, start, end) {
	  this.init(graph);
	  //heuristic = heuristic || astar.manhattan;


	  var openHeap = this.heap();

	  openHeap.push(start);

	  while (openHeap.size() > 0) {

	    // Grab the lowest f(x) to process next.Heap keeps this sorted for us.
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
	    var neighbours = this.neighbours(graph, currentNode);

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

	        // Found an optimal (so far) path to this node.Take score for node to see how good it is.
	        neighbour.visited = true;
	        neighbour.parent = currentNode;
	        if (!neighbour.centroid || !end.centroid) { throw new Error('Unexpected state'); }
	        neighbour.h = neighbour.h || this.heuristic(neighbour.centroid, end.centroid);
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
	};

	AStar.heuristic = function heuristic (pos1, pos2) {
	  return Utils.distanceToSquared(pos1, pos2);
	};

	AStar.neighbours = function neighbours (graph, node) {
	  var ret = [];

	  for (var e = 0; e < node.neighbours.length; e++) {
	    ret.push(graph[node.neighbours[e]]);
	  }

	  return ret;
	};

	var Builder = function Builder () {};

	Builder.buildZone = function buildZone (geometry) {

	  var navMesh = this._buildNavigationMesh(geometry);

	  var zone = {};

	  navMesh.vertices.forEach((v) => {
	    v.x = Utils.roundNumber(v.x, 2);
	    v.y = Utils.roundNumber(v.y, 2);
	    v.z = Utils.roundNumber(v.z, 2);
	  });

	  zone.vertices = navMesh.vertices;

	  var groups = this._buildPolygonGroups(navMesh);

	  // TODO: This block represents a large portion of navigation mesh construction time
	  // and could probably be optimized. For example, construct portals while
	  // determining the neighbor graph.
	  zone.groups = new Array(groups.length);
	  groups.forEach((group, groupIndex) => {

	    var indexByPolygon = new Map(); // { polygon: index in group }
	    group.forEach((poly, polyIndex) => { indexByPolygon.set(poly, polyIndex); });

	    var newGroup = new Array(group.length);
	    group.forEach((poly, polyIndex) => {

	      var neighbourIndices = [];
	      poly.neighbours.forEach((n) => neighbourIndices.push(indexByPolygon.get(n)));

	      // Build a portal list to each neighbour
	      var portals = [];
	      poly.neighbours.forEach((n) => portals.push(this._getSharedVerticesInOrder(poly, n)));

	      var centroid = new three.Vector3( 0, 0, 0 );
	      centroid.add( zone.vertices[ poly.vertexIds[0] ] );
	      centroid.add( zone.vertices[ poly.vertexIds[1] ] );
	      centroid.add( zone.vertices[ poly.vertexIds[2] ] );
	      centroid.divideScalar( 3 );
	      centroid.x = Utils.roundNumber(centroid.x, 2);
	      centroid.y = Utils.roundNumber(centroid.y, 2);
	      centroid.z = Utils.roundNumber(centroid.z, 2);

	      newGroup[polyIndex] = {
	        id: polyIndex,
	        neighbours: neighbourIndices,
	        vertexIds: poly.vertexIds,
	        centroid: centroid,
	        portals: portals
	      };
	    });

	    zone.groups[groupIndex] = newGroup;
	  });

	  return zone;
	};

	/**
	 * Constructs a navigation mesh from the given geometry.
	 * @param {Geometry} geometry
	 * @return {Object}
	 */
	Builder._buildNavigationMesh = function _buildNavigationMesh (geometry) {
	  geometry.mergeVertices();
	  return this._buildPolygonsFromGeometry(geometry);
	};

	Builder._buildPolygonGroups = function _buildPolygonGroups (navigationMesh) {

	  var polygons = navigationMesh.polygons;

	  var polygonGroups = [];

	  var spreadGroupId = function (polygon) {
	    polygon.neighbours.forEach((neighbour) => {
	      if (neighbour.group === undefined) {
	        neighbour.group = polygon.group;
	        spreadGroupId(neighbour);
	      }
	    });
	  };

	  polygons.forEach((polygon) => {
	    if (polygon.group !== undefined) {
	      // this polygon is already part of a group
	      polygonGroups[polygon.group].push(polygon);
	    } else {
	      // we need to make a new group and spread its ID to neighbors
	      polygon.group = polygonGroups.length;
	      spreadGroupId(polygon);
	      polygonGroups.push([polygon]);
	    }
	  });

	  return polygonGroups;
	};

	Builder._buildPolygonNeighbours = function _buildPolygonNeighbours (polygon, vertexPolygonMap) {
	  var neighbours = new Set();

	  var groupA = vertexPolygonMap[polygon.vertexIds[0]];
	  var groupB = vertexPolygonMap[polygon.vertexIds[1]];
	  var groupC = vertexPolygonMap[polygon.vertexIds[2]];

	  // It's only necessary to iterate groups A and B. Polygons contained only
	  // in group C cannot share a >1 vertex with this polygon.
	  // IMPORTANT: Bublé cannot compile for-of loops.
	  groupA.forEach((candidate) => {
	    if (candidate === polygon) { return; }
	    if (groupB.includes(candidate) || groupC.includes(candidate)) {
	      neighbours.add(candidate);
	    }
	  });
	  groupB.forEach((candidate) => {
	    if (candidate === polygon) { return; }
	    if (groupC.includes(candidate)) {
	      neighbours.add(candidate);
	    }
	  });

	  return neighbours;
	};

	Builder._buildPolygonsFromGeometry = function _buildPolygonsFromGeometry (geometry) {

	  var polygons = [];
	  var vertices = geometry.vertices;

	  // Constructing the neighbor graph brute force is O(n²). To avoid that,
	  // create a map from vertices to the polygons that contain them, and use it
	  // while connecting polygons. This reduces complexity to O(n*m), where 'm'
	  // is related to connectivity of the mesh.
	  var vertexPolygonMap = new Array(vertices.length); // array of polygon objects by vertex index
	  for (var i = 0; i < vertices.length; i++) {
	    vertexPolygonMap[i] = [];
	  }

	  // Convert the faces into a custom format that supports more than 3 vertices
	  geometry.faces.forEach((face) => {
	    var poly = { vertexIds: [face.a, face.b, face.c], neighbours: null };
	    polygons.push(poly);
	    vertexPolygonMap[face.a].push(poly);
	    vertexPolygonMap[face.b].push(poly);
	    vertexPolygonMap[face.c].push(poly);
	  });

	  // Build a list of adjacent polygons
	  polygons.forEach((polygon) => {
	    polygon.neighbours = this._buildPolygonNeighbours(polygon, vertexPolygonMap);
	  });

	  return {
	    polygons: polygons,
	    vertices: vertices
	  };
	};

	Builder._getSharedVerticesInOrder = function _getSharedVerticesInOrder (a, b) {

	  var aList = a.vertexIds;
	  var a0 = aList[0], a1 = aList[1], a2 = aList[2];

	  var bList = b.vertexIds;
	  var shared0 = bList.includes(a0);
	  var shared1 = bList.includes(a1);
	  var shared2 = bList.includes(a2);

	  // it seems that we shouldn't have an a and b with <2 shared vertices here unless there's a bug
	  // in the neighbor identification code, or perhaps a malformed input geometry; 3 shared vertices
	  // is a kind of embarrassing but possible geometry we should handle
	  if (shared0 && shared1 && shared2) {
	    return Array.from(aList);
	  } else if (shared0 && shared1) {
	    return [a0, a1];
	  } else if (shared1 && shared2) {
	    return [a1, a2];
	  } else if (shared0 && shared2) {
	    return [a2, a0]; // this ordering will affect the string pull algorithm later, not clear if significant
	  } else {
	    console.warn("Error processing navigation mesh neighbors; neighbors with <2 shared vertices found.");
	    return [];
	  }
	};

	var Channel = function Channel () {
	  this.portals = [];
	};

	Channel.prototype.push = function push (p1, p2) {
	  if (p2 === undefined) { p2 = p1; }
	  this.portals.push({
	    left: p1,
	    right: p2
	  });
	};

	Channel.prototype.stringPull = function stringPull () {
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
	    if (Utils.triarea2(portalApex, portalRight, right) <= 0.0) {
	      if (Utils.vequal(portalApex, portalRight) || Utils.triarea2(portalApex, portalLeft, right) > 0.0) {
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
	    if (Utils.triarea2(portalApex, portalLeft, left) >= 0.0) {
	      if (Utils.vequal(portalApex, portalLeft) || Utils.triarea2(portalApex, portalRight, left) < 0.0) {
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

	  if ((pts.length === 0) || (!Utils.vequal(pts[pts.length - 1], portals[portals.length - 1].left))) {
	    // Append last point to path.
	    pts.push(portals[portals.length - 1].left);
	  }

	  this.path = pts;
	  return pts;
	};

	/**
	 * Defines an instance of the pathfinding module, with one or more zones.
	 */
	var Pathfinding = function Pathfinding () {
		this.zones = {};
	};

	/**
		 * (Static) Builds a zone/node set from navigation mesh geometry.
		 * @param  {BufferGeometry} geometry
		 * @return {Zone}
		 */
	Pathfinding.createZone = function createZone (geometry) {
		if ( geometry.isGeometry ) {
			// Haven't actually implemented support for BufferGeometry yet, but Geometry is somewhat
			// not-recommended these days, so go ahead and start warning.
			console.warn('[three-pathfinding]: Use BufferGeometry, not Geometry, to create zone.');
		} else {
			geometry = new three.Geometry().fromBufferGeometry(geometry);
		}

		return Builder.buildZone(geometry);
	};

	/**
		 * Sets data for the given zone.
		 * @param {string} zoneID
		 * @param {Zone} zone
		 */
	Pathfinding.prototype.setZoneData = function setZoneData (zoneID, zone) {
		this.zones[zoneID] = zone;
	};

	/**
		 * Returns a random node within a given range of a given position.
		 * @param  {string} zoneID
		 * @param  {number} groupID
		 * @param  {Vector3} nearPosition
		 * @param  {number} nearRange
		 * @return {Node}
		 */
	Pathfinding.prototype.getRandomNode = function getRandomNode (zoneID, groupID, nearPosition, nearRange) {

		if (!this.zones[zoneID]) { return new three.Vector3(); }

		nearPosition = nearPosition || null;
		nearRange = nearRange || 0;

		var candidates = [];
		var polygons = this.zones[zoneID].groups[groupID];

		polygons.forEach((p) => {
			if (nearPosition && nearRange) {
				if (Utils.distanceToSquared(nearPosition, p.centroid) < nearRange * nearRange) {
					candidates.push(p.centroid);
				}
			} else {
				candidates.push(p.centroid);
			}
		});

		return Utils.sample(candidates) || new three.Vector3();
	};

	/**
		 * Returns the closest node to the target position.
		 * @param  {Vector3} position
		 * @param  {string}  zoneID
		 * @param  {number}  groupID
		 * @param  {boolean} checkPolygon
		 * @return {Node}
		 */
	Pathfinding.prototype.getClosestNode = function getClosestNode (position, zoneID, groupID, checkPolygon) {
			if ( checkPolygon === void 0 ) checkPolygon = false;

		var nodes = this.zones[zoneID].groups[groupID];
		var vertices = this.zones[zoneID].vertices;
		var closestNode = null;
		var closestDistance = Infinity;

		nodes.forEach((node) => {
			var distance = Utils.distanceToSquared(node.centroid, position);
			if (distance < closestDistance
					&& (!checkPolygon || Utils.isVectorInPolygon(position, node, vertices))) {
				closestNode = node;
				closestDistance = distance;
			}
		});

		return closestNode;
	};

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
	Pathfinding.prototype.findPath = function findPath (startPosition, targetPosition, zoneID, groupID) {
		var nodes = this.zones[zoneID].groups[groupID];
		var vertices = this.zones[zoneID].vertices;

		var closestNode = this.getClosestNode(startPosition, zoneID, groupID, true);
		var farthestNode = this.getClosestNode(targetPosition, zoneID, groupID, true);

		// If we can't find any node, just go straight to the target
		if (!closestNode || !farthestNode) {
			return null;
		}

		var paths = AStar.search(nodes, closestNode, farthestNode);

		var getPortalFromTo = function (a, b) {
			for (var i = 0; i < a.neighbours.length; i++) {
				if (a.neighbours[i] === b.id) {
					return a.portals[i];
				}
			}
		};

		// We have the corridor, now pull the rope.
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

		// Return the path, omitting first position (which is already known).
		var path = channel.path.map((c) => new three.Vector3(c.x, c.y, c.z));
		path.shift();
		return path;
	};

	/**
	 * Returns closest node group ID for given position.
	 * @param  {string} zoneID
	 * @param  {Vector3} position
	 * @return {number}
	 */
	Pathfinding.prototype.getGroup = (function() {
		var plane = new three.Plane();
		return function (zoneID, position, checkPolygon) {
			if ( checkPolygon === void 0 ) checkPolygon = false;

			if (!this.zones[zoneID]) { return null; }

			var closestNodeGroup = null;
			var distance = Math.pow(50, 2);
			var zone = this.zones[zoneID];

			for (var i = 0; i < zone.groups.length; i++) {
				var group = zone.groups[i];
				for (var i$1 = 0, list = group; i$1 < list.length; i$1 += 1) {
					var node = list[i$1];

					if (checkPolygon) {
						plane.setFromCoplanarPoints(
							zone.vertices[node.vertexIds[0]],
							zone.vertices[node.vertexIds[1]],
							zone.vertices[node.vertexIds[2]]
						);
						if (Math.abs(plane.distanceToPoint(position)) < 0.01) {
							var poly = [
								zone.vertices[node.vertexIds[0]],
								zone.vertices[node.vertexIds[1]],
								zone.vertices[node.vertexIds[2]]
							];
							if(Utils.isPointInPoly(poly, position)) {
								return i;
							}
						}
					}
					var measuredDistance = Utils.distanceToSquared(node.centroid, position);
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
		var point = new three.Vector3();
		var plane = new three.Plane();
		var triangle = new three.Triangle();

		var endPoint = new three.Vector3();

		var closestNode;
		var closestPoint = new three.Vector3();
		var closestDistance;

		return function (startRef, endRef, node, zoneID, groupID, endTarget) {
			var vertices = this.zones[zoneID].vertices;
			var nodes = this.zones[zoneID].groups[groupID];

			var nodeQueue = [node];
			var nodeDepth = {};
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

			for (var currentNode = nodeQueue.pop(); currentNode; currentNode = nodeQueue.pop()) {

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

				var depth = nodeDepth[currentNode.id];
				if (depth > 2) { continue; }

				for (var i = 0; i < currentNode.neighbours.length; i++) {
					var neighbour = nodes[currentNode.neighbours[i]];
					if (neighbour.id in nodeDepth) { continue; }

					nodeQueue.push(neighbour);
					nodeDepth[neighbour.id] = depth + 1;
				}
			}

			endTarget.copy(closestPoint);
			return closestNode;
		};
	}());

	var colors = {
	  PLAYER: new three.Color( 0xee836f ).convertGammaToLinear( 2.2 ).getHex(),
	  TARGET: new three.Color( 0xdccb18 ).convertGammaToLinear( 2.2 ).getHex(),
	  PATH: new three.Color( 0x00a3af ).convertGammaToLinear( 2.2 ).getHex(),
	  WAYPOINT: new three.Color( 0x00a3af ).convertGammaToLinear( 2.2 ).getHex(),
	  CLAMPED_STEP: new three.Color( 0xdcd3b2 ).convertGammaToLinear( 2.2 ).getHex(),
	  CLOSEST_NODE: new three.Color( 0x43676b ).convertGammaToLinear( 2.2 ).getHex(),
	};

	var OFFSET = 0.2;

	/**
	 * Helper for debugging pathfinding behavior.
	 */
	var PathfindingHelper = /*@__PURE__*/(function (Object3D) {
	  function PathfindingHelper () {
	    Object3D.call(this);

	    this._playerMarker = new three.Mesh(
	      new three.SphereGeometry( 0.25, 32, 32 ),
	      new three.MeshBasicMaterial( { color: colors.PLAYER } )
	    );

	    this._targetMarker = new three.Mesh(
	      new three.BoxGeometry( 0.3, 0.3, 0.3 ),
	      new three.MeshBasicMaterial( { color: colors.TARGET } )
	    );
	    

	    this._nodeMarker = new three.Mesh(
	      new three.BoxGeometry( 0.1, 0.8, 0.1 ),
	      new three.MeshBasicMaterial( { color: colors.CLOSEST_NODE } )
	    );
	    

	    this._stepMarker = new three.Mesh(
	      new three.BoxGeometry( 0.1, 1, 0.1 ),
	      new three.MeshBasicMaterial( { color: colors.CLAMPED_STEP } )
	    );

	    this._pathMarker = new Object3D();

	    this._pathLineMaterial = new three.LineBasicMaterial( { color: colors.PATH, linewidth: 2 } ) ;
	    this._pathPointMaterial = new three.MeshBasicMaterial( { color: colors.WAYPOINT } );
	    this._pathPointGeometry = new three.SphereBufferGeometry( 0.08 );

	    this._markers = [
	      this._playerMarker,
	      this._targetMarker,
	      this._nodeMarker,
	      this._stepMarker,
	      this._pathMarker ];

	    this._markers.forEach( ( marker ) => {

	      marker.visible = false;

	      this.add( marker );

	    } );

	  }

	  if ( Object3D ) PathfindingHelper.__proto__ = Object3D;
	  PathfindingHelper.prototype = Object.create( Object3D && Object3D.prototype );
	  PathfindingHelper.prototype.constructor = PathfindingHelper;

	  /**
	   * @param {Array<Vector3>} path
	   * @return {this}
	   */
	  PathfindingHelper.prototype.setPath = function setPath ( path ) {

	    while ( this._pathMarker.children.length ) {

	      this._pathMarker.children[ 0 ].visible = false;
	      this._pathMarker.remove( this._pathMarker.children[ 0 ] );

	    }

	    path = [ this._playerMarker.position ].concat( path );

	    // Draw debug lines
	    var geometry = new three.Geometry();
	    for (var i = 0; i < path.length; i++) {
	      geometry.vertices.push( path[ i ].clone().add( new three.Vector3( 0, OFFSET, 0 ) ) );
	    }
	    this._pathMarker.add( new three.Line( geometry, this._pathLineMaterial ) );

	    for ( var i$1 = 0; i$1 < path.length - 1; i$1++ ) {

	      var node = new three.Mesh( this._pathPointGeometry, this._pathPointMaterial );
	      node.position.copy( path[ i$1 ] );
	      node.position.y += OFFSET;
	      this._pathMarker.add( node );

	    }

	    this._pathMarker.visible = true;

	    return this;

	  };

	  /**
	   * @param {Vector3} position
	   * @return {this}
	   */
	  PathfindingHelper.prototype.setPlayerPosition = function setPlayerPosition ( position ) {

	    this._playerMarker.position.copy( position );
	    this._playerMarker.visible = true;
	    return this;

	  };

	  /**
	   * @param {Vector3} position
	   * @return {this}
	   */
	  PathfindingHelper.prototype.setTargetPosition = function setTargetPosition ( position ) {

	    this._targetMarker.position.copy( position );
	    this._targetMarker.visible = true;
	    return this;

	  };

	  /**
	   * @param {Vector3} position
	   * @return {this}
	   */
	  PathfindingHelper.prototype.setNodePosition = function setNodePosition ( position ) {

	    this._nodeMarker.position.copy( position );
	    this._nodeMarker.visible = true;
	    return this;

	  };

	  /**
	   * @param {Vector3} position
	   * @return {this}
	   */
	  PathfindingHelper.prototype.setStepPosition = function setStepPosition ( position ) {

	    this._stepMarker.position.copy( position );
	    this._stepMarker.visible = true;
	    return this;

	  };

	  /**
	   * Hides all markers.
	   * @return {this}
	   */
	  PathfindingHelper.prototype.reset = function reset () {

	    while ( this._pathMarker.children.length ) {

	      this._pathMarker.children[ 0 ].visible = false;
	      this._pathMarker.remove( this._pathMarker.children[ 0 ] );

	    }

	    this._markers.forEach( ( marker ) => {

	      marker.visible = false;

	    } );

	    return this;

	  };

	  return PathfindingHelper;
	}(three.Object3D));

	exports.Pathfinding = Pathfinding;
	exports.PathfindingHelper = PathfindingHelper;

	Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=three-pathfinding.umd.js.map
