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
const origin = 'https://ru.hexlet.io';

const testData2 = {
  html: {
    testName: 'test get/write html',
    outputFilenames: 'ru-hexlet-io-courses-expected.html',
    inputFile: fs.readFileSync(getFilePath('ru-hexlet-io-courses-input.html'), 'utf-8'),
    url: '/courses/',
  },
  img: {
    testName: 'test get/write img',
    outputFilenames: [
      'ru-hexlet-io-assets-professions-img01.jpg',
      'ru-hexlet-io-assets-professions-img02.jpg',
    ],
    inputFile: getFile('ru-hexlet-io-courses-img.jpg'),
  },
  css: {
    testName: 'test get/write css',
    outputFilenames: ['ru-hexlet-io-assets-application.css', 'ru-hexlet-io-css-ma-in.css'],
    inputFile: getFile('ru-hexlet-io-courses-style.css'),
  },
  js: {
    testName: 'test get/write js',
    outputFilenames: ['ru-hexlet-io-packs-js-runtime.js'],
    inputFile: getFile('ru-hexlet-io-courses-script.js'),
  },
};

const testData = {
  html01: {
    testName: 'test get/write html',
    outputFilenames: 'ru-hexlet-io-courses-expected.html',
    inputFile: fs.readFileSync(getFilePath('ru-hexlet-io-courses-input.html'), 'utf-8'),
    url: '/courses/',
  },
  html02: {
    testName: 'test get/write html',
    outputFilenames: 'ru-hexlet-io-courses-expected.html',
    inputFile: fs.readFileSync(getFilePath('ru-hexlet-io-courses-input.html'), 'utf-8'),
    url: '/courses',
  },
  img01: {
    testName: 'test get/write img',
    outputFilenames: 'ru-hexlet-io-assets-professions-img01.jpg',
    inputFile: getFile('ru-hexlet-io-courses-img.jpg'),
    url: '/assets/professions/img01.jpg',
  },
  img02: {
    testName: 'test get/write img',
    outputFilenames: 'ru-hexlet-io-assets-professions-img02.jpg',
    inputFile: getFile('ru-hexlet-io-courses-img.jpg'),
    url: '/assets/professions/img02.jpg',
  },
  css01: {
    testName: 'test get/write css',
    outputFilenames: 'ru-hexlet-io-assets-application.css',
    inputFile: getFile('ru-hexlet-io-courses-style.css'),
    url: '/assets/application.css',
  },
  css02: {
    testName: 'test get/write css',
    outputFilenames: 'ru-hexlet-io-css-ma-in.css',
    inputFile: getFile('ru-hexlet-io-courses-style.css'),
    url: '/css/ma!in.css',
  },
  js: {
    testName: 'test get/write js',
    outputFilenames: 'ru-hexlet-io-packs-js-runtime.js',
    inputFile: getFile('ru-hexlet-io-courses-script.js'),
    url: '/packs/js/runtime.js',
  },
};

const networkErrorNames = [
  ['Request failed with status code 500', 500],
  ['Request failed with status code 404', 404],
  ['Request failed with status code 410', 410],
];

let tempDir;

// const tests = ['img', 'css', 'js'].map((format) => [
//   testData[format].testName,
//   testData[format].outputFilenames,
//   testData[format].inputFile,
// ]);

describe('successful tests', () => {
  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));

    Object.values(testData).forEach((item) => {
      nock(origin).get(item.url).reply(200, item.inputFile);
    })

  });

  test('test get/write html', async () => {
    const expectedHtml = await fs.promises.readFile(
      getFilePath(testData.html01.outputFilenames),
      'utf-8'
    );

    const dir = await pageLoader(tempDir, url);
    const resultHtml = await fs.promises.readFile(path.join(dir, `${projectName}.html`), 'utf-8');
    expect(prettier.format(resultHtml, { parser: 'html' })).toEqual(
      prettier.format(expectedHtml, { parser: 'html' })
    );
  });

  // test.each(tests)('%s,', async (_, outputFilenames, expectedFile) => {
  //   const dir = await pageLoader(tempDir, url);
  //   const outputFilePaths = outputFilenames.map((filename) => path.join(dir, `${projectName}_files`, filename));
  //   const results = await Promise.all(
  //     outputFilePaths.map(async (filePath) => fs.promises.readFile(filePath)),
  //   );
  //   results.forEach((file) => {
  //     expect(expectedFile).toEqual(file);
  //   });
  // });

    test.each(tests)('%s,', async (_, outputFilenames, expectedFile) => {
    const dir = await pageLoader(tempDir, url);
    const outputFilePaths = outputFilenames.map((filename) => path.join(dir, `${projectName}_files`, filename));
    const results = await Promise.all(
      outputFilePaths.map(async (filePath) => fs.promises.readFile(filePath)),
    );
    results.forEach((file) => {
      expect(expectedFile).toEqual(file);
    });
  });
});

describe.skip('system errors', () => {
  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
    nock(origin).get('/courses/').reply(200, testData.html.expectedFile);
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

describe.skip('network errors', () => {
  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
  });

  test.each(networkErrorNames)('%s,', async (errortext, statusCode) => {
    nock(origin).get('/courses/').reply(statusCode, testData.html.expectedFile);
    await fs.promises.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
    expect(pageLoader(tempDir, url)).rejects.toThrow(errortext);
  });
});
