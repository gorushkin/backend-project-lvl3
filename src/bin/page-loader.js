#!/usr/bin/env node
import program from 'commander';

import pageLoader from '../index.js';

const errorMapping = {
  ENOENT: () => console.error('Output folder is not exist'),
  ENOTFOUND: (error) => console.error(`Could not find the page - ${error.config.url}`),
  ECONNREFUSED: (error) => console.error(`Could not find the page - ${error.config.url}`),
};

program
  .version('1.0.0')
  .option('--output [type]', 'output format', '')
  .arguments('<url>')
  .description('Configuration files creator.')
  .action((url) => {
    pageLoader(program.output, url)
      .then((outputDir) => console.log(`Open ${outputDir}`))
      .catch((error) => errorMapping[error.code](error));
  })
  .parse(process.argv);
