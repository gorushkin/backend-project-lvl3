import axios from 'axios';
import fs from 'fs';
import path from 'path';
import cheerio from 'cheerio';
import iconv from 'iconv-lite';
import jschardet from 'jschardet';

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

const getSourceEncoding = ({ encoding }) => {
  switch (encoding) {
    case 'windows-1251': {
      return 'win1251';
    }
    case 'windows-1252': {
      return 'win1252';
    }
    default: {
      return 'UTF-8';
    }
  }
};

const getHtmlFile = (targetUrl) => axios
  .get(targetUrl.href, {
    responseType: 'arraybuffer',
    reponseEncoding: 'binary',
  })
  .then((response) => {
    const charsetMatch = getSourceEncoding(jschardet.detect(response.data));
    const correcttext = iconv.decode(response.data, charsetMatch);
    return cheerio.load(correcttext, { decodeEntities: false });
  });

const getElementName = (source) => {
  const namePrefix = updateName(path.dirname(source));
  const sourceFileName = path.posix.basename(source);
  return `${namePrefix}-${sourceFileName}`;
};

const isUrlAbsolute = (url) => (/^(?:[a-z]+:)?\/\//i).test(url);

const getSource = (elementSource, url) => {
  if (elementSource.substring(0, 2) === '//') return (new URL(elementSource, url.origin)).href;
  if (isUrlAbsolute(elementSource)) return elementSource;
  const { pathname } = url;
  const currentImgPath = pathname.split('/').filter((item) => item.length > 1);
  const stepUp = elementSource.split('../').length - 1;
  const src = elementSource.replace(/\..\//g, '');
  const prefix = currentImgPath.splice(0, stepUp).join('/');
  return (new URL(path.join(prefix, src), url.origin)).href;
};

const IsElementSourceLocal = (src, url) => {
  if (src.substring(0, 2) === '//') {
    return true;
  }
  if (isUrlAbsolute(src)) {
    return new URL(src).origin === url.origin;
  }
  return true;
};

const isElementSourceCorrect = (elementSource, url) => elementSource
  && IsElementSourceLocal(elementSource, url)
  && elementSource !== url.href;

const getImgSources = (html, url, assetsFolderName, filePath) => {
  const imgSources = html('img').toArray().map((elem) => {
    const elementSource = html(elem).attr('src');
    if (isElementSourceCorrect(elementSource, url)) {
      const source = getSource(elementSource, url);
      const name = getElementName(source);
      html(elem).attr('src', getPath(assetsFolderName, name));
      return { name, source };
    }
    return false;
  });
  return fs.promises.writeFile(filePath, html.html(), 'utf-8').then(() => imgSources);
};

const downloadImages = (list, folderPath) => {
  const promises = list.map(({ name, source }) => axios
    .get(source, {
      responseType: 'arraybuffer',
    })
    .catch((err) => console.log(source, err.message))
    .then((response) => {
      const imgPath = getPath(folderPath, name);
      return fs.promises.writeFile(imgPath, response.data, 'utf-8');
    }).catch((err) => console.log(err.message)));
  return Promise.all(promises);
};

export default (output, url) => {
  const targetUrl = new URL(url);
  const pathToProject = path.resolve(process.cwd(), output);
  const projectName = updateName(url);
  const filePath = getPath(pathToProject, `${projectName}.html`);
  const assetsFolderName = `${projectName}_files`;
  const assetsFolderPath = getPath(pathToProject, assetsFolderName);

  const elements = {
    img: 'src',
    // link: 'href',
    // script: 'src',
  };

  return createAssetsFolder(assetsFolderPath)
    .then(() => getHtmlFile(targetUrl))
    .then((html) => getImgSources(html, targetUrl, assetsFolderName, filePath, elements))
    .then((list) => downloadImages(list, assetsFolderPath))
    .then(() => pathToProject)
    .catch(console.error);
};
