import { DataCortex, create } from './data_cortex';
import { createLogger } from './middleware';

// Export all public types
export type {
  InitOptions,
  BaseEventProps,
  EventProps,
  InstallProps,
  DauProps,
  MessageSendProps,
  MessageClickProps,
  EconomyProps,
  LogEventProps,
} from './data_cortex';

export type {
  CreateLoggerParams,
  ExpressRequest,
  ExpressResponse,
  ExpressNext,
  LogEvent,
} from './middleware';

// Export the DataCortex class and create function
export { DataCortex, create };

// Export the middleware function
export { createLogger };

// Default instance and bound methods
export const defaultObject = create();
export const init = DataCortex.prototype.init.bind(defaultObject);
export const setDeviceTag = DataCortex.prototype.setDeviceTag.bind(defaultObject);
export const setUserTag = DataCortex.prototype.setUserTag.bind(defaultObject);
export const flush = DataCortex.prototype.flush.bind(defaultObject);
export const install = DataCortex.prototype.install.bind(defaultObject);
export const dau = DataCortex.prototype.dau.bind(defaultObject);
export const event = DataCortex.prototype.event.bind(defaultObject);
export const economy = DataCortex.prototype.economy.bind(defaultObject);
export const messageSend = DataCortex.prototype.messageSend.bind(defaultObject);
export const messageClick = DataCortex.prototype.messageClick.bind(defaultObject);
export const log = DataCortex.prototype.log.bind(defaultObject);
export const logEvent = DataCortex.prototype.logEvent.bind(defaultObject);

export default {
  defaultObject,
  init,
  setDeviceTag,
  setUserTag,
  flush,
  install,
  dau,
  event,
  economy,
  messageSend,
  messageClick,
  log,
  logEvent,
  create,
  createLogger,
};
