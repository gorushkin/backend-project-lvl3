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
const projectName = 'ru-hexlet-io-courses';
const inputFilename = 'ru-hexlet-io-courses--input.html';
const inputImgName = 'img.jpg';
const inputCssName = 'style.css';
const inputJsName = 'script.js';

const outputHtmlfilename = 'ru-hexlet-io-courses--output.html';
const outputImgNames = [
  'ru-hexlet-io-assets-professions-img01.jpg',
  'ru-hexlet-io-assets-professions-img02.jpg',
];
const outputCssNames = ['ru-hexlet-io-assets-application.css'];
const outputJsNames = ['ru-hexlet-io-packs-js-runtime.js'];

nock.disableNetConnect();

let tempDir;
let expectedFiles;

const tests = [
  [outputImgNames, 'expectedImg'],
  [outputCssNames, 'expectedCss'],
  [outputJsNames, 'expectedJs'],
];

beforeAll(async () => {
  expectedFiles = {
    expectedHtml: await fs.promises.readFile(getFilePath(inputFilename), 'utf-8'),
    expectedImg: await fs.promises.readFile(getFilePath(inputImgName)),
    expectedCss: await fs.promises.readFile(getFilePath(inputCssName)),
    expectedJs: await fs.promises.readFile(getFilePath(inputJsName)),
  };
});

beforeEach(async () => {
  tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));

  nock('https://ru.hexlet.io')
    .get('/courses').reply(200, expectedFiles.expectedHtml);
  nock('https://ru.hexlet.io')
    .get('/assets/professions/img01.jpg')
    .reply(200, expectedFiles.expectedImg);
  nock('https://ru.hexlet.io')
    .get('/assets/professions/img02.jpg')
    .reply(200, expectedFiles.expectedImg);
  nock('https://ru.hexlet.io')
    .get('/assets/application.css').reply(200, expectedFiles.expectedCss);
  nock('https://ru.hexlet.io')
    .get('/courses').reply(200, '');
  nock('https://ru.hexlet.io')
    .get('/packs/js/runtime.js').reply(200, expectedFiles.expectedJs);
});

test('test get/write html', async () => {
  const expectedHtml = await fs.promises.readFile(getFilePath(outputHtmlfilename), 'utf-8');

  const dir = await pageLoader(tempDir, url);
  const resultHtml = await fs.promises.readFile(path.join(dir, `${projectName}.html`), 'utf-8');
  expect(prettier.format(resultHtml, { parser: 'html' })).toEqual(
    prettier.format(expectedHtml, { parser: 'html' }),
  );
});

test.each(tests)('description', async (outputFilenames, expectedFile) => {
  const dir = await pageLoader(tempDir, url);
  const outputFilePaths = outputFilenames.map((filename) => path
    .join(dir, `${projectName}_files`, filename));
  const results = await Promise.all(
    outputFilePaths.map(async (filePath) => fs.promises.readFile(filePath)),
  );
  results.forEach((file) => {
    expect(expectedFiles[expectedFile]).toEqual(file);
  });
});
