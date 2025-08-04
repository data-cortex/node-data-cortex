import { DataCortex, create } from './data_cortex';
import { createLogger } from './middleware';

const g_singleObject = create();

const defaultObject = g_singleObject;
const init = DataCortex.prototype.init.bind(g_singleObject);
const setDeviceTag = DataCortex.prototype.setDeviceTag.bind(g_singleObject);
const setUserTag = DataCortex.prototype.setUserTag.bind(g_singleObject);
const flush = DataCortex.prototype.flush.bind(g_singleObject);
const isReady = g_singleObject.isReady;
const install = DataCortex.prototype.install.bind(g_singleObject);
const dau = DataCortex.prototype.dau.bind(g_singleObject);
const event = DataCortex.prototype.event.bind(g_singleObject);
const economy = DataCortex.prototype.economy.bind(g_singleObject);
const messageSend = DataCortex.prototype.messageSend.bind(g_singleObject);
const messageClick = DataCortex.prototype.messageClick.bind(g_singleObject);
const log = DataCortex.prototype.log.bind(g_singleObject);
const logEvent = DataCortex.prototype.logEvent.bind(g_singleObject);

export {
  defaultObject,
  init,
  setDeviceTag,
  setUserTag,
  flush,
  isReady,
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
