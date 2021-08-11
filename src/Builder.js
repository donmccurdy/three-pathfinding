import { Vector3 } from 'three';

import { Utils } from './Utils';

class Builder {
  /**
   * Constructs groups from the given navigation mesh.
   * @param  {BufferGeometry} geometry
   * @param  {number} tolerance
   * @return {Zone}
   */
  static buildZone (geometry, tolerance) {

    const navMesh = this._buildNavigationMesh(geometry, tolerance);

    const zone = {};

    navMesh.vertices.forEach((v) => {
      v.x = Utils.roundNumber(v.x, 2);
      v.y = Utils.roundNumber(v.y, 2);
      v.z = Utils.roundNumber(v.z, 2);
    });

    zone.vertices = navMesh.vertices;

    const groups = this._buildPolygonGroups(navMesh);

    // TODO: This block represents a large portion of navigation mesh construction time
    // and could probably be optimized. For example, construct portals while
    // determining the neighbor graph.
    zone.groups = new Array(groups.length);
    groups.forEach((group, groupIndex) => {

      const indexByPolygon = new Map(); // { polygon: index in group }
      group.forEach((poly, polyIndex) => { indexByPolygon.set(poly, polyIndex); });

      const newGroup = new Array(group.length);
      group.forEach((poly, polyIndex) => {

        const neighbourIndices = [];
        poly.neighbours.forEach((n) => neighbourIndices.push(indexByPolygon.get(n)));

        // Build a portal list to each neighbour
        const portals = [];
        poly.neighbours.forEach((n) => portals.push(this._getSharedVerticesInOrder(poly, n)));

        const centroid = new Vector3( 0, 0, 0 );
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
  }

  /**
   * Constructs a navigation mesh from the given geometry.
   * @param {BufferGeometry} geometry
   * @return {Object}
   */
  static _buildNavigationMesh (geometry, tolerance) {
    geometry = Utils.mergeVertices(geometry, tolerance);
    return this._buildPolygonsFromGeometry(geometry);
  }

  /**
   * Spreads the group ID of the given polygon to all connected polygons
   * @param {Object} seed
   */
  static _spreadGroupId (seed) {
    let nextBatch = new Set([seed]);

    while(nextBatch.size > 0) {
      const batch = nextBatch;
      nextBatch = new Set();

      batch.forEach((polygon) => {
        polygon.group = seed.group;
        polygon.neighbours.forEach((neighbour) => {
          if(neighbour.group === undefined) {
            nextBatch.add(neighbour);
          }
        });
      });
    }
  }

  static _buildPolygonGroups (navigationMesh) {

    const polygons = navigationMesh.polygons;

    const polygonGroups = [];

    polygons.forEach((polygon) => {
      if (polygon.group !== undefined) {
        // this polygon is already part of a group
        polygonGroups[polygon.group].push(polygon);
      } else {
        // we need to make a new group and spread its ID to neighbors
        polygon.group = polygonGroups.length;
        this._spreadGroupId(polygon);
        polygonGroups.push([polygon]);
      }
    });

    return polygonGroups;
  }

  static _buildPolygonNeighbours (polygon, vertexPolygonMap) {
    const neighbours = new Set();

    const groupA = vertexPolygonMap[polygon.vertexIds[0]];
    const groupB = vertexPolygonMap[polygon.vertexIds[1]];
    const groupC = vertexPolygonMap[polygon.vertexIds[2]];

    // It's only necessary to iterate groups A and B. Polygons contained only
    // in group C cannot share a >1 vertex with this polygon.
    // IMPORTANT: Bublé cannot compile for-of loops.
    groupA.forEach((candidate) => {
      if (candidate === polygon) return;
      if (groupB.includes(candidate) || groupC.includes(candidate)) {
        neighbours.add(candidate);
      }
    });
    groupB.forEach((candidate) => {
      if (candidate === polygon) return;
      if (groupC.includes(candidate)) {
        neighbours.add(candidate);
      }
    });

    return neighbours;
  }

  static _buildPolygonsFromGeometry (geometry) {

    const polygons = [];
    const vertices = [];

    const position = geometry.attributes.position;
    const index = geometry.index;

    // Constructing the neighbor graph brute force is O(n²). To avoid that,
    // create a map from vertices to the polygons that contain them, and use it
    // while connecting polygons. This reduces complexity to O(n*m), where 'm'
    // is related to connectivity of the mesh.

    /** Array of polygon objects by vertex index. */
    const vertexPolygonMap = [];

    for (let i = 0; i < position.count; i++) {
      vertices.push(new Vector3().fromBufferAttribute(position, i));
      vertexPolygonMap[i] = [];
    }

    // Convert the faces into a custom format that supports more than 3 vertices
    for (let i = 0; i < geometry.index.count; i += 3) {
      const a = index.getX(i);
      const b = index.getX(i + 1);
      const c = index.getX(i + 2);
      const poly = {vertexIds: [a, b, c], neighbours: null};
      polygons.push(poly);
      vertexPolygonMap[a].push(poly);
      vertexPolygonMap[b].push(poly);
      vertexPolygonMap[c].push(poly);
    }

    // Build a list of adjacent polygons
    polygons.forEach((polygon) => {
      polygon.neighbours = this._buildPolygonNeighbours(polygon, vertexPolygonMap);
    });

    return {
      polygons: polygons,
      vertices: vertices
    };
  }

  static _getSharedVerticesInOrder (a, b) {

    const aList = a.vertexIds;
    const a0 = aList[0], a1 = aList[1], a2 = aList[2];

    const bList = b.vertexIds;
    const shared0 = bList.includes(a0);
    const shared1 = bList.includes(a1);
    const shared2 = bList.includes(a2);

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
  }
}

export { Builder };
