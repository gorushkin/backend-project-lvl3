#!/usr/bin/env node
import program from 'commander';

import pageLoader from '../index.js';

program
  .version('1.0.0')
  .option('--output [type]', 'output format', '')
  .arguments('<url>')
  .description('Configuration files creator.')
  .action((url) => {
    pageLoader(program.output, url)
      .then((outputDir) => console.log(`Open ${outputDir}`))
      .catch((error) => {
        console.error(error.message);
        process.exit(1);
      });
  })
  .parse(process.argv);
