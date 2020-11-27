import axios from 'axios';
import fs from 'fs';
import path from 'path';
import cheerio from 'cheerio';

const elements = {
  img: 'src',
  link: 'href',
  script: 'src',
};

const updateName = (url) => {
  const { host, pathname } = new URL(url);
  return (`${host}${pathname}`).replace(/[^A-Za-z0-9]/g, '-').replace(/-$/i, '');
};

const getElementName = (source) => {
  const namePrefix = updateName(path.dirname(source));
  const sourceFileName = path.posix.basename(source);
  return `${namePrefix}-${sourceFileName}`;
};

const createAssetsFolder = (assetsFolderPath) => fs
  .promises.access(assetsFolderPath)
  .then(() => console.log('Folder exists'))
  .catch(() => fs.promises.mkdir(assetsFolderPath));

const getHtmlFile = (targetUrl) => axios
  .get(targetUrl.href)
  .then((response) => cheerio.load(response.data, { decodeEntities: false }));

const getElementFilename = (href) => (path.extname(href) ? (getElementName(href)) : `${(getElementName(href))}.html`);

const isSourceLocal = (source, url) => (new URL(source, url.href)).origin === url.origin;

const getSources = (html, url, assetsFolderName) => {
  const sources = Object.entries(elements).reduce((acc, [itemName, itemSrcAttribute]) => {
    const itemSources = html(itemName)
      .toArray()
      .filter((item) => isSourceLocal(html(item).attr(itemSrcAttribute), url))
      .map((item) => {
        const source = (new URL(html(item).attr(itemSrcAttribute), url.href)).href;
        const filename = getElementFilename(source);
        html(item).attr(itemSrcAttribute, path.join(assetsFolderName, filename));
        return {
          filename, source,
        };
      });
    return [...acc, ...itemSources];
  }, []);

  return [html, sources];
};

const downloadElements = (html, sources, folderPath, filePath) => {
  const promises = sources.map(({ filename, source }) => axios
    .get(source, {
      responseType: 'arraybuffer',
    })
    .then((response) => {
      const itemPath = path.join(folderPath, filename);
      return fs.promises.writeFile(itemPath, response.data, 'utf-8').catch(console.error);
    }));
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
