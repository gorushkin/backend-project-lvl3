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

import pageLoader from '../src';

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
    dir: '',
    url: '/courses/',
    encoding: 'utf-8',
    format: (file) => prettier.format(file, { parser: 'html' }),
  },
  html02: {
    testName: 'test get/write html02',
    outputFilename: 'ru-hexlet-io-courses.html',
    inputFile: getFile('ru-hexlet-io-courses-input.html'),
    expectedFile: getFile('ru-hexlet-io-courses-input.html'),
    dir: `${projectName}_files`,
    url: '/courses',
    encoding: 'utf-8',
    format: (file) => file,
  },
  img01: {
    testName: 'test get/write img01',
    outputFilename: 'ru-hexlet-io-assets-professions-img01.jpg',
    inputFile: getFile('ru-hexlet-io-courses-img.jpg', null),
    expectedFile: getFile('ru-hexlet-io-courses-img.jpg', null),
    dir: `${projectName}_files`,
    url: '/assets/professions/img01.jpg',
    encoding: null,
    format: (file) => file,
  },
  img02: {
    testName: 'test get/write img02',
    outputFilename: 'ru-hexlet-io-assets-professions-img02.jpg',
    inputFile: getFile('ru-hexlet-io-courses-img.jpg', null),
    expectedFile: getFile('ru-hexlet-io-courses-img.jpg', null),
    dir: `${projectName}_files`,
    url: '/assets/professions/img02.jpg',
    encoding: null,
    format: (file) => file,
  },
  css01: {
    testName: 'test get/write css01',
    outputFilename: 'ru-hexlet-io-assets-application.css',
    inputFile: getFile('ru-hexlet-io-courses-style.css'),
    expectedFile: getFile('ru-hexlet-io-courses-style.css'),
    dir: `${projectName}_files`,
    url: '/assets/application.css',
    encoding: 'utf-8',
    format: (file) => file,
  },
  css02: {
    testName: 'test get/write css02',
    outputFilename: 'ru-hexlet-io-css-ma-in.css',
    inputFile: getFile('ru-hexlet-io-courses-style.css'),
    expectedFile: getFile('ru-hexlet-io-courses-style.css'),
    dir: `${projectName}_files`,
    url: '/css/ma!in.css',
    encoding: 'utf-8',
    format: (file) => file,
  },
  js: {
    testName: 'test get/write js',
    outputFilename: 'ru-hexlet-io-packs-js-runtime.js',
    inputFile: getFile('ru-hexlet-io-courses-script.js'),
    expectedFile: getFile('ru-hexlet-io-courses-script.js'),
    dir: `${projectName}_files`,
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
  item.dir,
  item.encoding,
  item.format,
]);

describe('successful tests', () => {
  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));

    Object.values(testData).forEach((item) => {
      nock(origin).get(item.url).reply(200, item.inputFile);
    });
  });

  test.each(tests)('%s,', async (_, outputFilename, expectedFile, outputDir, encoding, format) => {
    const dir = await pageLoader(tempDir, url);
    const outputFilePath = path.join(dir, outputDir, outputFilename);
    const result = await fs.promises.readFile(outputFilePath, encoding);
    expect(format(result)).toEqual(format(expectedFile));
  });
});
