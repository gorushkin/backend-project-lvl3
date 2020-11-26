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

const isUrlAbsolute = (url) => (/^(?:[a-z]+:)?\/\//i).test(url);

const createAssetsFolder = (assetsFolderPath) => fs
  .promises.mkdir(assetsFolderPath, { recursive: true }).catch(() => { throw new Error(`There is folder with ${assetsFolderPath} name`); });

const getHtmlFile = (targetUrl) => axios
  .get(targetUrl.href)
  .then((response) => cheerio.load(response.data, { decodeEntities: false }));

const isLinkHasExtension = (link) => !!path.extname(link);

const getSource = (str, url) => {
  const result = isUrlAbsolute(str) ? str : str.replace(/^\//i, '');
  return (new URL(result, url));
};

const getSources = (html, url, assetsFolderName) => {
  const sources = Object.entries(elements).reduce((acc, [itemName, itemSrcAttribute]) => {
    const itemSources = html(itemName)
      .toArray()
      .map((item) => {
        const src = getSource(html(item).attr(itemSrcAttribute), url.href);
        const name = isLinkHasExtension(src.href) ? (getElementName(src.href)) : `${(getElementName(src.href))}.html`;
        return {
          ...item, src, name,
        };
      })
      .filter(({ src }) => src.origin === url.origin)
      .map((item) => {
        const source = item.src.href;
        const { name } = item;
        html(item).attr(itemSrcAttribute, path.join(assetsFolderName, name));
        return {
          name, source,
        };
      });
    return [...acc, ...itemSources];
  }, []);

  return [html, sources];
};

const downloadElements = (html, sources, folderPath, filePath) => {
  const promises = sources.map(({ name, source }) => axios
    .get(source, {
      responseType: 'arraybuffer',
    })
    .then((response) => {
      const itemPath = path.join(folderPath, name);
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
