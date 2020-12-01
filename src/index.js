import axios from 'axios';
import fs from 'fs';
import path from 'path';
import cheerio from 'cheerio';

const elements = {
  img: 'src',
  link: 'href',
  script: 'src',
};

const getSlugName = (url) => {
  const { host, pathname } = new URL(url);
  return (`${host}${pathname}`).replace(/[^A-Za-z0-9]/g, '-').replace(/-$/i, '');
};

const createAssetsFolder = (assetsFolderPath) => fs
  .promises.access(assetsFolderPath)
  .then(() => console.log('Folder exists'))
  .catch(() => fs.promises.mkdir(assetsFolderPath));

const getHtmlFile = (targetUrl) => axios
  .get(targetUrl.href)
  .then((response) => cheerio.load(response.data, { decodeEntities: false }));

const getElementFilename = (source) => {
  const { ext, name, dir } = path.parse(source);
  const extension = ext || '.html';
  const namePrefix = getSlugName(dir);
  return `${namePrefix}-${name}${extension}`;
};

const isSourceLocal = (source, url) => (new URL(source, url)).origin === url;

const getSources = (parsedDom, url, assetsFolderName, assetsFolderPath) => {
  const sources = Object.entries(elements).reduce((acc, [itemName, itemSrcAttribute]) => {
    const itemSources = parsedDom(itemName)
      .toArray()
      .map((item) => {
        const source = (new URL(parsedDom(item).attr(itemSrcAttribute), url)).href;
        return { ...item, source };
      })
      .filter(({ source }) => isSourceLocal(source, url))
      .map((item) => {
        const filename = getElementFilename(item.source);
        const itemPath = path.join(assetsFolderPath, filename);
        parsedDom(item).attr(itemSrcAttribute, path.join(assetsFolderName, filename));
        return { source: item.source, itemPath };
      });
    return [...acc, ...itemSources];
  }, []);
  return [parsedDom, sources];
};

const downloadElements = (parsedDom, sources, filePath) => {
  const promises = sources.map((item) => axios
    .get(item.source, {
      responseType: 'arraybuffer',
    })
    .then((response) => fs.promises.writeFile(item.itemPath, response.data, 'utf-8').catch(console.error)));
  return fs.promises.writeFile(filePath, parsedDom.html(), 'utf-8').then(() => Promise.all(promises));
};

export default (output, url) => {
  const targetUrl = new URL(url);
  const pathToProject = path.resolve(process.cwd(), output);
  const projectName = getSlugName(url);
  const filePath = path.join(pathToProject, `${projectName}.html`);
  const assetsFolderName = `${projectName}_files`;
  const assetsFolderPath = path.join(pathToProject, assetsFolderName);

  return createAssetsFolder(assetsFolderPath)
    .then(() => getHtmlFile(targetUrl))
    .then((parsedDom) => getSources(
      parsedDom,
      targetUrl.origin,
      assetsFolderName,
      assetsFolderPath,
    ))
    .then(([parsedDom, sources]) => (downloadElements(
      parsedDom,
      sources,
      filePath,
    )))
    .then(() => pathToProject)
    .catch(console.error);
};
