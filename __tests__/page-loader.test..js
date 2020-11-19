import fs from 'fs';
import os from 'os';
import path from 'path';
import nock from 'nock';
import axios from 'axios';
import prettier from 'prettier';
import pageLoader from '../src';

axios.defaults.adapter = require('axios/lib/adapters/http');

const getFilePath = (fileName) => path.join(__dirname, '..', '/__fixtures__/', fileName);

const url = 'https://ru.hexlet.io/courses';
const fileName1 = 'ru-hexlet-io-courses-01.html';
const originalFileName02 = 'ru-hexlet-io-courses-02.html';
const updatedFileName02 = 'ru-hexlet-io-courses-02--updated.html';
const projectName = 'ru-hexlet-io-courses';
const imgName = 'img.jpg';

let tempDir;

beforeEach(async () => {
  tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
});

test('test get/write html', async () => {
  const expectedHtml = await fs.promises.readFile(getFilePath(fileName1), 'utf-8');
  nock('https://ru.hexlet.io').get('/courses').reply(200, expectedHtml);
  const dir = await pageLoader(tempDir, url);
  const result = await fs.promises.readFile(
    path.join(dir, `${projectName}.html`),
    'utf-8',
  );
  expect(prettier.format(expectedHtml, { parser: 'html' })).toEqual(
    prettier.format(result, { parser: 'html' }),
  );
});

test('test get/write img', async () => {
  const originalHtml = await fs.promises.readFile(getFilePath(originalFileName02), 'utf-8');
  const expectedImg = await fs.promises.readFile(getFilePath(imgName));
  nock('https://ru.hexlet.io').get('/courses').reply(200, originalHtml);
  nock('https://ru.hexlet.io').get('/courses/assets/professions/img.jpg').reply(200, expectedImg);
  const dir = await pageLoader(tempDir, url);
  const imgPath = path.join(dir, `${projectName}_files`, imgName);
  const resultImg = await fs.promises.readFile(imgPath);
  expect(expectedImg).toEqual(resultImg);
});

test('change html', async () => {
  const originalHtml = await fs.promises.readFile(getFilePath(originalFileName02), 'utf-8');
  const updatedHtml = await fs.promises.readFile(getFilePath(updatedFileName02), 'utf-8');
  nock('https://ru.hexlet.io').get('/courses').reply(200, originalHtml);
  nock('https://ru.hexlet.io').get('/courses/assets/professions/img.jpg').reply(200, 'test');

  const dir = await pageLoader(tempDir, url);
  const resultHtml = await fs.promises.readFile(
    path.join(dir, `${projectName}.html`),
    'utf-8',
  );
  expect(prettier.format(resultHtml, { parser: 'html' })).toEqual(
    prettier.format(updatedHtml, { parser: 'html' }),
  );
});
