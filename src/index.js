import axios from 'axios';
import fs from 'fs';
import path from 'path';

const getFileName = (url) => url.replace(/https?:\/\//i, '').replace(/[^A-Za-z0-9]/g, '-');
const getPath = (outPutfolder, fileName) => path.join(outPutfolder, fileName);

export default (target, url) => {
  const fileName = `${getFileName(url.toString())}.html`;
  const filepath = getPath(target || process.cwd(), fileName);
  return axios
    .get(url)
    .then((response) => fs.promises.writeFile(filepath, response.data.toString(), 'utf-8'))
    .catch((err) => {
      console.log(err.message);
    });
};
