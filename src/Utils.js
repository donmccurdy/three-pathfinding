import { BufferAttribute, BufferGeometry } from 'three';

class Utils {

  static roundNumber (value, decimals) {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }

  static sample (list) {
    return list[Math.floor(Math.random() * list.length)];
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

  /**
   * Modified version of BufferGeometryUtils.mergeVertices, ignoring vertex
   * attributes other than position.
   *
   * @param {THREE.BufferGeometry} geometry
   * @param {number} tolerance
   * @return {THREE.BufferGeometry>}
   */
  static mergeVertices (geometry, tolerance = 1e-4) {

    tolerance = Math.max( tolerance, Number.EPSILON );

    // Generate an index buffer if the geometry doesn't have one, or optimize it
    // if it's already available.
    var hashToIndex = {};
    var indices = geometry.getIndex();
    var positions = geometry.getAttribute( 'position' );
    var vertexCount = indices ? indices.count : positions.count;

    // Next value for triangle indices.
    var nextIndex = 0;

    var newIndices = [];
    var newPositions = [];

    // Convert the error tolerance to an amount of decimal places to truncate to.
    var decimalShift = Math.log10( 1 / tolerance );
    var shiftMultiplier = Math.pow( 10, decimalShift );

    for ( var i = 0; i < vertexCount; i ++ ) {

      var index = indices ? indices.getX( i ) : i;

      // Generate a hash for the vertex attributes at the current index 'i'.
      var hash = '';

      // Double tilde truncates the decimal value.
      hash += `${ ~ ~ ( positions.getX( index ) * shiftMultiplier ) },`;
      hash += `${ ~ ~ ( positions.getY( index ) * shiftMultiplier ) },`;
      hash += `${ ~ ~ ( positions.getZ( index ) * shiftMultiplier ) },`;

      // Add another reference to the vertex if it's already
      // used by another index.
      if ( hash in hashToIndex ) {

        newIndices.push( hashToIndex[ hash ] );

      } else {

        newPositions.push( positions.getX( index ) );
        newPositions.push( positions.getY( index ) );
        newPositions.push( positions.getZ( index ) );

        hashToIndex[ hash ] = nextIndex;
        newIndices.push( nextIndex );
        nextIndex ++;

      }

    }

    // Construct merged BufferGeometry.

    const positionAttribute = new BufferAttribute(
      new Float32Array( newPositions ),
      positions.itemSize,
      positions.normalized
    );

    const result = new BufferGeometry();
    result.setAttribute( 'position', positionAttribute );
    result.setIndex( newIndices );

    return result;

  }
}

export { Utils };
