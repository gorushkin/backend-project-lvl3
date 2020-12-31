import fs from 'fs';
import os from 'os';
import path, { dirname } from 'path';
import nock from 'nock';
import axios from 'axios';
import adapter from 'axios/lib/adapters/http';
import { fileURLToPath } from 'url';

import pageLoader from '..';

nock.disableNetConnect();
axios.defaults.adapter = adapter;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const getFilePath = (fileName) => path.join(__dirname, '..', '__fixtures__', fileName);
const getFile = (name, encoding = null) => fs.readFileSync(getFilePath(name), encoding);

const { href: url, origin, pathname } = new URL('https://ru.hexlet.io/courses');
const projectName = 'ru-hexlet-io-courses';
const outputDirectory = `${projectName}_files`;

const htmlData = {
  expextedFilePath: 'ru-hexlet-io-courses.html',
  inputFile: getFile('ru-hexlet-io-courses-input.html', 'utf-8'),
  expectedData: getFile('ru-hexlet-io-courses-expected.html', 'utf-8'),
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
    nock.cleanAll();
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
    nock(origin).get(pathname).twice().reply(200, htmlData.inputFile);
    testData.forEach((item) => {
      nock(origin).get(item.url).reply(200, item.expectedFile);
    });
    dir = await pageLoader(url, tempDir);
  });

  test('load page', async () => {
    const resultHtml = await fs.promises.readFile(path.join(dir, `${projectName}.html`), 'utf-8');
    expect(resultHtml.trim()).toEqual(htmlData.expectedData.trim());
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

describe('file system errors', () => {
  beforeEach(async () => {
    nock.cleanAll();
    nock(origin).get(pathname).reply(200, htmlData.expectedData);
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
  });

  test('Output folder is not exist', async () => {
    const testDir = path.join(tempDir, '/temp');
    await expect(pageLoader(url, testDir)).rejects.toThrow(/ENOENT/);
  });

  test('Permission denied', async () => {
    await fs.promises.chmod(tempDir, 0);
    await expect(pageLoader(url, tempDir)).rejects.toThrow(/EACCES/);
  });
});

describe('network errors', () => {
  beforeEach(async () => {
    nock.cleanAll();
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
  });

  test.each(networkErrorTests)('%s,', async (errortext, statusCode) => {
    nock(origin).get(pathname).reply(statusCode);
    await expect(pageLoader(url, tempDir)).rejects.toThrow(new RegExp(statusCode));
  });
});
