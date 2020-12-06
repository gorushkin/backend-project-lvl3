import fs from 'fs';
import os from 'os';
import path, { dirname } from 'path';
import nock from 'nock';
import axios from 'axios';
import prettier from 'prettier';
import adapter from 'axios/lib/adapters/http';
import { fileURLToPath } from 'url';

import pageLoader from '../src';

nock.disableNetConnect();
axios.defaults.adapter = adapter;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const getFilePath = (fileName) => path.join(__dirname, '..', '/__fixtures__/', fileName);
const getFile = (name) => fs.readFileSync(getFilePath(name));

const url = 'https://ru.hexlet.io/courses/';
const projectName = 'ru-hexlet-io-courses';

const testData = {
  html: {
    testName: 'test get/write html',
    outputFilenames: 'ru-hexlet-io-courses--expected.html',
    expectedFile: fs.readFileSync(getFilePath('ru-hexlet-io-courses--input.html'), 'utf-8'),
  },
  img: {
    testName: 'test get/write img',
    outputFilenames: [
      'ru-hexlet-io-assets-professions-img01.jpg',
      'ru-hexlet-io-assets-professions-img02.jpg',
    ],
    expectedFile: getFile('img.jpg'),
  },
  css: {
    testName: 'test get/write css',
    outputFilenames: [
      'ru-hexlet-io-assets-application.css',
      'ru-hexlet-io-css-ma-in.css',
    ],
    expectedFile: getFile('style.css'),

  },
  js: {
    testName: 'test get/write js',
    outputFilenames: ['ru-hexlet-io-packs-js-runtime.js'],
    expectedFile: getFile('script.js'),
  },
};

const errorTestsData = [
  ['The server has encountered a situation it doesn\'t know how to handle', 500],
  ['The server can not find requested resource', 404],
  ['Request failed with status code 410', 410],
];

let tempDir;

const tests = ['img', 'css', 'js'].map((format) => [testData[format].testName, testData[format].outputFilenames, testData[format].expectedFile]);

describe('successful tests', () => {
  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));

    nock('https://ru.hexlet.io/')
      .get('/courses/').reply(200, testData.html.expectedFile);
    nock('https://ru.hexlet.io/')
      .get('/assets/professions/img01.jpg')
      .reply(200, testData.img.expectedFile);
    nock('https://ru.hexlet.io/')
      .get('/assets/professions/img02.jpg')
      .reply(200, testData.img.expectedFile);
    nock('https://ru.hexlet.io/')
      .get('/assets/application.css').reply(200, testData.css.expectedFile);
    nock('https://ru.hexlet.io/')
      .get('/css/ma!in.css').reply(200, testData.css.expectedFile);
    nock('https://ru.hexlet.io/')
      .get('/courses').reply(200, '');
    nock('https://ru.hexlet.io/')
      .get('/packs/js/runtime.js').reply(200, testData.js.expectedFile);
  });

  test(testData.html.testName, async () => {
    const expectedHtml = await fs.promises.readFile(getFilePath(testData.html.outputFilenames), 'utf-8');

    const dir = await pageLoader(tempDir, url);
    const resultHtml = await fs.promises.readFile(path.join(dir, `${projectName}.html`), 'utf-8');
    expect(prettier.format(resultHtml, { parser: 'html' })).toEqual(
      prettier.format(expectedHtml, { parser: 'html' }),
    );
  });

  test.each(tests)('%s,', async (_, outputFilenames, expectedFile) => {
    const dir = await pageLoader(tempDir, url);
    const outputFilePaths = outputFilenames.map((filename) => path
      .join(dir, `${projectName}_files`, filename));
    const results = await Promise.all(
      outputFilePaths.map(async (filePath) => fs.promises.readFile(filePath)),
    );
    results.forEach((file) => {
      expect(expectedFile).toEqual(file);
    });
  });
});

describe('unsuccessful tests', () => {
  test('Output folder is not exist', async () => {
    tempDir = '/tmp/tmp2/';

    nock('https://ru.hexlet.io/')
      .get('/courses/').reply(200, testData.html.expectedFile);

    await expect(pageLoader(tempDir, url)).rejects.toThrow('Output folder does not exist');
  });

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
  });

  test('Permission denied', async () => {
    nock('https://ru.hexlet.io/')
      .get('/courses/').reply(200, testData.html.expectedFile);

    await fs.promises.chmod(tempDir, 0);
    await expect(pageLoader(tempDir, url)).rejects.toThrow('Permission denied');
  });

  test.each(errorTestsData)('%s,', async (errortext, statusCode) => {
    nock('https://ru.hexlet.io/')
      .get('/courses/').reply(statusCode, testData.html.expectedFile);

    await fs.promises.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
    expect(pageLoader(tempDir, url)).rejects.toThrow(errortext);
  });
});
