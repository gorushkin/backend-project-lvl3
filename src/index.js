import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';

const getFileName = (url) => url.replace(/https?:\/\//i, '').replace(/[^A-Za-z0-9]/g, '-');
const getPath = (outPutfolder, fileName) => path.join(__dirname, outPutfolder, fileName);

export default (target, url) => {
  const fileName = `${getFileName(url.toString())}.html`;
  const filepath = getPath(target, fileName);
  console.log('filepath: ', filepath);
  axios
    .get(url)
    .then((response) => response.data)
    .then((data) => fs.writeFile(filepath, data.toString(), 'utf-8'))
    .catch((err) => {
      console.log(err);
    });
};
