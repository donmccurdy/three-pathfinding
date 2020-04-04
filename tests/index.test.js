const THREE = global.THREE = require('three');
const { Pathfinding } = require('../');
const test = require('tape');

const EPS = 1e-5;
const ZONE = 'level';
const ROTATE = new THREE.Matrix4()
  .makeRotationAxis(new THREE.Vector3(1, 0, 0), Math.PI / 2);

test('initialize', (t) => {
  t.ok(Pathfinding, 'module loads');
  t.end();
});

test('create zone', (t) => {
  const geometry = new THREE.RingBufferGeometry(5, 10);
  const zone = Pathfinding.createZone(geometry);
  t.ok(zone, 'creates zone');
  t.equal(zone.groups.length, 1, 'zone contains one group');
  t.end();
});

test('simple path', (t) => {
  const pathfinding = new Pathfinding();
  const geometry = new THREE.RingBufferGeometry(5, 10).applyMatrix(ROTATE);
  const zone = Pathfinding.createZone(geometry);
  pathfinding.setZoneData(ZONE, zone);
  const a = new THREE.Vector3(7.5, 0, 0);
  const b = new THREE.Vector3(-7.5, 0, 0);
  const groupID = pathfinding.getGroup(ZONE, a);
  const path = pathfinding.findPath(a, b, ZONE, groupID);
  t.ok(path, 'finds path');
  t.equal(path.length, 6, 'path contains 6 waypoints');
  t.end();
});

test('pathing near close, adjacent nodes', (t) => {
  const pathfinding = new Pathfinding();

  const geometry = new THREE.Geometry();
  // Make a geometry that looks something like ./diagrams/close-adjacent-nodes.png
  geometry.vertices.push(
    new THREE.Vector3(  0,  0,  0  ),
    new THREE.Vector3(  1,  0,  0  ),
    new THREE.Vector3(  1,  0, -1  ),
    new THREE.Vector3(  0,  0, 0.1 ),
    new THREE.Vector3(  1,  0, 0.1 )
  );
  geometry.faces.push( new THREE.Face3( 0, 1, 2 ) );
  geometry.faces.push( new THREE.Face3( 0, 3, 4 ) );
  geometry.faces.push( new THREE.Face3( 0, 4, 1 ) );

  const zone = Pathfinding.createZone(geometry);
  pathfinding.setZoneData(ZONE, zone);

  const a = new THREE.Vector3(0.1, 0, -0.1);
  const b = new THREE.Vector3(0.9, 0, -0.1);
  const groupID = pathfinding.getGroup(ZONE, a);
  const path = pathfinding.findPath(a, b, ZONE, groupID);

  t.ok(path, 'finds path');
  t.equal(path.length, 1, 'path contains 1 waypoint');

  t.end();
});

test('pathing near close nodes in a different group', (t) => {
  const pathfinding = new Pathfinding();

  const geometry = new THREE.Geometry();
  // Make a geometry that looks something like ./diagrams/close-groups.png
  geometry.vertices.push(
    new THREE.Vector3(  0,  0,  0  ),
    new THREE.Vector3(  1,  0,  0  ),
    new THREE.Vector3(  1,  0, -1  ),
    new THREE.Vector3(  0,  0, 0.1 ),
    new THREE.Vector3(  1,  0, 0.1 ),
    new THREE.Vector3(  1,  0,  2  )
  );
  geometry.faces.push( new THREE.Face3( 0, 1, 2 ) );
  geometry.faces.push( new THREE.Face3( 3, 5, 4 ) );

  const zone = Pathfinding.createZone(geometry);
  pathfinding.setZoneData(ZONE, zone);

  const a = new THREE.Vector3(0.1, 0, 0.2);
  const b = new THREE.Vector3(0.9, 0, 0.2);
  const groupID = pathfinding.getGroup(ZONE, a, true);
  const path = pathfinding.findPath(a, b, ZONE, groupID);

  t.ok(path, 'finds path');
  t.equal(path.length, 1, 'path contains 1 waypoint');

  t.end();
});

test('vertically stacked groups', (t) => {
  const pathfinding = new Pathfinding();

  const geometry = new THREE.Geometry();
  geometry.vertices.push(
    new THREE.Vector3(  0,  0,  0  ),
    new THREE.Vector3(  0,  0,  1  ),
    new THREE.Vector3(  1,  0,  0  ),
    new THREE.Vector3(  0,  1,  0  ),
    new THREE.Vector3(  0,  1,  1  ),
    new THREE.Vector3(  1,  1,  0  ),
  );
  geometry.faces.push( new THREE.Face3( 0, 1, 2 ) );
  geometry.faces.push( new THREE.Face3( 3, 4, 5 ) );

  const zone = Pathfinding.createZone(geometry);
  pathfinding.setZoneData(ZONE, zone);
  t.equal(zone.groups[1][0].centroid.y, 1, 'centroid of node in group 1 should be at y=1');

  const a = new THREE.Vector3(0.2, 1, 0.2);
  const groupID = pathfinding.getGroup(ZONE, a, true);
  t.equal(groupID, 1, 'point on node at y=1 should be in group 1');

  t.end();
});

test('does not overwrite parameters', (t) => {
  const pathfinding = new Pathfinding();
  const geometry = new THREE.RingBufferGeometry(5, 10).applyMatrix(ROTATE);
  const zone = Pathfinding.createZone(geometry);
  pathfinding.setZoneData(ZONE, zone);
  const a = new THREE.Vector3(7.5, 0.5, 0);
  const b = new THREE.Vector3(7.8, 0.5, 0);
  const groupID = pathfinding.getGroup(ZONE, a);
  const node = pathfinding.getClosestNode(a, ZONE, groupID);

  const endTarget = new THREE.Vector3();
  pathfinding.clampStep(a, b, node, ZONE, groupID, endTarget);

  roundVector(endTarget);

  t.deepEqual(endTarget, {x: 7.8, y: 0, z: 0}, 'endTarget');
  t.deepEqual(a, {x: 7.5, y: 0.5, z: 0}, 'a');
  t.deepEqual(b, { x: 7.8, y: 0.5, z: 0 }, 'b');

  t.end();
});

/**
 * Limit vector precision so tape.deepEqual works reliably.
 * @param {THREE.Vector3} v
 */
function roundVector (v) {
  v.x = Math.round( v.x * 1e5 ) / 1e5;
  v.y = Math.round(v.y * 1e5) / 1e5;
  v.z = Math.round(v.z * 1e5) / 1e5;
  return v;
}
