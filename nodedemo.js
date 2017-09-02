const THREE = require('three');
const fs = require('fs');
const Pathfinding = require('./src');

const file = __dirname + '/demo/meshes/level.nav.js';

const player = {position: new THREE.Vector3(-3.5, 0.5, 5.5)};

fs.readFile(file, 'utf8', function (err, data) {
	if (err) {
		console.log('Error: ' + err);
		return;
	}

	const jsonLoader = new THREE.JSONLoader();

	const levelMesh = jsonLoader.parse(JSON.parse(data), null);

	const zoneNodes = Pathfinding.buildNodes(levelMesh.geometry);

	Pathfinding.setZoneData('level', zoneNodes);

	const playerNavMeshGroup = Pathfinding.getGroup('level', player.position);

	const targetPosition = Pathfinding.getRandomNode('level', playerNavMeshGroup);

	const calculatedPath = Pathfinding.findPath(player.position, targetPosition, 'level', playerNavMeshGroup);

	console.log(calculatedPath);
});
