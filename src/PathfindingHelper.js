/* global THREE */

const Color = {
  PLAYER: new THREE.Color( 0xEE836F ).convertGammaToLinear( 2.2 ).getHex(),
  TARGET: new THREE.Color( 0xDCCB18 ).convertGammaToLinear( 2.2 ).getHex(),
  PATH: new THREE.Color( 0x00A3AF ).convertGammaToLinear( 2.2 ).getHex(),
  WAYPOINT: new THREE.Color( 0x00A3AF ).convertGammaToLinear( 2.2 ).getHex(),
  CLAMPED_STEP: new THREE.Color( 0xDCD3B2 ).convertGammaToLinear( 2.2 ).getHex(),
  CLOSEST_NODE: new THREE.Color( 0x43676B ).convertGammaToLinear( 2.2 ).getHex(),
};

const OFFSET = 0.2;

/**
 * Helper for debugging pathfinding behavior.
 */
class PathfindingHelper extends THREE.Object3D {
  constructor () {
    super();

    this._playerMarker = new THREE.Mesh(
      new THREE.SphereGeometry( 0.25, 32, 32 ),
      new THREE.MeshBasicMaterial( {color: Color.PLAYER} )
    );

    this._targetMarker = new THREE.Mesh(
      new THREE.BoxGeometry( 0.3, 0.3, 0.3 ),
      new THREE.MeshBasicMaterial( {color: Color.TARGET} )
    );
    

    this._nodeMarker = new THREE.Mesh(
      new THREE.BoxGeometry( 0.1, 0.8, 0.1 ),
      new THREE.MeshBasicMaterial( { color: Color.CLOSEST_NODE } )
    );
    

    this._stepMarker = new THREE.Mesh(
      new THREE.BoxGeometry( 0.1, 1, 0.1 ),
      new THREE.MeshBasicMaterial( { color: Color.CLAMPED_STEP } )
    );

    this._pathMarker = new THREE.Object3D();

    this._pathLineMaterial = new THREE.LineBasicMaterial( { color: Color.PATH, linewidth: 2 } ) ;
    this._pathPointMaterial = new THREE.MeshBasicMaterial( { color: Color.WAYPOINT } );
    this._pathPointGeometry = new THREE.SphereBufferGeometry( 0.08 );

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
   * @param {Array<THREE.Vector3} path
   * @return {this}
   */
  setPath ( path ) {

    this._pathMarker.children.forEach( ( child ) => this._pathMarker.remove( child ) );

    path = [ this._playerMarker.position ].concat( path );

    // Draw debug lines
    const geometry = new THREE.Geometry();
    for (let i = 0; i < path.length; i++) {
      geometry.vertices.push( path[ i ].clone().add( new THREE.Vector3( 0, OFFSET, 0 ) ) );
    }
    this._pathMarker.add( new THREE.Line( geometry, this._pathLineMaterial ) );

    for ( let i = 0; i < path.length - 1; i++ ) {

      const node = new THREE.Mesh( this._pathPointGeometry, this._pathPointMaterial );
      node.position.copy( path[ i ] );
      node.position.y += OFFSET;
      this._pathMarker.add( node );

    }

    this._pathMarker.visible = true;

    return this;

  }

  /**
   * @param {THREE.Vector3} position
   * @return {this}
   */
  setPlayerPosition( position ) {

    this._playerMarker.position.copy( position );
    this._playerMarker.visible = true;
    return this;

  }

  /**
   * @param {THREE.Vector3} position
   * @return {this}
   */
  setTargetPosition( position ) {

    this._targetMarker.position.copy( position );
    this._targetMarker.visible = true;
    return this;

  }

  /**
   * @param {THREE.Vector3} position
   * @return {this}
   */
  setNodePosition( position ) {

    this._nodeMarker.position.copy( position );
    this._nodeMarker.visible = true;
    return this;

  }

  /**
   * @param {THREE.Vector3} position
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

    this._pathMarker.children.forEach( ( child ) => this._pathMarker.remove( child ) );

    this._markers.forEach( ( marker ) => {

      marker.visible = false;

    } );

    return this;

  }

}

export { PathfindingHelper };
