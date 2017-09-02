class Utils {

  static computeCentroids (geometry) {
    var f, fl, face;

    for ( f = 0, fl = geometry.faces.length; f < fl; f ++ ) {

      face = geometry.faces[ f ];
      face.centroid = new THREE.Vector3( 0, 0, 0 );

      face.centroid.add( geometry.vertices[ face.a ] );
      face.centroid.add( geometry.vertices[ face.b ] );
      face.centroid.add( geometry.vertices[ face.c ] );
      face.centroid.divideScalar( 3 );

    }
  }

  static roundNumber (number, decimals) {
    var newnumber = Number(number + '').toFixed(parseInt(decimals));
    return parseFloat(newnumber);
  }

  static sample (list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  static mergeVertexIds (aList, bList) {

    var sharedVertices = [];

    aList.forEach((vID) => {
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

      if (c++ > 10) throw new Error('Unexpected state');
    }

    // Shave
    temp.shift();
    temp.pop();

    cList = cList.concat(temp);

    return cList;
  }

  static setPolygonCentroid (polygon, navigationMesh) {
    var sum = new THREE.Vector3();

    var vertices = navigationMesh.vertices;

    polygon.vertexIds.forEach((vId) => {
      sum.add(vertices[vId]);
    });

    sum.divideScalar(polygon.vertexIds.length);

    polygon.centroid.copy(sum);
  }

  static cleanPolygon (polygon, navigationMesh) {

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

  }

  static isConvex (polygon, navigationMesh) {

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
  }

  static distanceToSquared (a, b) {

    var dx = a.x - b.x;
    var dy = a.y - b.y;
    var dz = a.z - b.z;

    return dx * dx + dy * dy + dz * dz;

  }

  //+ Jonas Raoni Soares Silva
  //@ http://jsfromhell.com/math/is-point-in-poly [rev. #0]
  static isPointInPoly (poly, pt) {
    for (var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i)
      ((poly[i].z <= pt.z && pt.z < poly[j].z) || (poly[j].z <= pt.z && pt.z < poly[i].z)) && (pt.x < (poly[j].x - poly[i].x) * (pt.z - poly[i].z) / (poly[j].z - poly[i].z) + poly[i].x) && (c = !c);
    return c;
  }

  static isVectorInPolygon (vector, polygon, vertices) {

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
  }

  static triarea2 (a, b, c) {
    var ax = b.x - a.x;
    var az = b.z - a.z;
    var bx = c.x - a.x;
    var bz = c.z - a.z;
    return bx * az - ax * bz;
  }

  static vequal (a, b) {
    return this.distanceToSquared(a, b) < 0.00001;
  }

  static array_intersect () {
    let i, shortest, nShortest, n, len, ret = [],
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
}



module.exports = Utils;
