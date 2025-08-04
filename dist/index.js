'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var https = require('node:https');
var os = require('node:os');

function _interopNamespaceDefault(e) {
    var n = Object.create(null);
    if (e) {
        Object.keys(e).forEach(function (k) {
            if (k !== 'default') {
                var d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () { return e[k]; }
                });
            }
        });
    }
    n.default = e;
    return Object.freeze(n);
}

var https__namespace = /*#__PURE__*/_interopNamespaceDefault(https);
var os__namespace = /*#__PURE__*/_interopNamespaceDefault(os);

const STRING_PROP_LIST = [
    'kingdom',
    'phylum',
    'class',
    'order',
    'family',
    'genus',
    'species',
    'spend_currency',
    'spend_type',
    'network',
    'from_tag',
    'to_tag',
    'channel',
];
const NUMBER_PROP_LIST = [
    'float1',
    'float2',
    'float3',
    'float4',
    'spend_amount',
];
const OTHER_PROP_LIST = ['type', 'event_index', 'event_datetime', 'to_list'];
const DEFAULT_BUNDLE_PROP_LIST = [
    'app_ver',
    'server_ver',
    'config_ver',
    'user_tag',
    'device_tag',
    'device_type',
    'os',
    'os_ver',
    'browser',
    'browser_ver',
    'marketplace',
    'country',
    'geo_ip_address',
    'language',
    'group_tag',
];
const EVENT_PROP_LIST = [...STRING_PROP_LIST, ...NUMBER_PROP_LIST, ...OTHER_PROP_LIST];
const BUNDLE_PROP_LIST = [...EVENT_PROP_LIST, ...DEFAULT_BUNDLE_PROP_LIST];
const LOG_NUMBER_PROP_LIST = ['response_bytes', 'response_ms'];
const LOG_STRING_PROP_MAP = {
    hostname: 64,
    filename: 256,
    log_level: 64,
    device_tag: 62,
    user_tag: 62,
    remote_address: 64,
    log_line: 65535,
};
const LOG_OTHER_PROP_LIST = [
    'event_datetime',
    'device_type',
    'os',
    'os_ver',
    'browser',
    'browser_ver',
    'country',
    'language',
];
const LOG_PROP_LIST = LOG_NUMBER_PROP_LIST.concat(Object.keys(LOG_STRING_PROP_MAP), LOG_OTHER_PROP_LIST);

const { version } = require('../package.json');
const UAS = `node-data-cortex/${version}`;
const EVENT_SEND_COUNT = 10;
const LOG_SEND_COUNT = 100;
const DELAY_MS = 500;
const REST_TIMEOUT = 5 * 1000;
const API_BASE_URL = 'https://api.data-cortex.com';
class DataCortex {
    apiBaseUrl;
    isReady;
    isSending;
    timeout;
    apiKey;
    orgName;
    appVer;
    serverVer;
    userTag;
    eventList;
    nextIndex;
    delayCount;
    defaultBundle;
    logList;
    logTimeout;
    isLogSending;
    logDelayCount;
    defaultLogBundle;
    hasHupHandler = false;
    constructor() {
        this.apiBaseUrl = API_BASE_URL;
        this.isReady = false;
        this.isSending = false;
        this.timeout = false;
        this.apiKey = false;
        this.orgName = false;
        this.appVer = '0';
        this.serverVer = '';
        this.userTag = false;
        this.eventList = [];
        this.nextIndex = 0;
        this.delayCount = 0;
        this.defaultBundle = {};
        this.logList = [];
        this.logTimeout = false;
        this.isLogSending = false;
        this.logDelayCount = 0;
        this.defaultLogBundle = {};
        return this;
    }
    init(opts, done) {
        if (!done) {
            done = function () { };
        }
        if (!opts || !opts.apiKey) {
            throw new Error('opts.apiKey is required');
        }
        if (!opts || !opts.orgName) {
            throw new Error('opts.orgName is required');
        }
        this.apiKey = opts.apiKey;
        this.orgName = opts.orgName;
        this.appVer = opts.appVer || '0';
        this.serverVer = opts.serverVer || '';
        this.apiBaseUrl = opts.baseUrl || API_BASE_URL;
        this.defaultBundle = {
            app_ver: opts.appVer || '0',
            device_type: opts.deviceType || '',
            os: opts.os || '',
            os_ver: opts.osVer || '',
            language: opts.language || 'zz',
        };
        if (opts.serverVer) {
            this.defaultBundle.server_ver = opts.serverVer;
        }
        if (opts.deviceTag) {
            this.defaultBundle.device_tag = opts.deviceTag;
        }
        if (opts.userTag) {
            this.defaultBundle.user_tag = opts.userTag;
        }
        if (opts.country) {
            this.defaultBundle.country = opts.country;
        }
        this.defaultLogBundle = {};
        if (opts.hostname) {
            this.defaultLogBundle.hostname = opts.hostname;
        }
        else {
            this.defaultLogBundle.hostname = os__namespace.hostname();
        }
        if (opts.filename) {
            this.defaultLogBundle.filename = opts.filename;
        }
        if (!opts.noHupHandler && !this.hasHupHandler) {
            this.hasHupHandler = true;
            process.on('SIGHUP', () => this.flush());
        }
        this.isReady = true;
        done();
    }
    setDeviceTag(tag) {
        if (tag) {
            this.defaultBundle.device_tag = tag;
        }
        else {
            delete this.defaultBundle.device_tag;
        }
    }
    setUserTag(tag) {
        if (tag) {
            this.defaultBundle.user_tag = tag;
        }
        else {
            delete this.defaultBundle.user_tag;
        }
    }
    install(props) {
        if (!props || typeof props !== 'object') {
            throw new Error('props must be an object');
        }
        this._internalEventAdd(props, 'install');
    }
    dau(props) {
        if (!props || typeof props !== 'object') {
            throw new Error('props must be an object');
        }
        this._internalEventAdd(props, 'dau');
    }
    event(props) {
        if (!props || typeof props !== 'object') {
            throw new Error('props must be an object');
        }
        this._internalEventAdd(props, 'event');
    }
    messageSend(props) {
        if (!props || typeof props !== 'object') {
            throw new Error('props must be an object');
        }
        if (!props.network) {
            throw new Error('network is required');
        }
        if (!props.from_tag) {
            throw new Error('from_tag is required');
        }
        if (!props.to_list) {
            throw new Error('to_list is required');
        }
        this._internalEventAdd(props, 'message_send');
    }
    messageClick(props) {
        if (!props || typeof props !== 'object') {
            throw new Error('props must be an object');
        }
        if (!props.network) {
            throw new Error('network is required');
        }
        if (!props.from_tag) {
            throw new Error('from_tag is required');
        }
        if (!props.to_tag) {
            throw new Error('to_tag is required');
        }
        this._internalEventAdd(props, 'message_click');
    }
    economy(props) {
        if (!props || typeof props != 'object') {
            throw new Error('props must be an object');
        }
        if (!props.spend_currency) {
            throw new Error('spend_currency is required');
        }
        if (typeof props.spend_amount != 'number') {
            throw new Error('spend_amount is required');
        }
        if (!isFinite(props.spend_amount)) {
            throw new Error('spend_amount must be finite');
        }
        this._internalEventAdd(props, 'economy');
    }
    flush() {
        this._sendEvents();
        this._sendLogs();
    }
    _internalEventAdd(input_props, type) {
        if (!input_props.device_tag && !this.defaultBundle.device_tag) {
            throw new Error('device_tag is required');
        }
        const props = Object.assign({}, input_props);
        props.type = type;
        props.event_index = this.nextIndex++;
        if (!props.event_datetime) {
            props.event_datetime = new Date().toISOString();
        }
        STRING_PROP_LIST.forEach((p) => {
            if (p in props) {
                let val = props[p];
                if (val && typeof val === 'object' && 'toString' in val) {
                    val = val.toString().slice(0, 32);
                }
                else if (typeof val === 'string') {
                    val = val.slice(0, 32);
                }
                else {
                    val = '';
                }
                props[p] = val;
            }
        });
        NUMBER_PROP_LIST.forEach((p) => {
            if (p in props) {
                let val = props[p];
                let numVal;
                if (typeof val != 'number') {
                    numVal = parseFloat(String(val));
                }
                else {
                    numVal = val;
                }
                if (!isFinite(numVal)) {
                    delete props[p];
                }
                else {
                    props[p] = numVal;
                }
            }
        });
        this.eventList.push(_pick(props, BUNDLE_PROP_LIST));
        this._sendEventsLater();
    }
    _sendEventsLater(delay) {
        if (!delay) {
            delay = 0;
        }
        if (!this.timeout && this.isReady && !this.isSending) {
            this.timeout = setTimeout(() => {
                this.timeout = false;
                this._sendEvents();
            }, delay);
        }
    }
    _sendEvents() {
        if (this.isReady && !this.isSending && this.eventList.length > 0) {
            this.isSending = true;
            const events = [];
            this.eventList.some((e) => {
                if (events.length === 0) {
                    events.push(e);
                }
                else if (events[0] && _defaultBundleEqual(events[0], e)) {
                    events.push(e);
                }
                return events.length < EVENT_SEND_COUNT;
            });
            const firstEvent = events[0];
            if (!firstEvent) {
                this.isSending = false;
                return;
            }
            const default_props = _pick(firstEvent, DEFAULT_BUNDLE_PROP_LIST);
            const bundle = Object.assign({}, this.defaultBundle, default_props, {
                api_key: this.apiKey,
            });
            bundle.events = events.map((e) => _pick(e, EVENT_PROP_LIST));
            const current_time = encodeURIComponent(new Date().toISOString());
            const url = this.apiBaseUrl +
                '/' +
                this.orgName +
                '/1/track' +
                '?current_time=' +
                current_time;
            _request({ url, body: bundle }, (err, body) => {
                let remove = true;
                if (err == 400) {
                    _errorLog('Bad request, please check parameters, error:', body);
                }
                else if (err == 403) {
                    _errorLog('Bad API Key, error:', body);
                    this.isReady = false;
                }
                else if (err == 409) ;
                else if (err) {
                    remove = false;
                    this.delayCount++;
                }
                else {
                    this.delayCount = 0;
                }
                if (remove && bundle.events) {
                    this._removeEvents(bundle.events);
                }
                this.isSending = false;
                if (this.eventList.length > 0) {
                    this._sendEventsLater(this.delayCount * DELAY_MS);
                }
            });
        }
    }
    _removeEvents(event_list) {
        this.eventList = this.eventList.filter((e) => {
            return !event_list.some((e2) => {
                return e.event_index == e2.event_index;
            });
        });
    }
    log(...args) {
        if (!args || args.length === 0) {
            throw new Error('log must have arguments');
        }
        let log_line = '';
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (i > 0) {
                log_line += ' ';
            }
            if (_isError(arg)) {
                log_line += arg.stack;
            }
            else if (typeof arg === 'object' && arg !== null) {
                try {
                    log_line += JSON.stringify(arg);
                }
                catch (_e) {
                    log_line += String(arg);
                }
            }
            else {
                log_line += String(arg);
            }
        }
        return this.logEvent({ log_line });
    }
    logEvent(props) {
        if (!props || typeof props !== 'object') {
            throw new Error('props must be an object.');
        }
        if (!props.event_datetime) {
            props.event_datetime = new Date().toISOString();
        }
        _objectEach(LOG_STRING_PROP_MAP, (max_len, p) => {
            if (p in props) {
                const val = props[p];
                const s = val && typeof val === 'object' && 'toString' in val ? val.toString() : String(val);
                if (s && s !== 'undefined' && s !== 'null') {
                    props[p] = s.slice(0, max_len);
                }
                else {
                    delete props[p];
                }
            }
        });
        LOG_NUMBER_PROP_LIST.forEach((p) => {
            if (p in props) {
                let val = props[p];
                let numVal;
                if (typeof val !== 'number') {
                    numVal = parseFloat(String(val));
                }
                else {
                    numVal = val;
                }
                if (isFinite(numVal)) {
                    props[p] = numVal;
                }
                else {
                    delete props[p];
                }
            }
        });
        const e = _pick(props, LOG_PROP_LIST);
        this.logList.push(e);
        this._sendLogsLater();
        return e;
    }
    _removeLogs(events) {
        this.logList.splice(0, events.length);
    }
    _sendLogsLater(delay = 0) {
        if (!this.logTimeout && this.isReady && !this.isLogSending) {
            this.logTimeout = setTimeout(() => {
                this.logTimeout = false;
                this._sendLogs();
            }, delay);
        }
    }
    _sendLogs() {
        if (this.isReady && !this.isLogSending && this.logList.length > 0) {
            this.isLogSending = true;
            const bundle = Object.assign({}, this.defaultBundle, this.defaultLogBundle, {
                api_key: this.apiKey,
                app_ver: this.appVer,
                events: this.logList.slice(0, LOG_SEND_COUNT),
            });
            const url = this.apiBaseUrl + '/' + this.orgName + '/1/app_log';
            _request({ url, body: bundle }, (err, body) => {
                let remove = true;
                if (err === 400) {
                    _errorLog('Bad request, please check parameters, error:', body);
                }
                else if (err === 403) {
                    _errorLog('Bad API Key, error:', body);
                }
                else if (err === 409) ;
                else if (err) {
                    remove = false;
                    this.logDelayCount++;
                }
                else {
                    this.logDelayCount = 0;
                }
                if (remove && bundle.events) {
                    this._removeLogs(bundle.events);
                }
                this.isLogSending = false;
                if (this.logList.length > 0) {
                    this._sendLogsLater(this.logDelayCount * DELAY_MS);
                }
            });
        }
    }
}
function _isError(e) {
    return (e !== null &&
        typeof e === 'object' &&
        'stack' in e &&
        'message' in e &&
        typeof e.stack === 'string' &&
        typeof e.message === 'string');
}
function _defaultBundleEqual(a, b) {
    return DEFAULT_BUNDLE_PROP_LIST.every((prop) => a[prop] === b[prop]);
}
function _errorLog(...args) {
    const new_args = ['Data Cortex Error:'];
    new_args.push(...args);
    console.error(...new_args);
}
function _pick(obj, prop_list) {
    const new_obj = {};
    prop_list.forEach((prop) => {
        const val = obj[prop];
        if (val !== undefined) {
            new_obj[prop] = val;
        }
    });
    return new_obj;
}
function _objectEach(object, callback) {
    Object.keys(object).forEach((key) => {
        const value = object[key];
        if (value !== undefined) {
            callback(value, key, object);
        }
    });
}
function _request(params, done) {
    let is_done = false;
    const opts = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': UAS,
        },
        timeout: REST_TIMEOUT,
    };
    let post_body = '';
    try {
        post_body = JSON.stringify(params.body);
    }
    catch (e) {
        is_done = true;
        done('bad_body_json', String(e));
        return;
    }
    let err = null;
    let response_body = '';
    const req = https__namespace.request(params.url, opts, (res) => {
        if (res.statusCode && (res.statusCode < 200 || res.statusCode > 299)) {
            err = res.statusCode;
        }
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            response_body += chunk;
        });
        res.on('end', () => {
            if (!is_done) {
                done(err, response_body);
            }
        });
    });
    req.on('error', (e) => {
        if (!is_done) {
            is_done = true;
            done(e, response_body);
        }
    });
    req.write(post_body);
    req.end();
}
function create() {
    return new DataCortex();
}

function createLogger(params) {
    const { dataCortex, prepareEvent, logConsole } = params;
    return function (req, res, next) {
        req._startTimestamp = Date.now();
        const end = res.end;
        res.end = function (chunk, encoding) {
            const response_ms = Date.now() - (req._startTimestamp || 0);
            const response_bytes = res.getHeader('content-length') || 0;
            res.end = end;
            const result = res.end(chunk, encoding);
            const event = {
                event_datetime: new Date(),
                response_ms,
                response_bytes: typeof response_bytes === 'number' ? response_bytes : 0,
                remote_address: req.ip,
                log_level: String(res.statusCode),
                log_line: `${req.method} ${req.originalUrl} HTTP/${req.httpVersionMajor}.${req.httpVersionMinor}`,
            };
            const referrer = req.get('referrer');
            if (referrer) {
                event.filename = referrer;
            }
            const ua = req.get('user-agent');
            _fillUserAgent(event, ua);
            if (prepareEvent) {
                prepareEvent(req, res, event);
            }
            dataCortex.logEvent(event);
            if (logConsole) {
                console.log(`${event.remote_address} - - [${event.event_datetime.toUTCString()}] "${event.log_line}" ${event.log_level} ${event.response_ms}(ms) "${event.filename ?? ''}" "${ua ?? ''}"`);
            }
            return result;
        };
        return next();
    };
}
function _fillUserAgent(event, ua) {
    if (ua) {
        if (!event.os) {
            if (ua.indexOf('Win') !== -1) {
                event.os = 'windows';
                event.os_ver = _regexGet(ua, /Windows NT ([^ ;)]*)/, 'unknown');
            }
            else if (ua.indexOf('iPhone OS') !== -1) {
                event.os = 'ios';
                event.os_ver = _regexGet(ua, /iPhone OS ([^ ;)]*)/, 'unknown');
                event.os_ver = event.os_ver.replace(/_/g, '.');
            }
            else if (ua.indexOf('iPad') !== -1) {
                event.os = 'ios';
                event.os_ver = _regexGet(ua, /CPU OS ([^ ;)]*)/, 'unknown');
                event.os_ver = event.os_ver.replace(/_/g, '.');
            }
            else if (ua.indexOf('Mac OS X') !== -1) {
                event.os = 'mac';
                event.os_ver = _regexGet(ua, /Mac OS X ([^ ;)]*)/, 'unknown');
                event.os_ver = event.os_ver.replace(/_/g, '.');
                event.os_ver = event.os_ver.replace(/\.0$/, '');
            }
            else if (ua.indexOf('Android') !== -1) {
                event.os = 'android';
                event.os_ver = _regexGet(ua, /Android ([^ ;)]*)/, 'unknown');
                event.os_ver = event.os_ver.replace(/_/g, '.');
            }
            else if (ua.indexOf('Linux') !== -1) {
                event.os = 'linux';
            }
            else if (ua.indexOf('X11') !== -1) {
                event.os = 'unix';
            }
        }
        if (!event.browser) {
            if (ua.indexOf('Edge') !== -1) {
                event.browser = 'edge';
                event.browser_ver = _regexGet(ua, /Edge\/([^ ;)]*)/, 'unknown');
            }
            else if (ua.indexOf('Chrome') !== -1) {
                event.browser = 'chrome';
                event.browser_ver = _regexGet(ua, /Chrome\/([^ ;)]*)/, 'unknown');
            }
            else if (ua.indexOf('CriOS') !== -1) {
                event.browser = 'chrome';
                event.browser_ver = _regexGet(ua, /CriOS\/([^ ;)]*)/, 'unknown');
            }
            else if (ua.indexOf('Firefox') !== -1) {
                event.browser = 'firefox';
                event.browser_ver = _regexGet(ua, /Firefox\/([^ ;)]*)/, 'unknown');
            }
            else if (ua.indexOf('Android') !== -1) {
                event.browser = 'android';
                event.browser_ver = _regexGet(ua, /Version\/([^ ;)]*)/, 'unknown');
            }
            else if (ua.indexOf('Safari') !== -1) {
                event.browser = 'safari';
                event.browser_ver = _regexGet(ua, /Version\/([^ ;)]*)/, 'unknown');
            }
            else if (ua.indexOf('Trident') !== -1) {
                event.browser = 'ie';
                event.browser_ver = _regexGet(ua, /rv:([^ ;)]*)/, 'unknown');
            }
            else if (ua.indexOf('MSIE') !== -1) {
                event.browser = 'ie';
                event.browser_ver = _regexGet(ua, /MSIE ([^ ;)]*)/, 'unknown');
            }
            else if (ua.indexOf('MessengerForiOS') !== -1) {
                event.browser = 'fbmessenger';
                event.browser_ver = _regexGet(ua, /FBAV\/([^ ;)]*)/, 'unknown');
            }
            else if (ua.indexOf('FB_IAB/MESSENGER') !== -1) {
                event.browser = 'fbmessenger';
                event.browser_ver = _regexGet(ua, /FBAV\/([^ ;)]*)/, 'unknown');
            }
        }
        if (!event.device_type) {
            event.device_type = 'desktop';
            if (ua.indexOf('iPod') !== -1) {
                event.device_type = 'ipod';
            }
            else if (ua.indexOf('iPhone') !== -1) {
                event.device_type = 'iphone';
            }
            else if (ua.indexOf('iPad') !== -1) {
                event.device_type = 'ipad';
            }
            else if (ua.indexOf('Android') !== -1) {
                if (ua.indexOf('Mobile') === -1) {
                    event.device_type = 'android_tablet';
                }
                else {
                    event.device_type = 'android';
                }
            }
            else if (ua.indexOf('Mobile') !== -1) {
                event.device_type = 'mobile';
            }
        }
        if (!event.device_family) {
            event.device_family = event.device_type || 'desktop';
        }
    }
}
function _regexGet(haystack, regex, def) {
    let ret = def;
    const matches = haystack.match(regex);
    if (matches && matches.length > 1 && matches[1] !== undefined) {
        ret = matches[1];
    }
    return ret;
}

// Default instance and bound methods
const defaultObject = create();
const init = DataCortex.prototype.init.bind(defaultObject);
const setDeviceTag = DataCortex.prototype.setDeviceTag.bind(defaultObject);
const setUserTag = DataCortex.prototype.setUserTag.bind(defaultObject);
const flush = DataCortex.prototype.flush.bind(defaultObject);
const install = DataCortex.prototype.install.bind(defaultObject);
const dau = DataCortex.prototype.dau.bind(defaultObject);
const event = DataCortex.prototype.event.bind(defaultObject);
const economy = DataCortex.prototype.economy.bind(defaultObject);
const messageSend = DataCortex.prototype.messageSend.bind(defaultObject);
const messageClick = DataCortex.prototype.messageClick.bind(defaultObject);
const log = DataCortex.prototype.log.bind(defaultObject);
const logEvent = DataCortex.prototype.logEvent.bind(defaultObject);
var index = {
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

exports.DataCortex = DataCortex;
exports.create = create;
exports.createLogger = createLogger;
exports.dau = dau;
exports.default = index;
exports.defaultObject = defaultObject;
exports.economy = economy;
exports.event = event;
exports.flush = flush;
exports.init = init;
exports.install = install;
exports.log = log;
exports.logEvent = logEvent;
exports.messageClick = messageClick;
exports.messageSend = messageSend;
exports.setDeviceTag = setDeviceTag;
exports.setUserTag = setUserTag;
