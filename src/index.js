import axios from 'axios';
import fs from 'fs';
import path from 'path';
import cheerio from 'cheerio';

const getFileName = (url) => {
  const { hostname, pathname } = new URL(url);
  const name = pathname.length > 1 ? hostname + pathname : hostname;
  return name.replace(/https?:\/\//i, '').replace(/[^A-Za-z0-9]/g, '-');
};

const getPath = (folder, fileName) => path.join(folder, fileName);

const createAssetsFolder = (output, assetsFolderName) => fs
  .promises.mkdir(getPath(output, assetsFolderName), { recursive: true }).catch(() => {
    throw new Error('There is no such directory');
  });

const getHtmlFile = (targetUrl) => axios
  .get(targetUrl.href)
  .then((response) => cheerio.load(response.data.toString(), { decodeEntities: false }));

const getImgSources = (html, targetUrl, assetsFolderName, filePath) => {
  const imgSources = [];
  html('img').each((i, elem) => {
    const source = new URL(`${targetUrl.pathname + html(elem).attr('src')}`, targetUrl.href).href;
    const name = path.posix.basename(source);
    html(elem).attr('src', getPath(assetsFolderName, name));
    imgSources.push({ name, source });
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
      fs.promises.writeFile(imgPath, response.data, 'utf-8');
    }));
  const promise = Promise.all(promises);
  return promise;
};

export default (output, url) => {
  const targetUrl = new URL(url);
  const pathToProject = output || process.cwd();
  const projectName = getFileName(url);
  const fileName = `${projectName}.html`;
  const assetsFolderName = `${projectName}_files`;
  const filePath = getPath(pathToProject, fileName);
  const folderPath = getPath(pathToProject, assetsFolderName);

  return createAssetsFolder(output, assetsFolderName)
    .then(() => getHtmlFile(targetUrl))
    .then((html) => getImgSources(html, targetUrl, assetsFolderName, filePath))
    .then((list) => downloadImages(list, folderPath))
    .then(() => `${output}`)
    .catch(console.error);
};
