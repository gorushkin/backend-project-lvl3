import _ from 'lodash';

const defaultErrorMessage = 'Unknown error occurred';

const systemErrorMapping = {
  ENOENT: 'Output folder does not exist',
  ENOTFOUND: 'Could not find the page',
  ECONNREFUSED: 'Could not find the page',
  EACCES: 'Permission denied',
  EEXIST: 'Output folder is not empty',
};

const getErrorMessage = (error) => {
  const {
    message, code, config = {}, path, response = {},
  } = error;
  const parts = _.compact([
    'Error occured:',
    message && `Reason: ${message}`,
    !message && code && `Reason: ${systemErrorMapping[code] || defaultErrorMessage}`,
    code && `Code: ${code}`,
    config.url && `URL: ${config.url}`,
    response.status && `StatusCode: ${response.status}`,
    response.statusText && `StatusText: ${response.statusText}`,
    path && `Path: ${path}`,
  ]);

  return parts.join('\n');
};

export default class FriendlyError extends Error {
  constructor(error) {
    super(error);
    this.message = getErrorMessage(error);
  }
}
