#!/usr/bin/env node
import program from 'commander';

import loadPage from '../index.js';

program
  .version('1.0.0')
  .option('-o, --output [path]', 'output dir', process.cwd())
  .arguments('<url>')
  .description('Page-loader: save web pages from internet')
  .action((url) => {
    loadPage(url, program.output)
      .then((outputDir) => console.log(`Open ${outputDir}`))
      .catch(({ message }) => {
        console.error(message);
        process.exit(1);
      });
  })
  .parse(process.argv);
