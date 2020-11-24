import axios from 'axios';
import fs from 'fs';
import path from 'path';
import cheerio from 'cheerio';

const mapping = {
  hyperlink: (name) => (path.extname(name) ? name : `${name}.html`),
  usual: (name) => name,
};

const elements = {
  img: 'src',
  link: 'href',
  script: 'src',
};

const updateName = (url) => {
  const { host, pathname } = new URL(url);
  const name = pathname.length > 1 ? `${host}${pathname}` : host;
  return name.replace(/https?:\/\//i, '').replace(/[^A-Za-z0-9]/g, '-');
};

const getPath = (arg1, arg2) => path.join(arg1, arg2);

const getElementName = (source) => {
  const namePrefix = updateName(path.dirname(source));
  const sourceFileName = path.posix.basename(source);
  return `${namePrefix}-${sourceFileName}`;
};

const isUrlAbsolute = (url) => (/^(?:[a-z]+:)?\/\//i).test(url);

const getSource = (elementSource, { origin, href }) => {
  if (elementSource.substring(0, 2) === '//') return (new URL(elementSource, origin)).href;
  if (isUrlAbsolute(elementSource)) return elementSource;
  return (new URL(path.join(href, elementSource))).href;
};

const isElementSourceLocal = (src, { href, origin }) => (new URL(src, href)).origin === origin;

const createAssetsFolder = (assetsFolderPath) => fs
  .promises.mkdir(assetsFolderPath, { recursive: true }).catch(() => {
    throw new Error('There is no such directory');
  });

const getHtmlFile = (targetUrl) => axios
  .get(targetUrl.href)
  .then((response) => cheerio.load(response.data, { decodeEntities: false }));

const getSources = (html, url, assetsFolderName) => {
  const sources = Object.keys(elements).reduce((acc, tagName) => {
    const tagHref = elements[tagName];
    const tagSources = html(tagName)
      .toArray()
      .filter((elem) => {
        const elementSource = (new URL(html(elem).attr(tagHref), url)).href;
        return isElementSourceLocal(elementSource, url);
      })
      .map((elem) => {
        const tagType = html(elem).attr('rel') === 'canonical' ? 'hyperlink' : 'usual';
        const elementSource = html(elem).attr(tagHref);
        const source = getSource(elementSource, url);
        // console.log('source: ', source);
        const name = mapping[tagType](getElementName(source));
        html(elem).attr(tagHref, getPath(assetsFolderName, name));
        return { name, source };
      });
    return [...acc, ...tagSources];
  }, []);
  return [html, sources];
};

const downloadElements = (html, sources, folderPath, filePath) => {
  const promises = sources.map(({ name, source }) => axios
    .get(source, {
      responseType: 'arraybuffer',
    })
    .then((response) => {
      const imgPath = getPath(folderPath, name);
      return fs.promises.writeFile(imgPath, response.data, 'utf-8').catch(console.error);
    }));
  return fs.promises.writeFile(filePath, html.html(), 'utf-8').then(() => Promise.all(promises));
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
    .then((html) => getSources(html, targetUrl, assetsFolderName))
    .then(([html, sources]) => downloadElements(html, sources, assetsFolderPath, filePath))
    .then(() => pathToProject)
    .catch(console.error);
};
