const getErrorMessage = (error) => {
  const errorMapping = {
    ENOENT: () => 'Output folder does not exist',
    ENOTFOUND: (e) => `Could not find the page - ${e.config.url}`,
    ECONNREFUSED: (e) => `Could not find the page - ${e.config.url}`,
    EACCES: () => 'Permission denied',
  };

  const networkErrorMapping = {
    400: 'Server could not understand the request due to invalid syntax',
    403: 'You do not have access rights to the content',
    404: 'The server can not find requested resource',
    500: "The server has encountered a situation it doesn't know how to handle",
    503: 'The server is not ready to handle the request',
    504: 'Gateway Timeout',
  };
  if (error.response?.status) {
    const message = networkErrorMapping[error.response.status]
      ? networkErrorMapping[error.response.status]
      : error.message;
    return message;
  }
  const message = errorMapping[error.code] ? errorMapping[error.code](error) : 'Unexpected error occurred';
  return message;
};

class PageLoadError extends Error {
  constructor(error) {
    super();
    this.message = getErrorMessage(error);
  }
}

export default (e) => {
  throw new PageLoadError(e);
};
