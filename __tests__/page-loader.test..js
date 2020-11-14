import fs from 'fs';
import os from 'os';
import path from 'path';
import nock from 'nock';
import axios from 'axios';
import pageLoader from '../src';

axios.defaults.adapter = require('axios/lib/adapters/http');

const getFilePath = (fileName) => path.join(__dirname, '..', '/__fixtures__/', fileName);

const url = 'https://ru.hexlet.io/courses';
const fileName = 'ru-hexlet-io-courses.html';
const expectedResult = fs.readFileSync(getFilePath(fileName), 'utf-8');

let tempDir;

beforeEach(async () => {
  tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
});

test('test', async () => {
  nock('https://ru.hexlet.io').get('/courses').reply(200, expectedResult);

  await pageLoader(tempDir, url);
  const files = await fs.promises.readdir(tempDir);
  const result = await fs.promises.readFile(path.join(tempDir, '/', files[0]), 'utf-8');
  expect(result).toEqual(expectedResult);
});
