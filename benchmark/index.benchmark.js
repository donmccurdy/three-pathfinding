const THREE = global.THREE = require('three');
const { Pathfinding } = require('../');
const process = require('process');

const NS_PER_SEC = 1e9;
const NS_PER_MS = 1e6;

function formatElapsed(ns) {
  return `${(ns / NS_PER_MS).toFixed(2)}ms`;
}

function run(name, func, iterations) {
  const times = [];
  for (let i = 0; i < iterations; i++) {
    let start = process.hrtime();
	func();
    let elapsed = process.hrtime(start);
    times.push(elapsed[0] * NS_PER_SEC + elapsed[1]);
  }

  const min = Math.min.apply(null, times);
  const max = Math.max.apply(null, times);
  const avg = times.reduce(((t, acc) => t + acc), 0) / iterations;
  console.log(`${name}: min=${formatElapsed(min)} max=${formatElapsed(max)} avg=${formatElapsed(avg)}`);
}

const geometry = new THREE.RingBufferGeometry(5, 20, 50, 20);

run('Build navmesh', () => {
  const zone = Pathfinding.createZone(geometry);
}, 100);
