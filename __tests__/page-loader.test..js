/* eslint-disable no-underscore-dangle */
import fs from 'fs';
import os from 'os';
import path, { dirname } from 'path';
import nock from 'nock';
import axios from 'axios';
import prettier from 'prettier';
import adapter from 'axios/lib/adapters/http';
import { fileURLToPath } from 'url';

import pageLoader from '../src';

axios.defaults.adapter = adapter;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const getFilePath = (fileName) => path.join(__dirname, '..', '/__fixtures__/', fileName);

const url = 'https://ru.hexlet.io/courses';
const originalFileName = 'ru-hexlet-io-courses.html';
const updatedFileName = 'ru-hexlet-io-courses--updated.html';
const projectName = 'ru-hexlet-io-courses';
const imgName = 'img.jpg';

let tempDir;
let originalHtml;
nock.disableNetConnect();

beforeEach(async () => {
  tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
  originalHtml = await fs.promises.readFile(getFilePath(originalFileName), 'utf-8');
});

test('test get/write img', async () => {
  const expectedImg = await fs.promises.readFile(getFilePath(imgName));
  nock('https://ru.hexlet.io').get('/courses').reply(200, originalHtml);
  nock('https://ru.hexlet.io').get('/courses/assets/professions/img.jpg').reply(200, expectedImg);

  const dir = await pageLoader(tempDir, url);
  const imgPath = path.join(dir, `${projectName}_files`, imgName);
  const resultImg = await fs.promises.readFile(imgPath);
  expect(expectedImg).toEqual(resultImg);
});

test('test get/write html', async () => {
  const updatedHtml = await fs.promises.readFile(getFilePath(updatedFileName), 'utf-8');
  nock('https://ru.hexlet.io').get('/courses').reply(200, originalHtml);
  nock('https://ru.hexlet.io').get('/courses/assets/professions/img.jpg').reply(200, 'test');

  const dir = await pageLoader(tempDir, url);
  const resultHtml = await fs.promises.readFile(path.join(dir, `${projectName}.html`), 'utf-8');
  expect(prettier.format(resultHtml, { parser: 'html' })).toEqual(
    prettier.format(updatedHtml, { parser: 'html' }),
  );
});
