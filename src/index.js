import axios from 'axios';
import fs from 'fs';
import path from 'path';

const getFileName = (url) => url.replace(/https?:\/\//i, '').replace(/[^A-Za-z0-9]/g, '-');
const getPath = (outPutfolder, fileName) => path.join(process.cwd(), outPutfolder, fileName);

export default (output = '', url) => {
  const fileName = `${getFileName(url.toString())}.html`;
  const filepath = getPath(output, fileName);
  fs.promises
    .mkdir(path.join(process.cwd(), output), { recursive: true })
    .then(() => {
      axios
        .get(url)
        .then((response) => fs.promises.writeFile(filepath, response.data.toString(), 'utf-8'))
        .then(() => console.log(`${output}${fileName}`));
    })
    .catch(console.error);
};
