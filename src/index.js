import axios from 'axios';
import fs from 'fs';
import path from 'path';
import cheerio from 'cheerio';

const getProjectName = (url) => {
  const { hostname, pathname } = new URL(url);
  const name = pathname.length > 1 ? hostname + pathname : hostname;
  return name.replace(/https?:\/\//i, '').replace(/[^A-Za-z0-9]/g, '-');
};

const getPath = (arg1, arg2) => path.join(arg1, arg2);

const createAssetsFolder = (assetsFolderPath) => fs
  .promises.mkdir(assetsFolderPath).catch(() => {
    throw new Error('There is no such directory');
  });

const getHtmlFile = (targetUrl) => axios
  .get(targetUrl.href)
  .then((response) => cheerio.load(response.data.toString(), { decodeEntities: false }));

const IsElementSourceLocal = (src, url) => {
  try {
    return new URL(src).origin === url.origin;
  } catch {
    return true;
  }
};

const getImgSources = (html, url, assetsFolderName, filePath) => {
  const imgSources = [];
  html('img').each((i, elem) => {
    const elementSource = html(elem).attr('src');
    if (IsElementSourceLocal(elementSource, url)) {
      const source = (new URL(elementSource, url.href)).href;
      const name = path.posix.basename(source);
      html(elem).attr('src', getPath(assetsFolderName, name));
      imgSources.push({ name, source });
    }
  });
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
  const pathToProject = path.isAbsolute(output) ? output : getPath(process.cwd(), output);
  const projectName = getProjectName(url);
  const filePath = getPath(pathToProject, `${projectName}.html`);
  const assetsFolderName = `${projectName}_files`;
  const assetsFolderPath = getPath(pathToProject, assetsFolderName);

  return createAssetsFolder(assetsFolderPath)
    .then(() => getHtmlFile(targetUrl))
    .then((html) => getImgSources(html, targetUrl, assetsFolderName, filePath))
    .then((list) => downloadImages(list, assetsFolderPath))
    .then(() => `${pathToProject}`)
    .catch(console.error);
};
