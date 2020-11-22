import axios from 'axios';
import fs from 'fs';
import path from 'path';
import cheerio from 'cheerio';

const updateName = (url) => {
  const { host, pathname } = new URL(url);
  const name = pathname.length > 1 ? `${host}${pathname}` : host;
  return name.replace(/https?:\/\//i, '').replace(/[^A-Za-z0-9]/g, '-');
};

const getPath = (arg1, arg2) => path.join(arg1, arg2);

const createAssetsFolder = (assetsFolderPath) => fs
  .promises.mkdir(assetsFolderPath, { recursive: true }).catch(() => {
    throw new Error('There is no such directory');
  });

const getHtmlFile = (targetUrl) => axios
  .get(targetUrl.href)
  .then((response) => cheerio.load(response.data.toString(), { decodeEntities: false }));

const isElementSourceGlobal = (src, url) => {
  try {
    return new URL(src).origin !== url.origin;
  } catch {
    return false;
  }
};

const getImgSources = (html, url, assetsFolderName, filePath) => {
  const imgSources = html('img').map((i, elem) => {
    const elementSource = html(elem).attr('src');
    if (isElementSourceGlobal(elementSource, url)) {
      return false;
    }
    const source = (new URL(elementSource, url.href)).href;
    const namePrefix = updateName(path.dirname(source));
    const sourceFileName = path.posix.basename(source);
    const name = `${namePrefix}-${sourceFileName}`;
    html(elem).attr('src', getPath(assetsFolderName, name));
    return { name, source };
  }).get();
  return fs.promises.writeFile(filePath, html.html(), 'utf-8').then(() => imgSources);
};

const downloadImages = (list, folderPath) => {
  const promises = list.map(({ name, source }) => axios
    .get(source, {
      responseType: 'arraybuffer',
    })
    .then((response) => {
      const imgPath = getPath(folderPath, name);
      return fs.promises.writeFile(imgPath, response.data, 'utf-8');
    }));
  return Promise.all(promises);
};

export default (output, url) => {
  const targetUrl = new URL(url);
  const pathToProject = path.resolve(process.cwd(), output);
  const projectName = updateName(url);
  const filePath = getPath(pathToProject, `${projectName}.html`);
  const assetsFolderName = `${projectName}_files`;
  const assetsFolderPath = getPath(pathToProject, assetsFolderName);

  return createAssetsFolder(assetsFolderPath)
    .then(() => getHtmlFile(targetUrl))
    .then((html) => getImgSources(html, targetUrl, assetsFolderName, filePath))
    .then((list) => downloadImages(list, assetsFolderPath))
    .then(() => pathToProject)
    .catch(console.error);
};
