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

export default (output, url) => {
  const targetUrl = new URL(url);
  const pathToProject = output || process.cwd();
  const projectName = getFileName(url);
  const fileName = `${projectName}.html`;
  const assetsFolder = `${projectName}_files`;
  const filePath = getPath(pathToProject, fileName);
  const folderPath = getPath(pathToProject, assetsFolder);

  const createAssetsFolder = () => fs
    .promises.mkdir(getPath(output, assetsFolder), { recursive: true }).catch(() => {
      throw new Error('There is no such directory');
    });

  const getHtmlFile = () => axios
    .get(targetUrl.href)
    .then((response) => cheerio.load(response.data.toString(), { decodeEntities: false }));

  const getImgSources = (html) => {
    const imgSources = [];
    html('img').each((i, elem) => {
      const source = new URL(`${targetUrl.pathname + html(elem).attr('src')}`, targetUrl.href).href;
      const name = path.posix.basename(source);
      html(elem).attr('src', getPath(assetsFolder, name));
      imgSources.push({ name, source });
    });
    return fs.promises
      .writeFile(filePath, html.html(), 'utf-8')
      .then(() => imgSources);
  };

  const downloadImages = (list) => {
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

  return createAssetsFolder()
    .then(getHtmlFile)
    .then(getImgSources)
    .then(downloadImages)
    .then(() => `${output}`)
    .catch(console.error);
};
