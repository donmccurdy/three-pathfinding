const utils = require('./utils');

let polygonId = 1;

class Builder {
  /**
   * Constructs groups from the given navigation mesh.
   * @param  {THREE.Geometry} geometry
   * @return {Zone}
   */
  static buildZone (geometry) {

    const navMesh = this._buildNavigationMesh(geometry);

    const zone = {};

    navMesh.vertices.forEach((v) => {
      v.x = utils.roundNumber(v.x, 2);
      v.y = utils.roundNumber(v.y, 2);
      v.z = utils.roundNumber(v.z, 2);
    });

    zone.vertices = navMesh.vertices;

    const groups = this._buildPolygonGroups(navMesh);

    zone.groups = [];

    const findPolygonIndex = function (group, p) {
      for (let i = 0; i < group.length; i++) {
        if (p === group[i]) return i;
      }
    };

    groups.forEach((group) => {

      const newGroup = [];

      group.forEach((p) => {

        const neighbours = p.neighbours.map((n) => findPolygonIndex(group, n));

        // Build a portal list to each neighbour
        const portals = p.neighbours.map((n) => this._getSharedVerticesInOrder(p, n));

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
  static _buildNavigationMesh (geometry) {
    utils.computeCentroids(geometry);
    geometry.mergeVertices();
    return this._buildPolygonsFromGeometry(geometry);
  }

  static _buildPolygonGroups (navigationMesh) {

    const polygons = navigationMesh.polygons;

    const polygonGroups = [];
    let groupCount = 0;

    const spreadGroupId = function (polygon) {
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

    return polygonGroups;
  }

  static _buildPolygonNeighbours (polygon, navigationMesh) {
    polygon.neighbours = [];

    // All other nodes that contain at least two of our vertices are our neighbours
    for (let i = 0, len = navigationMesh.polygons.length; i < len; i++) {
      if (polygon === navigationMesh.polygons[i]) continue;

      // Don't check polygons that are too far, since the intersection tests take a long time
      if (polygon.centroid.distanceToSquared(navigationMesh.polygons[i].centroid) > 100 * 100) continue;

      const matches = utils.array_intersect(polygon.vertexIds, navigationMesh.polygons[i].vertexIds);

      if (matches.length >= 2) {
        polygon.neighbours.push(navigationMesh.polygons[i]);
      }
    }
  }

  static _buildPolygonsFromGeometry (geometry) {

    const polygons = [];
    const vertices = geometry.vertices;
    const faceVertexUvs = geometry.faceVertexUvs;

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

    const navigationMesh = {
      polygons: polygons,
      vertices: vertices,
      faceVertexUvs: faceVertexUvs
    };

    // Build a list of adjacent polygons
    polygons.forEach((polygon) => {
      this._buildPolygonNeighbours(polygon, navigationMesh);
    });

    return navigationMesh;
  }

  static _getSharedVerticesInOrder (a, b) {

    const aList = a.vertexIds;
    const bList = b.vertexIds;

    const sharedVertices = [];

    aList.forEach((vId) => {
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

    aList.forEach((vId) => {
      if (bList.includes(vId)) {
        sharedVertices.push(vId);
      }
    });

    return sharedVertices;
  }
}

module.exports = Builder;
