#!/usr/bin/env node
import program from 'commander';

import { version } from '../../package.json';
import pageLoader from '..';

program
  .version(version)
  .option('--output [type]', 'output format', '')
  .arguments('<url>')
  .description('Configuration files creator.')
  .action((url) => {
    pageLoader(program.output, url);
  })
  .parse(process.argv);
