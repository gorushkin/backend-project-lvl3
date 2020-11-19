#!/usr/bin/env node
import program from 'commander';

// import { version } from '../../package.json';
// eslint-disable-next-line import/extensions
import pageLoader from '../index.js';

program
  .version('1.0.0')
  .option('--output [type]', 'output format', '')
  .arguments('<url>')
  .description('Configuration files creator.')
  .action((url) => {
    pageLoader(program.output, url);
  })
  .parse(process.argv);
