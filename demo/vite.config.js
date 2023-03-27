import { resolve } from 'path';

export default {
	root: 'demo',
	publicDir: './assets',
	resolve: { alias: { 'three-pathfinding': '../' } },
	build: {
		rollupOptions: {
			input: {
				index: resolve(__dirname, 'index.html'),
				teleport: resolve(__dirname, 'teleport.html'),
			},
		},
	},
};
