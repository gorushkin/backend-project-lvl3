import axios from 'axios';
import fs from 'fs';
import path from 'path';
import cheerio from 'cheerio';
import debug from 'debug';
import 'axios-debug-log';

const log = debug('page-loader');

const appName = 'page-loader';
debug('booting %o', appName);

const elements = {
  img: 'src',
  link: 'href',
  script: 'src',
};

const updateName = (url) => {
  const { host, pathname } = new URL(url);
  return (`${host}${pathname}`).replace(/[^A-Za-z0-9]/g, '-').replace(/-$/i, '');
};

const createAssetsFolder = (assetsFolderPath) => fs
  .promises.access(assetsFolderPath)
  .then(() => console.log('Folder exists'))
  .catch(() => {
    log('assets folder does not exist');
    return fs.promises.mkdir(assetsFolderPath);
  });

const getHtmlFile = (targetUrl) => axios
  .get(targetUrl.href)
  .then((response) => cheerio.load(response.data, { decodeEntities: false }));

const getElementFilename = (source) => {
  const { ext, name } = path.parse(source);
  const extension = ext || '.html';
  const namePrefix = updateName(path.dirname(source));
  return `${namePrefix}-${name}${extension}`;
};

const isSourceLocal = (source, url) => (new URL(source, url.href)).origin === url.origin;

const getSources = (html, url, assetsFolderName) => {
  const sources = Object.entries(elements).reduce((acc, [itemName, itemSrcAttribute]) => {
    const itemSources = html(itemName)
      .toArray()
      .map((item) => {
        const source = (new URL(html(item).attr(itemSrcAttribute), url.href)).href;
        const filename = getElementFilename(source);
        return {
          ...item,
          source,
          filename,
          tag: itemSrcAttribute,
          url: path.join(assetsFolderName, filename),
        };
      })
      .filter(({ source }) => isSourceLocal(source, url));
    return [...acc, ...itemSources];
  }, []);
  return [html, sources];
};

const downloadElements = (html, sources, folderPath, filePath) => {
  const promises = sources.map((item) => {
    log('dom element name', html(item).attr(item.tag));
    log('item.source', item.source);
    log('item.filename', item.filename);
    html(item).attr(item.tag, item.url);
    return axios
      .get(item.source, {
        responseType: 'arraybuffer',
      })
      .then((response) => {
        const itemPath = path.join(folderPath, item.filename);
        log('itemPath', itemPath);
        return fs.promises.writeFile(itemPath, response.data, 'utf-8').catch(console.error);
      });
  });
  return fs.promises.writeFile(filePath, html.html(), 'utf-8').then(() => Promise.all(promises));
};

export default (output, url) => {
  const targetUrl = new URL(url);
  const pathToProject = path.resolve(process.cwd(), output);
  const projectName = updateName(url);
  const filePath = path.join(pathToProject, `${projectName}.html`);
  const assetsFolderName = `${projectName}_files`;
  const assetsFolderPath = path.join(pathToProject, assetsFolderName);

  return createAssetsFolder(assetsFolderPath)
    .then(() => getHtmlFile(targetUrl))
    .then((html) => getSources(html, targetUrl, assetsFolderName))
    .then(([html, sources]) => downloadElements(html, sources, assetsFolderPath, filePath))
    .then(() => pathToProject)
    .catch(console.error);
};
