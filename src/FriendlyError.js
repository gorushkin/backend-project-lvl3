import _ from 'lodash';
import systemErrorMapping from 'errno';

const defaultErrorMessage = 'Unexpected error occurred';

const translateErrorCode = (code) => systemErrorMapping[code]?.description || defaultErrorMessage;

const messageBuilders = [
  {
    check: (error) => error?.isAxiosError,
    buildMessage: ({
      code, response, config, message,
    }) => _.compact([translateErrorCode(code), response, config, message]).join('\n'),
  },
  {
    check: (error) => !!error?.code,

    buildMessage: ({
      code, response, config, message,
    }) => _.compact([translateErrorCode(code), response, config, message]).join('\n'),
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
