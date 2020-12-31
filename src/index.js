import { URL } from 'url';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import cheerio from 'cheerio';
import debug from 'debug';
import 'axios-debug-log';
import Listr from 'listr';
import FriendlyError from './FriendlyError.js';

const log = debug('page-loader');

const appName = 'page-loader';
debug('booting %o', appName);

const elements = {
  img: 'src',
  link: 'href',
  script: 'src',
};

const convertUrlToSlugName = (url) => {
  const { host, pathname } = new URL(url);
  return `${host}${pathname}`.replace(/[^A-Za-z0-9]/g, '-').replace(/-$/i, '');
};

const createAssetsFolder = (assetsFolderPath) => fs
  .promises.mkdir(assetsFolderPath);

const getParsedDom = (targetUrl) => axios
  .get(targetUrl.href)
  .then((response) => cheerio.load(response.data, { decodeEntities: false }));

const getElementFilename = (source) => {
  const { ext, name, dir } = path.parse(source);
  const extension = ext || '.html';
  const filename = convertUrlToSlugName(path.join(dir, name));
  return `${filename}${extension}`;
};

const getSources = (parsedDom, targetUrl, assetsFolderName) => {
  const sources = Object.entries(elements).reduce((acc, [itemName, itemSrcAttribute]) => {
    const itemSources = parsedDom(itemName)
      .toArray()
      .map((item) => {
        const element = parsedDom(item);
        return { element, url: new URL(element.attr(itemSrcAttribute), targetUrl) };
      })
      .filter(({ url }) => url.origin === targetUrl.origin)
      .map(({ element, url: { href } }) => {
        const filename = getElementFilename(href);
        element.attr(itemSrcAttribute, path.join(assetsFolderName, filename));
        return { url: href, filename };
      });
    return [...acc, ...itemSources];
  }, []);
  return { page: parsedDom.html(), sources };
};

const downloadElements = (sources, assetsFolderPath) => {
  const downloadTasks = sources.map((item) => {
    log('item will be downloaded from ', item.url);
    log('item will be saved as', item.filename);
    return {
      title: item.url,
      task: () => axios
        .get(item.url, {
          responseType: 'arraybuffer',
        })
        .then((response) => {
          const itemPath = path.join(assetsFolderPath, item.filename);
          log('itemPath', itemPath);
          return fs.promises.writeFile(itemPath, response.data, 'utf-8');
        }),
    };
  });
  return new Listr(downloadTasks, { concurrent: true, exitOnError: false }).run();
};

const saveFile = (content, filePath) => fs.promises.writeFile(filePath, content, 'utf-8');

export default (url, output) => {
  const targetUrl = new URL(url);
  const pathToProject = path.resolve(process.cwd(), output || '');
  const projectName = convertUrlToSlugName(url);
  const filePath = path.join(pathToProject, `${projectName}.html`);
  const assetsFolderName = `${projectName}_files`;
  const assetsFolderPath = path.join(pathToProject, assetsFolderName);

  return getParsedDom(targetUrl)
    .then((parsedDom) => createAssetsFolder(assetsFolderPath, parsedDom).then(() => parsedDom))
    .then((parsedDom) => getSources(parsedDom, targetUrl, assetsFolderName))
    .then(({ page, sources }) => saveFile(page, filePath).then(() => sources))
    .then((sources) => downloadElements(sources, assetsFolderPath))
    .then(() => pathToProject)
    .catch((error) => {
      if (error.isAxiosError || !!error.code) {
        throw new FriendlyError(error);
      }
      throw error;
    });
};
