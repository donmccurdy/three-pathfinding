const THREE = global.THREE = require('three');
const { Pathfinding } = require('../');
const test = require('tape');

const ZONE = 'level';
const ROTATE = new THREE.Matrix4()
  .makeRotationAxis(new THREE.Vector3(1, 0, 0), Math.PI / 4);

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
