#!/usr/bin/env node
import program from 'commander';

import pageLoader from '../index.js';

program
  .version('1.0.0')
  .option('--output [type]', 'output dir', '')
  .arguments('<url>')
  .description('Page-loader')
  .action((url) => {
    pageLoader(program.output, url)
      .then((outputDir) => console.log(`Open ${outputDir}`))
      .catch(({ message }) => {
        console.error(message);
        process.exit(1);
      });
  })
  .parse(process.argv);
