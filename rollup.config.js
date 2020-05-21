import resolve from '@rollup/plugin-node-resolve';
import buble from '@rollup/plugin-buble';
import babel from 'rollup-plugin-babel';
import compiler from '@ampproject/rollup-plugin-closure-compiler';

const plugins = [
  resolve({
    mainFields: ['module', 'jsnext', 'main'],
    extensions: ['.js', '.ts', '.tsx'],
    browser: true,
  }),
  babel({
    babelrc: true
  }),
  buble({
    transforms: {
      unicodeRegExp: false,
      dangerousForOf: true,
      dangerousTaggedTemplateString: true,
    },
    objectAssign: 'Object.assign',
    exclude: 'node_modules/**',
  }),
  babel({
    babelrc: false,
    exclude: 'node_modules/**',
    presets: [],
    plugins: [
      '@babel/plugin-transform-object-assign',
    ],
  }),
  compiler({
    compilation_level: 'SIMPLE_OPTIMIZATIONS',
  }),
];

const output = (format = 'cjs', ext = '.js') => ({
  chunkFileNames: '[hash]' + ext,
  entryFileNames: 'graphql-parse-[name]' + ext,
  dir: './dist',
  exports: 'named',
  externalLiveBindings: false,
  sourcemap: true,
  esModule: false,
  indent: false,
  freeze: false,
  strict: false,
  format,
});

export default {
  input: {
    core: './src/index.js'
  },
  onwarn: () => {},
  external: () => false,
  treeshake: {
    propertyReadSideEffects: false,
  },
  plugins,
  output: [output('cjs', '.js'), output('esm', '.mjs')],
};

