import iconv from 'iconv-lite';
import jschardet from 'jschardet';

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

export default (string) => iconv.decode(string, getSourceEncoding(jschardet.detect(string)));
