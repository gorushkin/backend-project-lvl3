import axios from 'axios';
import fs from 'fs';
import path from 'path';
import cheerio from 'cheerio';

const elements = {
  img: 'src',
  link: 'href',
  script: 'src',
};

const convertUrlToSlugName = (url) => {
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
  const filename = convertUrlToSlugName(path.join(dir, name));
  return `${filename}${extension}`;
};

const getSources = (parsedDom, targetUrl, assetsFolderName) => {
  const sources = Object.entries(elements).reduce((acc, [itemName, itemSrcAttribute]) => {
    const itemSources = parsedDom(itemName)
      .toArray()
      .map((item) => {
        const url = (new URL(item.attribs[itemSrcAttribute], targetUrl));
        // const item.url = (new URL(item.attribs[itemSrcAttribute], targetUrl))
        return { ...item, url };
      })
      .filter(({ url }) => url.origin === targetUrl.origin)
      .map((item) => {
        const url = item.url.href;
        const filename = getElementFilename(url);
        item.attribs[itemSrcAttribute] = path.join(assetsFolderName, filename);
        return { url, filename };
      });
    return [...acc, ...itemSources];
  }, []);
  return [parsedDom, sources];
};

const downloadElements = (parsedDom, sources, filePath, assetsFolderPath) => {
  const promises = sources.map((item) => axios
    .get(item.url, {
      responseType: 'arraybuffer',
    })
    .then((response) => {
      const itemPath = path.join(assetsFolderPath, item.filename);
      return fs.promises.writeFile(itemPath, response.data, 'utf-8').catch(console.error);
    }));
  return fs.promises.writeFile(filePath, parsedDom.html(), 'utf-8').then(() => Promise.all(promises));
};

export default (output, url) => {
  const targetUrl = new URL(url);
  const pathToProject = path.resolve(process.cwd(), output);
  const projectName = convertUrlToSlugName(url);
  const filePath = path.join(pathToProject, `${projectName}.html`);
  const assetsFolderName = `${projectName}_files`;
  const assetsFolderPath = path.join(pathToProject, assetsFolderName);

  return createAssetsFolder(assetsFolderPath)
    .then(() => getHtmlFile(targetUrl))
    .then((parsedDom) => getSources(
      parsedDom,
      targetUrl,
      assetsFolderName,
    ))
    .then(([parsedDom, sources]) => (downloadElements(
      parsedDom,
      sources,
      filePath,
      assetsFolderPath,
    )))
    .then(() => pathToProject)
    .catch(console.error);
};
