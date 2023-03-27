import {
  BoxGeometry,
  SphereGeometry,
  BufferAttribute,
  BufferGeometry,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Vector3,
} from 'three';

const colors = {
  PLAYER: 0xEE836F,
  TARGET: 0xDCCB18,
  PATH: 0x00A3AF,
  WAYPOINT: 0x00A3AF,
  CLAMPED_STEP: 0xDCD3B2,
  CLOSEST_NODE: 0x43676B,
};

const OFFSET = 0.2;

/**
 * Helper for debugging pathfinding behavior.
 */
class PathfindingHelper extends Object3D {
  constructor () {
    super();

    this._playerMarker = new Mesh(
      new SphereGeometry( 0.25, 32, 32 ),
      new MeshBasicMaterial( { color: colors.PLAYER } )
    );

    this._targetMarker = new Mesh(
      new BoxGeometry( 0.3, 0.3, 0.3 ),
      new MeshBasicMaterial( { color: colors.TARGET } )
    );


    this._nodeMarker = new Mesh(
      new BoxGeometry( 0.1, 0.8, 0.1 ),
      new MeshBasicMaterial( { color: colors.CLOSEST_NODE } )
    );


    this._stepMarker = new Mesh(
      new BoxGeometry( 0.1, 1, 0.1 ),
      new MeshBasicMaterial( { color: colors.CLAMPED_STEP } )
    );

    this._pathMarker = new Object3D();

    this._pathLineMaterial = new LineBasicMaterial( { color: colors.PATH, linewidth: 2 } ) ;
    this._pathPointMaterial = new MeshBasicMaterial( { color: colors.WAYPOINT } );
    this._pathPointGeometry = new SphereGeometry( 0.08 );

    this._markers = [
      this._playerMarker,
      this._targetMarker,
      this._nodeMarker,
      this._stepMarker,
      this._pathMarker,
    ];

    this._markers.forEach( ( marker ) => {

      marker.visible = false;

      this.add( marker );

    } );

  }

  /**
   * @param {Array<Vector3>} path
   * @return {this}
   */
  setPath ( path ) {

    while ( this._pathMarker.children.length ) {

      this._pathMarker.children[ 0 ].visible = false;
      this._pathMarker.remove( this._pathMarker.children[ 0 ] );

    }

    path = [ this._playerMarker.position ].concat( path );

    // Draw debug lines
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(path.length * 3), 3));
    for (let i = 0; i < path.length; i++) {
      geometry.attributes.position.setXYZ(i, path[ i ].x, path[ i ].y + OFFSET, path[ i ].z);
    }
    this._pathMarker.add( new Line( geometry, this._pathLineMaterial ) );

    for ( let i = 0; i < path.length - 1; i++ ) {

      const node = new Mesh( this._pathPointGeometry, this._pathPointMaterial );
      node.position.copy( path[ i ] );
      node.position.y += OFFSET;
      this._pathMarker.add( node );

    }

    this._pathMarker.visible = true;

    return this;

  }

  /**
   * @param {Vector3} position
   * @return {this}
   */
  setPlayerPosition( position ) {

    this._playerMarker.position.copy( position );
    this._playerMarker.visible = true;
    return this;

  }

  /**
   * @param {Vector3} position
   * @return {this}
   */
  setTargetPosition( position ) {

    this._targetMarker.position.copy( position );
    this._targetMarker.visible = true;
    return this;

  }

  /**
   * @param {Vector3} position
   * @return {this}
   */
  setNodePosition( position ) {

    this._nodeMarker.position.copy( position );
    this._nodeMarker.visible = true;
    return this;

  }

  /**
   * @param {Vector3} position
   * @return {this}
   */
  setStepPosition( position ) {

    this._stepMarker.position.copy( position );
    this._stepMarker.visible = true;
    return this;

  }

  /**
   * Hides all markers.
   * @return {this}
   */
  reset () {

    while ( this._pathMarker.children.length ) {

      this._pathMarker.children[ 0 ].visible = false;
      this._pathMarker.remove( this._pathMarker.children[ 0 ] );

    }

    this._markers.forEach( ( marker ) => {

      marker.visible = false;

    } );

    return this;

  }

}

export { PathfindingHelper };
