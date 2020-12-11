import fs from 'fs';
import os from 'os';
import path, {
  dirname,
} from 'path';
import nock from 'nock';
import axios from 'axios';
import prettier from 'prettier';
import adapter from 'axios/lib/adapters/http';
import {
  fileURLToPath,
} from 'url';

import pageLoader from '../index';

nock.disableNetConnect();
axios.defaults.adapter = adapter;

const __filename = fileURLToPath(
  import.meta.url,
);
const __dirname = dirname(__filename);
const getFilePath = (fileName) => path.join(__dirname, '..', '/__fixtures__/', fileName);
const getFile = (name, encoding = 'utf-8') => fs.readFileSync(getFilePath(name), encoding);

const url = 'https://ru.hexlet.io/courses/';
const projectName = 'ru-hexlet-io-courses';
const origin = 'https://ru.hexlet.io';

const testData = {
  html01: {
    testName: 'test get/write html01',
    outputFilename: 'ru-hexlet-io-courses.html',
    inputFile: getFile('ru-hexlet-io-courses-input.html'),
    expectedFile: getFile('ru-hexlet-io-courses-expected.html'),
    outputDirectory: '',
    url: '/courses/',
    encoding: 'utf-8',
    format: (file) => prettier.format(file, { parser: 'html' }),
  },
  html02: {
    testName: 'test get/write html02',
    outputFilename: 'ru-hexlet-io-courses.html',
    inputFile: getFile('ru-hexlet-io-courses-input.html'),
    expectedFile: getFile('ru-hexlet-io-courses-input.html'),
    outputDirectory: `${projectName}_files`,
    url: '/courses',
    encoding: 'utf-8',
    format: (file) => file,
  },
  img01: {
    testName: 'test get/write img01',
    outputFilename: 'ru-hexlet-io-assets-professions-img01.jpg',
    inputFile: getFile('ru-hexlet-io-courses-img.jpg', null),
    expectedFile: getFile('ru-hexlet-io-courses-img.jpg', null),
    outputDirectory: `${projectName}_files`,
    url: '/assets/professions/img01.jpg',
    encoding: null,
    format: (file) => file,
  },
  img02: {
    testName: 'test get/write img02',
    outputFilename: 'ru-hexlet-io-assets-professions-img02.jpg',
    inputFile: getFile('ru-hexlet-io-courses-img.jpg', null),
    expectedFile: getFile('ru-hexlet-io-courses-img.jpg', null),
    outputDirectory: `${projectName}_files`,
    url: '/assets/professions/img02.jpg',
    encoding: null,
    format: (file) => file,
  },
  css01: {
    testName: 'test get/write css01',
    outputFilename: 'ru-hexlet-io-assets-application.css',
    inputFile: getFile('ru-hexlet-io-courses-style.css'),
    expectedFile: getFile('ru-hexlet-io-courses-style.css'),
    outputDirectory: `${projectName}_files`,
    url: '/assets/application.css',
    encoding: 'utf-8',
    format: (file) => file,
  },
  css02: {
    testName: 'test get/write css02',
    outputFilename: 'ru-hexlet-io-css-ma-in.css',
    inputFile: getFile('ru-hexlet-io-courses-style.css'),
    expectedFile: getFile('ru-hexlet-io-courses-style.css'),
    outputDirectory: `${projectName}_files`,
    url: '/css/ma!in.css',
    encoding: 'utf-8',
    format: (file) => file,
  },
  js: {
    testName: 'test get/write js',
    outputFilename: 'ru-hexlet-io-packs-js-runtime.js',
    inputFile: getFile('ru-hexlet-io-courses-script.js'),
    expectedFile: getFile('ru-hexlet-io-courses-script.js'),
    outputDirectory: `${projectName}_files`,
    url: '/packs/js/runtime.js',
    encoding: 'utf-8',
    format: (file) => file,
  },
};

let tempDir;

const tests = Object.values(testData).map((item) => [
  item.testName,
  item.outputFilename,
  item.expectedFile,
  item.outputDirectory,
  item.encoding,
  item.format,
]);

const networkErrorTests = [
  ['Request failed with status code 500', 500],
  ['Request failed with status code 404', 404],
  ['Request failed with status code 410', 410],
];

describe('successful tests', () => {
  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));

    Object.values(testData).forEach((item) => {
      nock(origin).get(item.url).reply(200, item.inputFile);
    });
  });

  test.each(tests)(
    '%s,',
    async (_, outputFilename, expectedFile, outputDirectory, encoding, format) => {
      const dir = await pageLoader(tempDir, url);
      const outputFilePath = path.join(dir, outputDirectory, outputFilename);
      const result = await fs.promises.readFile(outputFilePath, encoding);
      expect(format(result)).toEqual(format(expectedFile));
    },
  );
});

describe('file system errors', () => {
  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
    nock(origin).get('/courses/').reply(200, testData.html01.expectedFile);
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

describe('network errors', () => {
  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
  });

  test.each(networkErrorTests)('%s,', async (errortext, statusCode) => {
    nock(origin).get('/courses/').reply(statusCode, testData.html01.expectedFile);
    expect(pageLoader(tempDir, url)).rejects.toThrow(errortext);
  });
});
