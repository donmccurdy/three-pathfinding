(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

THREE.Pathfinding = require('./src');

},{"./src":6}],2:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var BinaryHeap = require('./BinaryHeap');
var utils = require('./utils.js');

var AStar = function () {
  function AStar() {
    _classCallCheck(this, AStar);
  }

  _createClass(AStar, null, [{
    key: 'init',
    value: function init(graph) {
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
    }
  }, {
    key: 'cleanUp',
    value: function cleanUp(graph) {
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
    }
  }, {
    key: 'heap',
    value: function heap() {
      return new BinaryHeap(function (node) {
        return node.f;
      });
    }
  }, {
    key: 'search',
    value: function search(graph, start, end) {
      this.init(graph);
      //heuristic = heuristic || astar.manhattan;


      var openHeap = this.heap();

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

            // Found an optimal (so far) path to this node.  Take score for node to see how good it is.
            neighbour.visited = true;
            neighbour.parent = currentNode;
            if (!neighbour.centroid || !end.centroid) throw new Error('Unexpected state');
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
    }
  }, {
    key: 'heuristic',
    value: function heuristic(pos1, pos2) {
      return utils.distanceToSquared(pos1, pos2);
    }
  }, {
    key: 'neighbours',
    value: function neighbours(graph, node) {
      var ret = [];

      for (var e = 0; e < node.neighbours.length; e++) {
        ret.push(graph[node.neighbours[e]]);
      }

      return ret;
    }
  }]);

  return AStar;
}();

module.exports = AStar;

},{"./BinaryHeap":3,"./utils.js":7}],3:[function(require,module,exports){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// javascript-astar
// http://github.com/bgrins/javascript-astar
// Freely distributable under the MIT License.
// Implements the astar search algorithm in javascript using a binary heap.

var BinaryHeap = function () {
  function BinaryHeap(scoreFunction) {
    _classCallCheck(this, BinaryHeap);

    this.content = [];
    this.scoreFunction = scoreFunction;
  }

  _createClass(BinaryHeap, [{
    key: "push",
    value: function push(element) {
      // Add the new element to the end of the array.
      this.content.push(element);

      // Allow it to sink down.
      this.sinkDown(this.content.length - 1);
    }
  }, {
    key: "pop",
    value: function pop() {
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
    }
  }, {
    key: "remove",
    value: function remove(node) {
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
    }
  }, {
    key: "size",
    value: function size() {
      return this.content.length;
    }
  }, {
    key: "rescoreElement",
    value: function rescoreElement(node) {
      this.sinkDown(this.content.indexOf(node));
    }
  }, {
    key: "sinkDown",
    value: function sinkDown(n) {
      // Fetch the element that has to be sunk.
      var element = this.content[n];

      // When at 0, an element can not sink any further.
      while (n > 0) {
        // Compute the parent element's index, and fetch it.
        var parentN = (n + 1 >> 1) - 1;
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
    }
  }, {
    key: "bubbleUp",
    value: function bubbleUp(n) {
      // Look up the target element and its score.
      var length = this.content.length,
          element = this.content[n],
          elemScore = this.scoreFunction(element);

      while (true) {
        // Compute the indices of the child elements.
        var child2N = n + 1 << 1,
            child1N = child2N - 1;
        // This is used to store the new position of the element,
        // if any.
        var swap = null;
        var child1Score = void 0;
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
    }
  }]);

  return BinaryHeap;
}();

module.exports = BinaryHeap;

},{}],4:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var utils = require('./utils');

var polygonId = 1;

var Builder = function () {
  function Builder() {
    _classCallCheck(this, Builder);
  }

  _createClass(Builder, null, [{
    key: 'buildZone',

    /**
     * Constructs groups from the given navigation mesh.
     * @param  {THREE.Geometry} geometry
     * @return {Zone}
     */
    value: function buildZone(geometry) {
      var _this = this;

      var navMesh = this._buildNavigationMesh(geometry);

      var zone = {};

      navMesh.vertices.forEach(function (v) {
        v.x = utils.roundNumber(v.x, 2);
        v.y = utils.roundNumber(v.y, 2);
        v.z = utils.roundNumber(v.z, 2);
      });

      zone.vertices = navMesh.vertices;

      var groups = this._buildPolygonGroups(navMesh);

      zone.groups = [];

      var findPolygonIndex = function findPolygonIndex(group, p) {
        for (var i = 0; i < group.length; i++) {
          if (p === group[i]) return i;
        }
      };

      groups.forEach(function (group) {

        var newGroup = [];

        group.forEach(function (p) {

          var neighbours = p.neighbours.map(function (n) {
            return findPolygonIndex(group, n);
          });

          // Build a portal list to each neighbour
          var portals = p.neighbours.map(function (n) {
            return _this._getSharedVerticesInOrder(p, n);
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

        zone.groups.push(newGroup);
      });

      return zone;
    }

    /**
     * Constructs a navigation mesh from the given geometry.
     * @param {THREE.Geometry} geometry
     * @return {Object}
     */

  }, {
    key: '_buildNavigationMesh',
    value: function _buildNavigationMesh(geometry) {
      utils.computeCentroids(geometry);
      geometry.mergeVertices();
      return this._buildPolygonsFromGeometry(geometry);
    }
  }, {
    key: '_buildPolygonGroups',
    value: function _buildPolygonGroups(navigationMesh) {

      var polygons = navigationMesh.polygons;

      var polygonGroups = [];
      var groupCount = 0;

      var spreadGroupId = function spreadGroupId(polygon) {
        polygon.neighbours.forEach(function (neighbour) {
          if (neighbour.group === undefined) {
            neighbour.group = polygon.group;
            spreadGroupId(neighbour);
          }
        });
      };

      polygons.forEach(function (polygon) {

        if (polygon.group === undefined) {
          polygon.group = groupCount++;
          // Spread it
          spreadGroupId(polygon);
        }

        if (!polygonGroups[polygon.group]) polygonGroups[polygon.group] = [];

        polygonGroups[polygon.group].push(polygon);
      });

      return polygonGroups;
    }
  }, {
    key: '_buildPolygonNeighbours',
    value: function _buildPolygonNeighbours(polygon, navigationMesh) {
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
    }
  }, {
    key: '_buildPolygonsFromGeometry',
    value: function _buildPolygonsFromGeometry(geometry) {
      var _this2 = this;

      var polygons = [];
      var vertices = geometry.vertices;
      var faceVertexUvs = geometry.faceVertexUvs;

      // Convert the faces into a custom format that supports more than 3 vertices
      geometry.faces.forEach(function (face) {
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
      polygons.forEach(function (polygon) {
        _this2._buildPolygonNeighbours(polygon, navigationMesh);
      });

      return navigationMesh;
    }
  }, {
    key: '_getSharedVerticesInOrder',
    value: function _getSharedVerticesInOrder(a, b) {

      var aList = a.vertexIds;
      var bList = b.vertexIds;

      var sharedVertices = [];

      aList.forEach(function (vId) {
        if (bList.includes(vId)) {
          sharedVertices.push(vId);
        }
      });

      if (sharedVertices.length < 2) return [];

      if (sharedVertices.includes(aList[0]) && sharedVertices.includes(aList[aList.length - 1])) {
        // Vertices on both edges are bad, so shift them once to the left
        aList.push(aList.shift());
      }

      if (sharedVertices.includes(bList[0]) && sharedVertices.includes(bList[bList.length - 1])) {
        // Vertices on both edges are bad, so shift them once to the left
        bList.push(bList.shift());
      }

      // Again!
      sharedVertices.length = 0;

      aList.forEach(function (vId) {
        if (bList.includes(vId)) {
          sharedVertices.push(vId);
        }
      });

      return sharedVertices;
    }
  }]);

  return Builder;
}();

module.exports = Builder;

},{"./utils":7}],5:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var utils = require('./utils');

var Channel = function () {
  function Channel() {
    _classCallCheck(this, Channel);

    this.portals = [];
  }

  _createClass(Channel, [{
    key: 'push',
    value: function push(p1, p2) {
      if (p2 === undefined) p2 = p1;
      this.portals.push({
        left: p1,
        right: p2
      });
    }
  }, {
    key: 'stringPull',
    value: function stringPull() {
      var portals = this.portals;
      var pts = [];
      // Init scan state
      var portalApex = void 0,
          portalLeft = void 0,
          portalRight = void 0;
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
        if (utils.triarea2(portalApex, portalRight, right) <= 0.0) {
          if (utils.vequal(portalApex, portalRight) || utils.triarea2(portalApex, portalLeft, right) > 0.0) {
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
        if (utils.triarea2(portalApex, portalLeft, left) >= 0.0) {
          if (utils.vequal(portalApex, portalLeft) || utils.triarea2(portalApex, portalRight, left) < 0.0) {
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

      if (pts.length === 0 || !utils.vequal(pts[pts.length - 1], portals[portals.length - 1].left)) {
        // Append last point to path.
        pts.push(portals[portals.length - 1].left);
      }

      this.path = pts;
      return pts;
    }
  }]);

  return Channel;
}();

module.exports = Channel;

},{"./utils":7}],6:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/* global THREE */

var utils = require('./utils');
var AStar = require('./AStar');
var Builder = require('./Builder');
var Channel = require('./Channel');

/**
 * Defines an instance of the pathfinding module, with one or more zones.
 */

var Path = function () {
	function Path() {
		_classCallCheck(this, Path);

		this.zones = {};
	}

	/**
  * (Static) Builds a zone/node set from navigation mesh geometry.
  * @param  {THREE.Geometry} geometry
  * @return {Zone}
  */


	_createClass(Path, [{
		key: 'setZoneData',


		/**
   * Sets data for the given zone.
   * @param {string} zoneID
   * @param {Zone} zone
   */
		value: function setZoneData(zoneID, zone) {
			this.zones[zoneID] = zone;
		}

		/**
   * Returns closest node group ID for given position.
   * @param  {string} zoneID
   * @param  {THREE.Vector3} position
   * @return {number}
   */

	}, {
		key: 'getGroup',
		value: function getGroup(zoneID, position) {
			if (!this.zones[zoneID]) return null;

			var closestNodeGroup = null;
			var distance = Math.pow(50, 2);

			this.zones[zoneID].groups.forEach(function (group, index) {
				group.forEach(function (node) {
					var measuredDistance = utils.distanceToSquared(node.centroid, position);
					if (measuredDistance < distance) {
						closestNodeGroup = index;
						distance = measuredDistance;
					}
				});
			});

			return closestNodeGroup;
		}

		/**
   * Returns a random node within a given range of a given position.
   * @param  {string} zoneID
   * @param  {number} groupID
   * @param  {THREE.Vector3} nearPosition
   * @param  {number} nearRange
   * @return {Node}
   */

	}, {
		key: 'getRandomNode',
		value: function getRandomNode(zoneID, groupID, nearPosition, nearRange) {

			if (!this.zones[zoneID]) return new THREE.Vector3();

			nearPosition = nearPosition || null;
			nearRange = nearRange || 0;

			var candidates = [];
			var polygons = this.zones[zoneID].groups[groupID];

			polygons.forEach(function (p) {
				if (nearPosition && nearRange) {
					if (utils.distanceToSquared(nearPosition, p.centroid) < nearRange * nearRange) {
						candidates.push(p.centroid);
					}
				} else {
					candidates.push(p.centroid);
				}
			});

			return utils.sample(candidates) || new THREE.Vector3();
		}

		/**
   * Returns the closest node to the target position.
   * @param  {THREE.Vector3} position
   * @param  {string}  zoneID
   * @param  {number}  groupID
   * @param  {boolean} checkPolygon
   * @return {Node}
   */

	}, {
		key: 'getClosestNode',
		value: function getClosestNode(position, zoneID, groupID) {
			var checkPolygon = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;

			var nodes = this.zones[zoneID].groups[groupID];
			var vertices = this.zones[zoneID].vertices;
			var closestNode = null;
			var closestDistance = Infinity;

			nodes.forEach(function (node) {
				var distance = utils.distanceToSquared(node.centroid, position);
				if (distance < closestDistance && (!checkPolygon || utils.isVectorInPolygon(position, node, vertices))) {
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
   * @param  {THREE.Vector3} startPosition Start position.
   * @param  {THREE.Vector3} targetPosition Destination.
   * @param  {string} zoneID ID of current zone.
   * @param  {number} groupID Current group ID.
   * @return {Array<THREE.Vector3>} Array of points defining the path.
   */

	}, {
		key: 'findPath',
		value: function findPath(startPosition, targetPosition, zoneID, groupID) {
			var nodes = this.zones[zoneID].groups[groupID];
			var vertices = this.zones[zoneID].vertices;

			var closestNode = this.getClosestNode(startPosition, zoneID, groupID);
			var farthestNode = this.getClosestNode(targetPosition, zoneID, groupID, true);

			// If we can't find any node, just go straight to the target
			if (!closestNode || !farthestNode) {
				return null;
			}

			var paths = AStar.search(nodes, closestNode, farthestNode);

			var getPortalFromTo = function getPortalFromTo(a, b) {
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
					channel.push(vertices[portals[0]], vertices[portals[1]]);
				}
			}
			channel.push(targetPosition);
			channel.stringPull();

			// Return the path, omitting first position (which is already known).
			var path = channel.path.map(function (c) {
				return new THREE.Vector3(c.x, c.y, c.z);
			});
			path.shift();
			return path;
		}
	}], [{
		key: 'createZone',
		value: function createZone(geometry) {
			return Builder.buildZone(geometry);
		}
	}]);

	return Path;
}();

/**
 * Clamps a step along the navmesh, given start and desired endpoint. May be
 * used to constrain first-person / WASD controls.
 *
 * @param  {THREE.Vector3} start
 * @param  {THREE.Vector3} end Desired endpoint.
 * @param  {Node} node
 * @param  {string} zoneID
 * @param  {number} groupID
 * @param  {THREE.Vector3} endTarget Updated endpoint.
 * @return {Node} Updated node.
 */


Path.prototype.clampStep = function () {
	var point = new THREE.Vector3();
	var plane = new THREE.Plane();
	var triangle = new THREE.Triangle();

	var closestNode = void 0;
	var closestPoint = new THREE.Vector3();
	var closestDistance = void 0;

	return function (start, end, node, zoneID, groupID, endTarget) {
		var vertices = this.zones[zoneID].vertices;
		var nodes = this.zones[zoneID].groups[groupID];

		var nodeQueue = [node];
		var nodeDepth = {};
		nodeDepth[node.id] = 0;

		closestNode = undefined;
		closestPoint.set(0, 0, 0);
		closestDistance = Infinity;

		// Project the step along the current node.
		plane.setFromCoplanarPoints(vertices[node.vertexIds[0]], vertices[node.vertexIds[1]], vertices[node.vertexIds[2]]);
		plane.projectPoint(end, point);
		end.copy(point);

		for (var currentNode = nodeQueue.pop(); currentNode; currentNode = nodeQueue.pop()) {

			triangle.set(vertices[currentNode.vertexIds[0]], vertices[currentNode.vertexIds[1]], vertices[currentNode.vertexIds[2]]);

			triangle.closestPointToPoint(end, point);

			if (point.distanceToSquared(end) < closestDistance) {
				closestNode = currentNode;
				closestPoint.copy(point);
				closestDistance = point.distanceToSquared(end);
			}

			var depth = nodeDepth[currentNode];
			if (depth > 2) continue;

			for (var i = 0; i < currentNode.neighbours.length; i++) {
				var neighbour = nodes[currentNode.neighbours[i]];
				if (neighbour.id in nodeDepth) continue;

				nodeQueue.push(neighbour);
				nodeDepth[neighbour.id] = depth + 1;
			}
		}

		endTarget.copy(closestPoint);
		return closestNode;
	};
}();

/**
 * Defines a zone of interconnected groups on a navigation mesh.
 *
 * @type {Object}
 * @property {Array<Group>} groups
 * @property {Array<THREE.Vector3} vertices
 */
var Zone = {}; // jshint ignore:line

/**
 * Defines a group within a navigation mesh.
 *
 * @type {Object}
 */
var Group = {}; // jshint ignore:line

/**
 * Defines a node (or polygon) within a group.
 *
 * @type {Object}
 * @property {number} id
 * @property {Array<number>} neighbours IDs of neighboring nodes.
 * @property {Array<number} vertexIds
 * @property {THREE.Vector3} centroid
 * @property {Array<Array<number>>} portals Array of portals, each defined by two vertex IDs.
 * @property {boolean} closed
 * @property {number} cost
 */
var Node = {}; // jshint ignore:line

module.exports = Path;

},{"./AStar":2,"./Builder":4,"./Channel":5,"./utils":7}],7:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Utils = function () {
  function Utils() {
    _classCallCheck(this, Utils);
  }

  _createClass(Utils, null, [{
    key: 'computeCentroids',
    value: function computeCentroids(geometry) {
      var f, fl, face;

      for (f = 0, fl = geometry.faces.length; f < fl; f++) {

        face = geometry.faces[f];
        face.centroid = new THREE.Vector3(0, 0, 0);

        face.centroid.add(geometry.vertices[face.a]);
        face.centroid.add(geometry.vertices[face.b]);
        face.centroid.add(geometry.vertices[face.c]);
        face.centroid.divideScalar(3);
      }
    }
  }, {
    key: 'roundNumber',
    value: function roundNumber(number, decimals) {
      var newnumber = Number(number + '').toFixed(parseInt(decimals));
      return parseFloat(newnumber);
    }
  }, {
    key: 'sample',
    value: function sample(list) {
      return list[Math.floor(Math.random() * list.length)];
    }
  }, {
    key: 'mergeVertexIds',
    value: function mergeVertexIds(aList, bList) {

      var sharedVertices = [];

      aList.forEach(function (vID) {
        if (bList.indexOf(vID) >= 0) {
          sharedVertices.push(vID);
        }
      });

      if (sharedVertices.length < 2) return [];

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

      aList.forEach(function (vId) {
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

        if (c++ > 10) throw new Error('Unexpected state');
      }

      // Shave
      temp.shift();
      temp.pop();

      cList = cList.concat(temp);

      return cList;
    }
  }, {
    key: 'setPolygonCentroid',
    value: function setPolygonCentroid(polygon, navigationMesh) {
      var sum = new THREE.Vector3();

      var vertices = navigationMesh.vertices;

      polygon.vertexIds.forEach(function (vId) {
        sum.add(vertices[vId]);
      });

      sum.divideScalar(polygon.vertexIds.length);

      polygon.centroid.copy(sum);
    }
  }, {
    key: 'cleanPolygon',
    value: function cleanPolygon(polygon, navigationMesh) {

      var newVertexIds = [];

      var vertices = navigationMesh.vertices;

      for (var i = 0; i < polygon.vertexIds.length; i++) {

        var vertex = vertices[polygon.vertexIds[i]];

        var nextVertexId, previousVertexId;
        var nextVertex, previousVertex;

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

        if (angle > Math.PI - 0.01 && angle < Math.PI + 0.01) {

          // Remove the neighbours who had this vertex
          var goodNeighbours = [];
          polygon.neighbours.forEach(function (neighbour) {
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

      polygon.vertexIds = newVertexIds;

      this.setPolygonCentroid(polygon, navigationMesh);
    }
  }, {
    key: 'isConvex',
    value: function isConvex(polygon, navigationMesh) {

      var vertices = navigationMesh.vertices;

      if (polygon.vertexIds.length < 3) return false;

      var convex = true;

      var total = 0;

      var results = [];

      for (var i = 0; i < polygon.vertexIds.length; i++) {

        var vertex = vertices[polygon.vertexIds[i]];

        var nextVertex, previousVertex;

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

        if (angle === Math.PI || angle === 0) return false;

        var r = a.cross(b).y;
        results.push(r);
      }

      // if ( total > (polygon.vertexIds.length-2)*Math.PI ) return false;

      results.forEach(function (r) {
        if (r === 0) convex = false;
      });

      if (results[0] > 0) {
        results.forEach(function (r) {
          if (r < 0) convex = false;
        });
      } else {
        results.forEach(function (r) {
          if (r > 0) convex = false;
        });
      }

      return convex;
    }
  }, {
    key: 'distanceToSquared',
    value: function distanceToSquared(a, b) {

      var dx = a.x - b.x;
      var dy = a.y - b.y;
      var dz = a.z - b.z;

      return dx * dx + dy * dy + dz * dz;
    }

    //+ Jonas Raoni Soares Silva
    //@ http://jsfromhell.com/math/is-point-in-poly [rev. #0]

  }, {
    key: 'isPointInPoly',
    value: function isPointInPoly(poly, pt) {
      for (var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i) {
        (poly[i].z <= pt.z && pt.z < poly[j].z || poly[j].z <= pt.z && pt.z < poly[i].z) && pt.x < (poly[j].x - poly[i].x) * (pt.z - poly[i].z) / (poly[j].z - poly[i].z) + poly[i].x && (c = !c);
      }return c;
    }
  }, {
    key: 'isVectorInPolygon',
    value: function isVectorInPolygon(vector, polygon, vertices) {

      // reference point will be the centroid of the polygon
      // We need to rotate the vector as well as all the points which the polygon uses

      var lowestPoint = 100000;
      var highestPoint = -100000;

      var polygonVertices = [];

      polygon.vertexIds.forEach(function (vId) {
        lowestPoint = Math.min(vertices[vId].y, lowestPoint);
        highestPoint = Math.max(vertices[vId].y, highestPoint);
        polygonVertices.push(vertices[vId]);
      });

      if (vector.y < highestPoint + 0.5 && vector.y > lowestPoint - 0.5 && this.isPointInPoly(polygonVertices, vector)) {
        return true;
      }
      return false;
    }
  }, {
    key: 'triarea2',
    value: function triarea2(a, b, c) {
      var ax = b.x - a.x;
      var az = b.z - a.z;
      var bx = c.x - a.x;
      var bz = c.z - a.z;
      return bx * az - ax * bz;
    }
  }, {
    key: 'vequal',
    value: function vequal(a, b) {
      return this.distanceToSquared(a, b) < 0.00001;
    }
  }, {
    key: 'array_intersect',
    value: function array_intersect() {
      var i = void 0,
          shortest = void 0,
          nShortest = void 0,
          n = void 0,
          len = void 0,
          ret = [],
          obj = {},
          nOthers = void 0;
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
        n = i === shortest ? 0 : i || shortest; //Read the shortest array first. Read the first array instead of the shortest
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
  }]);

  return Utils;
}();

module.exports = Utils;

},{}]},{},[1]);
