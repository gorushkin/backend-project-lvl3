import fs from 'fs';
import os from 'os';
import path, { dirname } from 'path';
import nock from 'nock';
import axios from 'axios';
import prettier from 'prettier';
import adapter from 'axios/lib/adapters/http';
import { fileURLToPath } from 'url';

import pageLoader from '../index';

nock.disableNetConnect();
axios.defaults.adapter = adapter;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const getFilePath = (fileName) => path.join(__dirname, '..', '/__fixtures__/', fileName);
const getFile = (name, encoding = null) => fs.readFileSync(getFilePath(name), encoding);

const url = 'https://ru.hexlet.io/courses/';
const projectName = 'ru-hexlet-io-courses';
const origin = 'https://ru.hexlet.io';
const outputDirectory = `${projectName}_files`;

const htmlData = {
  outputFilename: 'ru-hexlet-io-courses.html',
  inputFile: getFile('ru-hexlet-io-courses-input.html', 'utf-8'),
  expectedFile: getFile('ru-hexlet-io-courses-expected.html', 'utf-8'),
};

const testData = [
  {
    testName: 'test get/write img01',
    outputFilename: 'ru-hexlet-io-assets-professions-img01.jpg',
    expectedFile: getFile('ru-hexlet-io-courses-img.jpg'),
    url: '/assets/professions/img01.jpg',
  },
  {
    testName: 'test get/write img02',
    outputFilename: 'ru-hexlet-io-assets-professions-img02.jpg',
    expectedFile: getFile('ru-hexlet-io-courses-img.jpg'),
    url: '/assets/professions/img02.jpg',
  },
  {
    testName: 'test get/write css01',
    outputFilename: 'ru-hexlet-io-assets-application.css',
    expectedFile: getFile('ru-hexlet-io-courses-style.css'),
    url: '/assets/application.css',
  },
  {
    testName: 'test get/write css02',
    outputFilename: 'ru-hexlet-io-css-ma-in.css',
    expectedFile: getFile('ru-hexlet-io-courses-style.css'),
    url: '/css/ma!in.css',
  },
  {
    testName: 'test get/write js',
    outputFilename: 'ru-hexlet-io-packs-js-runtime.js',
    expectedFile: getFile('ru-hexlet-io-courses-script.js'),
    url: '/packs/js/runtime.js',
  },
];

let tempDir;
let dir;

const networkErrorTests = [
  ['Request failed with status code 500', 500],
  ['Request failed with status code 404', 404],
  ['Request failed with status code 410', 410],
];

describe('positive cases', () => {
  beforeAll(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
    nock(origin).get('/courses/').reply(200, htmlData.inputFile);
    nock(origin).get('/courses').reply(200, htmlData.inputFile);
    testData.forEach((item) => {
      nock(origin).get(item.url).reply(200, item.expectedFile);
    });
    dir = await pageLoader(tempDir, url);
  });

  test('load page', async () => {
    const resultHtml = await fs.promises.readFile(path.join(dir, `${projectName}.html`), 'utf-8');
    expect(prettier.format(resultHtml, { parser: 'html' })).toEqual(
      prettier.format(htmlData.expectedFile, { parser: 'html' }),
    );
  });

  test.each(testData.map((item) => [item.testName, item.outputFilename, item.expectedFile]))(
    '%s,',
    async (_, outputFilename, expectedFile) => {
      const outputFilePath = path.join(dir, outputDirectory, outputFilename);
      const result = await fs.promises.readFile(outputFilePath);
      expect(result).toEqual(expectedFile);
    },
  );
});

describe('network errors', () => {
  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
  });

  test.each(networkErrorTests)('%s,', async (errortext, statusCode) => {
    nock(origin).get('/courses/').reply(statusCode, htmlData.expectedFile);
    expect(pageLoader(tempDir, url)).rejects.toThrow(errortext);
  });
});

describe('file system errors', () => {
  beforeEach(async () => {
    nock(origin).get('/courses/').reply(200, htmlData.expectedFile);
  });

  test('Output folder is not exist', async () => {
    const testDir = path.join(tempDir, '/temp');
    await expect(pageLoader(testDir, url)).rejects.toThrow('Output folder does not exist');
  });

  test('Permission denied', async () => {
    await fs.promises.chmod(tempDir, 0);
    await expect(pageLoader(tempDir, url)).rejects.toThrow('Permission denied');
  });
});
