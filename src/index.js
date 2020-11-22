import axios from 'axios';
import fs from 'fs';
import path from 'path';
import cheerio from 'cheerio';
import getEncodedText from './getEncodedHtml.js';

const isTagCanonical = (tag) => tag === 'canonical';

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
  .get(targetUrl.href, {
    responseType: 'arraybuffer',
    reponseEncoding: 'binary',
  })
  .then((response) => {
    const correcttext = getEncodedText(response.data);
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

const getSources = (html, url, assetsFolderName, filePath, list) => {
  const sources = Object.keys(list).reduce((acc, tagName) => {
    const tagHref = list[tagName];
    const imgSources = html(tagName).toArray().filter((elem) => {
      const elementSource = html(elem).attr(tagHref);
      return isElementSourceCorrect(elementSource, url);
    }).map((elem) => {
      const elementSource = html(elem).attr(tagHref);
      const source = getSource(elementSource, url);
      const name = isTagCanonical(elem.attribs.rel) ? `${getElementName(source)}.html` : getElementName(source);
      html(elem).attr(tagHref, getPath(assetsFolderName, name));
      return { name, source };
    });
    return [...acc, ...imgSources];
  }, []);
  return fs.promises.writeFile(filePath, html.html(), 'utf-8').then(() => sources);
};

const downloadElements = (list, folderPath) => {
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

  const elements = {
    img: 'src',
    link: 'href',
    script: 'src',
  };

  return createAssetsFolder(assetsFolderPath)
    .then(() => getHtmlFile(targetUrl))
    .then((html) => getSources(html, targetUrl, assetsFolderName, filePath, elements))
    .then((list) => downloadElements(list, assetsFolderPath))
    .then(() => pathToProject)
    .catch(console.error);
};
