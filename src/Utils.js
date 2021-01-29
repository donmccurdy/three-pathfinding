import { BufferAttribute } from 'three';

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
   * Copied from BufferGeometryUtils.mergeVertices, because importing ES modules
   * from a sub-directory makes Node.js (as of v14) angry.
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

    // next value for triangle indices
    var nextIndex = 0;

    // attributes and new attribute arrays
    var attributeNames = Object.keys( geometry.attributes );
    var attrArrays = {};
    var morphAttrsArrays = {};
    var newIndices = [];
    var getters = [ 'getX', 'getY', 'getZ', 'getW' ];

    // initialize the arrays
    for ( var i = 0, l = attributeNames.length; i < l; i ++ ) {

      var name = attributeNames[ i ];

      attrArrays[ name ] = [];

      var morphAttr = geometry.morphAttributes[ name ];
      if ( morphAttr ) {

        morphAttrsArrays[ name ] = new Array( morphAttr.length ).fill().map( () => [] );

      }

    }

    // convert the error tolerance to an amount of decimal places to truncate to
    var decimalShift = Math.log10( 1 / tolerance );
    var shiftMultiplier = Math.pow( 10, decimalShift );
    for ( var i = 0; i < vertexCount; i ++ ) {

      var index = indices ? indices.getX( i ) : i;

      // Generate a hash for the vertex attributes at the current index 'i'
      var hash = '';
      for ( var j = 0, l = attributeNames.length; j < l; j ++ ) {

        var name = attributeNames[ j ];
        var attribute = geometry.getAttribute( name );
        var itemSize = attribute.itemSize;

        for ( var k = 0; k < itemSize; k ++ ) {

          // double tilde truncates the decimal value
          hash += `${ ~ ~ ( attribute[ getters[ k ] ]( index ) * shiftMultiplier ) },`;

        }

      }

      // Add another reference to the vertex if it's already
      // used by another index
      if ( hash in hashToIndex ) {

        newIndices.push( hashToIndex[ hash ] );

      } else {

        // copy data to the new index in the attribute arrays
        for ( var j = 0, l = attributeNames.length; j < l; j ++ ) {

          var name = attributeNames[ j ];
          var attribute = geometry.getAttribute( name );
          var morphAttr = geometry.morphAttributes[ name ];
          var itemSize = attribute.itemSize;
          var newarray = attrArrays[ name ];
          var newMorphArrays = morphAttrsArrays[ name ];

          for ( var k = 0; k < itemSize; k ++ ) {

            var getterFunc = getters[ k ];
            newarray.push( attribute[ getterFunc ]( index ) );

            if ( morphAttr ) {

              for ( var m = 0, ml = morphAttr.length; m < ml; m ++ ) {

                newMorphArrays[ m ].push( morphAttr[ m ][ getterFunc ]( index ) );

              }

            }

          }

        }

        hashToIndex[ hash ] = nextIndex;
        newIndices.push( nextIndex );
        nextIndex ++;

      }

    }

    // Generate typed arrays from new attribute arrays and update
    // the attributeBuffers
    const result = geometry.clone();
    for ( var i = 0, l = attributeNames.length; i < l; i ++ ) {

      var name = attributeNames[ i ];
      var oldAttribute = geometry.getAttribute( name );

      var buffer = new oldAttribute.array.constructor( attrArrays[ name ] );
      var attribute = new BufferAttribute( buffer, oldAttribute.itemSize, oldAttribute.normalized );

      result.setAttribute( name, attribute );

      // Update the attribute arrays
      if ( name in morphAttrsArrays ) {

        for ( var j = 0; j < morphAttrsArrays[ name ].length; j ++ ) {

          var oldMorphAttribute = geometry.morphAttributes[ name ][ j ];

          var buffer = new oldMorphAttribute.array.constructor( morphAttrsArrays[ name ][ j ] );
          var morphAttribute = new BufferAttribute( buffer, oldMorphAttribute.itemSize, oldMorphAttribute.normalized );
          result.morphAttributes[ name ][ j ] = morphAttribute;

        }

      }

    }

    // indices

    result.setIndex( newIndices );

    return result;

  }
}

export { Utils };
