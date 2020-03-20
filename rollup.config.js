import buble from 'rollup-plugin-buble';
import resolve from '@rollup/plugin-node-resolve';
import {terser} from 'rollup-plugin-terser';

const input = './src/index.js';
const external = [ 'three' ];
const distDir = 'dist/';

export default [
    {
		input,
        external,
		plugins: [],
		output: {
            format: 'iife',
            file: `${ distDir }three-pathfinding.js`,
            // minify
            plugins: [ terser() ],
            globals: {
                three: "THREE"
            },
            sourcemap: true,
        }
	},
	{
        input,
        external,
		plugins: [],
        globals: {
            three: "THREE"
        },
		output: {
            format: 'cjs',
            file: `${ distDir }three-pathfinding.cjs.js`,
            sourcemap: true,
            indent: '\t'
        }
    },
	{
        input,
        external,
		output: {
            format: 'umd',
            name: 'pathfinding',
            file: `${ distDir }three-pathfinding.umd.js`,
            globals: {
                three: "THREE"
            },
            sourcemap: true,
            indent: '\t'
        },
		plugins: [
			buble( {
				transforms: {
                    arrow: false,
                    dangerousForOf: true,
					classes: true
				}
			} )
		],
	},
	{
		input,
		plugins: [],
		output: {
            sourcemap: true,
            format: 'esm',
            file: `${ distDir }three-pathfinding.module.js`,
            sourcemap: true,
            indent: '\t'
        }
	}
];