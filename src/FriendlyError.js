const systemErrorMapping = {
  ENOENT: () => 'Output folder does not exist',
  ENOTFOUND: (e) => `Could not find the page - ${e.config.url}`,
  ECONNREFUSED: (e) => `Could not find the page - ${e.config.url}`,
  EACCES: () => 'Permission denied',
  EEXIST: (e) => `Output folder is not empty, ${e.path}`,
};

const getErrorMessage = (error) => {
  if (error.response?.status) {
    const message = `${error.message}, ${error.request.res.responseUrl}`;
    return message;
  }
  const message = systemErrorMapping[error.code] ? systemErrorMapping[error.code](error) : 'Unexpected error occurred';
  return message;
};

export default class FriendlyError extends Error {
  constructor(error) {
    super();
    this.message = getErrorMessage(error);
  }
}
