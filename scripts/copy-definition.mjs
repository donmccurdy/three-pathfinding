import { copyFile } from 'fs/promises';

await copyFile('src/three-pathfinding.d.ts', 'dist/three-pathfinding.d.ts');
