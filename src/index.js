const { DataCortex, create } = require('./data_cortex');
const { createLogger } = require('./middleware');

const g_singleObject = create();

exports.defaultObject = g_singleObject;
exports.init = DataCortex.prototype.init.bind(g_singleObject);
exports.setDeviceTag = DataCortex.prototype.setDeviceTag.bind(g_singleObject);
exports.setUserTag = DataCortex.prototype.setUserTag.bind(g_singleObject);
exports.flush = DataCortex.prototype.flush.bind(g_singleObject);
exports.isReady = DataCortex.prototype.isReady.bind(g_singleObject);
exports.install = DataCortex.prototype.install.bind(g_singleObject);
exports.dau = DataCortex.prototype.dau.bind(g_singleObject);
exports.event = DataCortex.prototype.event.bind(g_singleObject);
exports.economy = DataCortex.prototype.economy.bind(g_singleObject);
exports.messageSend = DataCortex.prototype.messageSend.bind(g_singleObject);
exports.messageClick = DataCortex.prototype.messageClick.bind(g_singleObject);
exports.log = DataCortex.prototype.log.bind(g_singleObject);
exports.logEvent = DataCortex.prototype.logEvent.bind(g_singleObject);
exports.create = create;
exports.createLogger = createLogger;
