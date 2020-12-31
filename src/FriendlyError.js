import _ from 'lodash';
import systemErrorMapping from 'errno';

const defaultErrorMessage = 'Unexpected error occurred';

const translateErrorCode = (code) => systemErrorMapping[code]?.description || defaultErrorMessage;

const messageBuilders = [
  {
    check: (error) => error?.isAxiosError,

    buildMessage: ({
      code, response, config, message,
    }) => _.compact([
      'Error occurred:',
      `Message: ${message}`,
      code && `Description: ${translateErrorCode(code)}`,
      code && `Code: ${code}`,
      `URL: ${config.url}`,
      `StatusCode: ${response.status}`,
      response.statusText && `StatusText: ${response.statusText}`,
    ]).join('\n'),
  },
  {
    check: (error) => !!error?.code,

    buildMessage: ({
      code, address, path, port, message,
    }) => _.compact([
      'Error occurred:',
      `Message: ${message}`,
      `Description: ${translateErrorCode(code)}`,
      `Code: ${code}`,
      address && `URL: ${address}`,
      port && `Port: ${port}`,
      path && `Path: ${path}`,
    ]).join('\n'),
  },
  {
    check: () => true,
    buildMessage: ({ message }) => message,
  },
];

export default class FriendlyError extends Error {
  constructor(error) {
    super(error);
    Error.captureStackTrace(this, FriendlyError);
    const { buildMessage } = messageBuilders.find(({ check }) => check());
    this.message = buildMessage(error);
  }
}
