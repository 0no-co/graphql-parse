import resolve from '@rollup/plugin-node-resolve';
import buble from '@rollup/plugin-buble';
import babel from 'rollup-plugin-babel';
import { terser } from 'rollup-plugin-terser';
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
    formatting: 'PRETTY_PRINT',
    compilation_level: 'SIMPLE_OPTIMIZATIONS',
  }),
  terser({
    warnings: true,
    ecma: 5,
    keep_fnames: true,
    ie8: false,
    compress: {
      pure_getters: true,
      toplevel: true,
      booleans_as_integers: false,
      keep_fnames: true,
      keep_fargs: true,
      if_return: false,
      ie8: false,
      sequences: false,
      loops: false,
      conditionals: false,
      join_vars: false,
    },
    mangle: false,
    output: {
      beautify: true,
      braces: true,
      indent_level: 2,
    },
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

