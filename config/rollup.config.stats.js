/* eslint-disable no-console */
import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import includePaths from 'rollup-plugin-includepaths';
import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';
import progress from 'rollup-plugin-progress';
import replace from '@rollup/plugin-replace';
import visualizer from 'rollup-plugin-visualizer';

// The "stats" build is just like the "dev" build,
// but it includes the visualizer plugin to generate a statistics page (slow)

export default {
  input: './modules/id.js',
  onwarn: onWarn,
  output: {
    file: 'dist/iD.js',
    format: 'iife',
    sourcemap: true,
    strict: false
  },
  plugins: [
    progress(),
    includePaths({
      paths: ['node_modules/d3/node_modules']  // npm2 or windows
    }),
    nodeResolve({ dedupe: ['object-inspect'] }),
    commonjs({ exclude: 'modules/**' }),
    json({ indent: '' }),
    babel({
      babelHelpers: 'bundled',
      // avoid circular dependencies due to `useBuiltIns: usage` option
      exclude: [/\/core-js\//]
    }),
    replace({
      preventAssignment: true,
      'process.env.NODE_ENV': JSON.stringify( 'production' )
    }),
    visualizer({
      filename: 'docs/statistics.html',
      sourcemap: true
    })
  ]
};

function onWarn(warning, warn) {
  // skip certain warnings
  if (warning.code === 'CIRCULAR_DEPENDENCY') return;
  if (warning.code === 'EVAL') return;

  // Use default for everything else
  console.log(warning.code);
  warn(warning);
}
