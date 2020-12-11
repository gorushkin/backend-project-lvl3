#!/usr/bin/env node
import program from 'commander';

import pageLoader from '../index.js';

program
  .version('1.0.0')
  .option('-o, --output [path]', 'output dir', process.cwd())
  .arguments('<url>')
  .description('Page-loader: save web pages from internet')
  .action((url) => {
    pageLoader(program.output, url)
      .then((outputDir) => console.log(`Open ${outputDir}`))
      .catch(({ message }) => {
        console.error(message);
        process.exit(1);
      });
  })
  .parse(process.argv);
