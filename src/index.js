import axios from 'axios';
import fs from 'fs';
import path from 'path';
import cheerio from 'cheerio';

const getFileName = (url) => {
  const { hostname, pathname } = new URL(url);
  const name = pathname.length > 1 ? hostname + pathname : hostname;
  return name.replace(/https?:\/\//i, '').replace(/[^A-Za-z0-9]/g, '-');
};

const getPath = (outPutfolder, fileName) => path.join(outPutfolder, fileName);

export default (output, url) => {
  const pathToProject = output || process.cwd();
  const projectName = getFileName(url);
  const fileName = `${projectName}.html`;
  const folderName = `${projectName}_files`;
  const filePath = getPath(pathToProject, fileName);
  const folderPath = getPath(pathToProject, folderName);

  const creatingFolder = () => {
    if (output) {
      return fs.promises.mkdir(folderPath, { recursive: true });
    }
    return Promise.resolve();
  };

  const getHtmlFile = () => axios
    .get(url).then((response) => {
      fs.promises.writeFile(filePath, response.data.toString(), 'utf-8');
      return response.data;
    });

  const getImgSources = (data) => {
    const array = [];
    const $ = cheerio.load(data);
    $('img').each((i, elem) => {
      const src = url + $(elem).attr('src');
      const name = path.posix.basename(src);
      array.push({ name, src });
    });
    return Promise.resolve(array);
  };

  const downloadImages = (list) => list.map(({ name, src }) => axios
    .get(src, {
      responseType: 'arraybuffer',
    })
    .then((response) => {
      const imgPath = getPath(folderPath, name);
      fs.promises.writeFile(imgPath, response.data, 'utf-8');
    }));

  return creatingFolder().then(getHtmlFile).then(getImgSources).then(downloadImages)
    .then(() => console.log(`${output}${fileName}`))
    .catch(console.error);
};
