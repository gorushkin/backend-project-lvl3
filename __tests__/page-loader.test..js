import fs from 'fs';
import os from 'os';
import path from 'path';
import nock from 'nock';
import axios from 'axios';
import prettier from 'prettier';
import pageLoader from '../src';

axios.defaults.adapter = require('axios/lib/adapters/http');

const getFilePath = (fileName) => path.join(__dirname, '..', '/__fixtures__/', fileName);

const url1 = 'https://ru.hexlet.io/courses';
const fileName = 'ru-hexlet-io-courses.html';
const expectedResult = fs.readFileSync(getFilePath(fileName), 'utf-8');

const prettierSettings = {
  singleQuote: true,
  semi: false,
  parser: 'html',
  printWidth: 100,
  overrides: [
    {
      files: ['**/*.css', '**/*.scss', '**/*.html'],
      options: {
        singleQuote: false,
      },
    },
  ],
};

let tempDir;

beforeEach(async () => {
  tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
});

test('test get/write html', async () => {
  nock('https://ru.hexlet.io').get('/courses').reply(200, expectedResult);
  await pageLoader(tempDir, url1);
  const files = await fs.promises.readdir(tempDir);
  const result = await fs.promises.readFile(path.join(tempDir, '/', files[0]), 'utf-8');
  expect(prettier.format(expectedResult, prettierSettings)).toEqual(
    prettier.format(result, prettierSettings),
  );
});
