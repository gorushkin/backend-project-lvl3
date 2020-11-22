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
const inputFilename = 'ru-hexlet-io-courses--input.html';
const outputFilename = 'ru-hexlet-io-courses--output.html';
const projectName = 'ru-hexlet-io-courses';
const inputImgName = 'img.jpg';
const outputImgNames = [
  'ru-hexlet-io-assets-professions-img01.jpg',
  'ru-hexlet-io-assets-professions-img02.jpg',
];
const inputCssName = 'style.css';
const inputJsName = 'script.js';
const outputCssNames = [
  'ru-hexlet-io-assets-application.css',
];
const outputJsNames = ['ru-hexlet-io-packs-js-runtime.js'];

let tempDir;
let inputHtml;
let expectedImg;
let expectedCss;
let expectedJs;
nock.disableNetConnect();

beforeEach(async () => {
  tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
  inputHtml = await fs.promises.readFile(getFilePath(inputFilename), 'utf-8');
  expectedImg = await fs.promises.readFile(getFilePath(inputImgName));
  expectedCss = await fs.promises.readFile(getFilePath(inputCssName));
  expectedJs = await fs.promises.readFile(getFilePath(inputJsName));
  nock('https://ru.hexlet.io').get('/courses').reply(200, inputHtml);
  nock('https://ru.hexlet.io').get('/assets/professions/img01.jpg').reply(200, expectedImg);
  nock('https://ru.hexlet.io').get('/assets/professions/img02.jpg').reply(200, expectedImg);
  nock('https://ru.hexlet.io').get('/assets/application.css').reply(200, expectedCss);
  nock('https://ru.hexlet.io').get('/courses').reply(200, '');
  nock('https://ru.hexlet.io').get('/packs/js/runtime.js').reply(200, expectedJs);
});

test('test get/write html', async () => {
  const expectedHtml = await fs.promises.readFile(getFilePath(outputFilename), 'utf-8');

  const dir = await pageLoader(tempDir, url);
  const resultHtml = await fs.promises.readFile(path.join(dir, `${projectName}.html`), 'utf-8');
  expect(prettier.format(resultHtml, { parser: 'html' })).toEqual(
    prettier.format(expectedHtml, { parser: 'html' }),
  );
});

test('test get/write img', async () => {
  const dir = await pageLoader(tempDir, url);
  const imgPaths = outputImgNames.map((outputImgName) => path.join(dir, `${projectName}_files`, outputImgName));
  const results = await Promise.all(imgPaths.map(async (imgPath) => fs.promises.readFile(imgPath)));
  results.forEach((img) => {
    expect(expectedImg).toEqual(img);
  });
});

test('test get/write css', async () => {
  const dir = await pageLoader(tempDir, url);
  const cssPaths = outputCssNames.map((outputCssName) => path.join(dir, `${projectName}_files`, outputCssName));
  const results = await Promise.all(cssPaths.map(async (cssPath) => fs.promises.readFile(cssPath)));
  results.forEach((css) => {
    expect(expectedCss).toEqual(css);
  });
});

test('test get/write js', async () => {
  const dir = await pageLoader(tempDir, url);
  const jsPaths = outputJsNames.map((outputJsName) => path.join(dir, `${projectName}_files`, outputJsName));
  const results = await Promise.all(jsPaths.map(async (jsPath) => fs.promises.readFile(jsPath)));
  results.forEach((js) => {
    expect(expectedJs).toEqual(js);
  });
});
