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
  return (`${host}${pathname}`).replace(/[^A-Za-z0-9]/g, '-').replace(/-$/i, '');
};

const createAssetsFolder = (assetsFolderPath, html) => fs
  .promises.mkdir(assetsFolderPath).then(() => html);

const getHtmlFile = (targetUrl) => axios
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
      .map((item) => ({ item, url: new URL(parsedDom(item).attr(itemSrcAttribute), targetUrl) }))
      .filter(({ url }) => url.origin === targetUrl)
      .map(({ item, url: { href } }) => {
        const filename = getElementFilename(href);
        parsedDom(item).attr(itemSrcAttribute, path.join(assetsFolderName, filename));
        return { url: href, filename };
      });
    return [...acc, ...itemSources];
  }, []);
  return [parsedDom, sources];
};

const downloadElements = (parsedDom, sources, filePath, assetsFolderPath) => {
  const downloadTasks = new Listr(sources.map((item) => {
    log('item.url', item.url);
    log('item.filename', item.filename);
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
        })
        .catch((error) => console.log(`Could not download ${error.config.url}.Got response ${error.message}`)),
    };
  }), { concurrent: true });
  return fs.promises.writeFile(filePath, parsedDom.html(), 'utf-8').then(() => downloadTasks.run());
};

export default (output, url) => {
  const targetUrl = new URL(url);
  const pathToProject = path.resolve(process.cwd(), output);
  const projectName = convertUrlToSlugName(url);
  const filePath = path.join(pathToProject, `${projectName}.html`);
  const assetsFolderName = `${projectName}_files`;
  const assetsFolderPath = path.join(pathToProject, assetsFolderName);

  return getHtmlFile(targetUrl)
    .then((parsedDom) => createAssetsFolder(assetsFolderPath, parsedDom))
    .then((parsedDom) => getSources(
      parsedDom,
      targetUrl.origin,
      assetsFolderName,
    ))
    .then(([parsedDom, sources]) => downloadElements(
      parsedDom,
      sources,
      filePath,
      assetsFolderPath,
    ))
    .then(() => pathToProject)
    .catch((error) => {
      throw new FriendlyError(error);
    });
};
