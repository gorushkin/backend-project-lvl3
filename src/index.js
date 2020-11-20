import axios from 'axios';
import fs from 'fs';
import path from 'path';
import cheerio from 'cheerio';

const getProjectName = (url) => {
  const { hostname, pathname } = new URL(url);
  const name = pathname.length > 1 ? hostname + pathname : hostname;
  return name.replace(/https?:\/\//i, '').replace(/[^A-Za-z0-9]/g, '-');
};

const getPath = (folder, filename) => path.join(folder, filename);

const createAssetsFolder = (output, assetsFolderName) => fs
  .promises.mkdir(getPath(output, assetsFolderName), { recursive: true }).catch(() => {
    throw new Error('There is no such directory');
  });

const getHtmlFile = (targetUrl) => axios
  .get(targetUrl.href)
  .then((response) => cheerio.load(response.data.toString(), { decodeEntities: false }));

const getImgSources = (html, url, assetsFolderName, filePath) => {
  const imgSources = [];
  html('img').each((i, elem) => {
    const source = new URL(`${url.pathname + html(elem).attr('src')}`, url.href).href;
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
  return Promise.all(promises);
};

export default (output, url) => {
  const targetUrl = new URL(url);
  const pathToProject = output || process.cwd();
  const projectName = getProjectName(url);
  const filename = `${projectName}.html`;
  const assetsFolderName = `${projectName}_files`;
  const filePath = getPath(pathToProject, filename);
  const folderPath = getPath(pathToProject, assetsFolderName);

  return createAssetsFolder(output, assetsFolderName)
    .then(() => getHtmlFile(targetUrl))
    .then((html) => getImgSources(html, targetUrl, assetsFolderName, filePath))
    .then((list) => downloadImages(list, folderPath))
    .then(() => `${output}`)
    .catch(console.error);
};
