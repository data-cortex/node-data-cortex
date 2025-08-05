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
const OTHER_PROP_LIST = [
    'type',
    'event_index',
    'event_datetime',
    'to_list',
];
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
const EVENT_PROP_LIST = [
    ...STRING_PROP_LIST,
    ...NUMBER_PROP_LIST,
    ...OTHER_PROP_LIST,
];
const BUNDLE_PROP_LIST = [
    ...EVENT_PROP_LIST,
    ...DEFAULT_BUNDLE_PROP_LIST,
];
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

// eslint-disable-next-line @typescript-eslint/no-require-imports
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
    errorLog;
    constructor() {
        this.apiBaseUrl = API_BASE_URL;
        this.isReady = false;
        this.isSending = false;
        this.timeout = false;
        this.apiKey = false;
        this.orgName = false;
        this.appVer = '0';
        this.eventList = [];
        this.nextIndex = 0;
        this.delayCount = 0;
        this.defaultBundle = {};
        this.logList = [];
        this.logTimeout = false;
        this.isLogSending = false;
        this.logDelayCount = 0;
        this.defaultLogBundle = {};
        this.errorLog = _errorLog;
        return this;
    }
    init(opts) {
        if (!opts || !opts.apiKey) {
            throw new Error('opts.apiKey is required');
        }
        if (!opts || !opts.orgName) {
            throw new Error('opts.orgName is required');
        }
        this.apiKey = opts.apiKey;
        this.orgName = opts.orgName;
        this.appVer = opts.appVer || '0';
        this.apiBaseUrl = opts.baseUrl || API_BASE_URL;
        // Set errorLog function if provided, otherwise keep default
        if (opts.errorLog) {
            this.errorLog = opts.errorLog;
        }
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
        if (!props || typeof props !== 'object') {
            throw new Error('props must be an object');
        }
        if (!props.spend_currency) {
            throw new Error('spend_currency is required');
        }
        if (typeof props.spend_amount !== 'number') {
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
        this.logEvent({ log_line });
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
                const s = val && typeof val === 'object' && 'toString' in val
                    ? val.toString()
                    : String(val);
                if (s && s !== 'undefined' && s !== 'null') {
                    props[p] = s.slice(0, max_len);
                }
                else {
                    props[p] = undefined;
                }
            }
        });
        LOG_NUMBER_PROP_LIST.forEach((p) => {
            if (p in props) {
                const val = props[p];
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
                    props[p] = undefined;
                }
            }
        });
        const e = _pick(props, LOG_PROP_LIST);
        this.logList.push(e);
        this._sendLogsLater();
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
                const val = props[p];
                let numVal;
                if (typeof val !== 'number') {
                    numVal = parseFloat(String(val));
                }
                else {
                    numVal = val;
                }
                if (!isFinite(numVal)) {
                    props[p] = undefined;
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
            const url = `${this.apiBaseUrl}/${this.orgName}/1/track` +
                `?current_time=${current_time}`;
            _request({ url, body: bundle }, (err, body) => {
                let remove = true;
                if (err === 400) {
                    this.errorLog('Bad request, please check parameters, error:', body);
                }
                else if (err === 403) {
                    this.errorLog('Bad API Key, error:', body);
                    this.isReady = false;
                }
                else if (err === 409) ;
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
        this.eventList = this.eventList.filter((e) => !event_list.some((e2) => e.event_index === e2.event_index));
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
            const url = `${this.apiBaseUrl}/${this.orgName}/1/app_log`;
            _request({ url, body: bundle }, (err, body) => {
                let remove = true;
                if (err === 400) {
                    this.errorLog('Bad request, please check parameters, error:', body);
                }
                else if (err === 403) {
                    this.errorLog('Bad API Key, error:', body);
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

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var onFinished$1 = {exports: {}};

/*!
 * ee-first
 * Copyright(c) 2014 Jonathan Ong
 * MIT Licensed
 */

var eeFirst;
var hasRequiredEeFirst;

function requireEeFirst () {
	if (hasRequiredEeFirst) return eeFirst;
	hasRequiredEeFirst = 1;

	/**
	 * Module exports.
	 * @public
	 */

	eeFirst = first;

	/**
	 * Get the first event in a set of event emitters and event pairs.
	 *
	 * @param {array} stuff
	 * @param {function} done
	 * @public
	 */

	function first(stuff, done) {
	  if (!Array.isArray(stuff))
	    throw new TypeError('arg must be an array of [ee, events...] arrays')

	  var cleanups = [];

	  for (var i = 0; i < stuff.length; i++) {
	    var arr = stuff[i];

	    if (!Array.isArray(arr) || arr.length < 2)
	      throw new TypeError('each array member must be [ee, events...]')

	    var ee = arr[0];

	    for (var j = 1; j < arr.length; j++) {
	      var event = arr[j];
	      var fn = listener(event, callback);

	      // listen to the event
	      ee.on(event, fn);
	      // push this listener to the list of cleanups
	      cleanups.push({
	        ee: ee,
	        event: event,
	        fn: fn,
	      });
	    }
	  }

	  function callback() {
	    cleanup();
	    done.apply(null, arguments);
	  }

	  function cleanup() {
	    var x;
	    for (var i = 0; i < cleanups.length; i++) {
	      x = cleanups[i];
	      x.ee.removeListener(x.event, x.fn);
	    }
	  }

	  function thunk(fn) {
	    done = fn;
	  }

	  thunk.cancel = cleanup;

	  return thunk
	}

	/**
	 * Create the event listener.
	 * @private
	 */

	function listener(event, done) {
	  return function onevent(arg1) {
	    var args = new Array(arguments.length);
	    var ee = this;
	    var err = event === 'error'
	      ? arg1
	      : null;

	    // copy args to prevent arguments escaping scope
	    for (var i = 0; i < args.length; i++) {
	      args[i] = arguments[i];
	    }

	    done(err, ee, event, args);
	  }
	}
	return eeFirst;
}

/*!
 * on-finished
 * Copyright(c) 2013 Jonathan Ong
 * Copyright(c) 2014 Douglas Christopher Wilson
 * MIT Licensed
 */

var hasRequiredOnFinished;

function requireOnFinished () {
	if (hasRequiredOnFinished) return onFinished$1.exports;
	hasRequiredOnFinished = 1;

	/**
	 * Module exports.
	 * @public
	 */

	onFinished$1.exports = onFinished;
	onFinished$1.exports.isFinished = isFinished;

	/**
	 * Module dependencies.
	 * @private
	 */

	var asyncHooks = tryRequireAsyncHooks();
	var first = /*@__PURE__*/ requireEeFirst();

	/**
	 * Variables.
	 * @private
	 */

	/* istanbul ignore next */
	var defer = typeof setImmediate === 'function'
	  ? setImmediate
	  : function (fn) { process.nextTick(fn.bind.apply(fn, arguments)); };

	/**
	 * Invoke callback when the response has finished, useful for
	 * cleaning up resources afterwards.
	 *
	 * @param {object} msg
	 * @param {function} listener
	 * @return {object}
	 * @public
	 */

	function onFinished (msg, listener) {
	  if (isFinished(msg) !== false) {
	    defer(listener, null, msg);
	    return msg
	  }

	  // attach the listener to the message
	  attachListener(msg, wrap(listener));

	  return msg
	}

	/**
	 * Determine if message is already finished.
	 *
	 * @param {object} msg
	 * @return {boolean}
	 * @public
	 */

	function isFinished (msg) {
	  var socket = msg.socket;

	  if (typeof msg.finished === 'boolean') {
	    // OutgoingMessage
	    return Boolean(msg.finished || (socket && !socket.writable))
	  }

	  if (typeof msg.complete === 'boolean') {
	    // IncomingMessage
	    return Boolean(msg.upgrade || !socket || !socket.readable || (msg.complete && !msg.readable))
	  }

	  // don't know
	  return undefined
	}

	/**
	 * Attach a finished listener to the message.
	 *
	 * @param {object} msg
	 * @param {function} callback
	 * @private
	 */

	function attachFinishedListener (msg, callback) {
	  var eeMsg;
	  var eeSocket;
	  var finished = false;

	  function onFinish (error) {
	    eeMsg.cancel();
	    eeSocket.cancel();

	    finished = true;
	    callback(error);
	  }

	  // finished on first message event
	  eeMsg = eeSocket = first([[msg, 'end', 'finish']], onFinish);

	  function onSocket (socket) {
	    // remove listener
	    msg.removeListener('socket', onSocket);

	    if (finished) return
	    if (eeMsg !== eeSocket) return

	    // finished on first socket event
	    eeSocket = first([[socket, 'error', 'close']], onFinish);
	  }

	  if (msg.socket) {
	    // socket already assigned
	    onSocket(msg.socket);
	    return
	  }

	  // wait for socket to be assigned
	  msg.on('socket', onSocket);

	  if (msg.socket === undefined) {
	    // istanbul ignore next: node.js 0.8 patch
	    patchAssignSocket(msg, onSocket);
	  }
	}

	/**
	 * Attach the listener to the message.
	 *
	 * @param {object} msg
	 * @return {function}
	 * @private
	 */

	function attachListener (msg, listener) {
	  var attached = msg.__onFinished;

	  // create a private single listener with queue
	  if (!attached || !attached.queue) {
	    attached = msg.__onFinished = createListener(msg);
	    attachFinishedListener(msg, attached);
	  }

	  attached.queue.push(listener);
	}

	/**
	 * Create listener on message.
	 *
	 * @param {object} msg
	 * @return {function}
	 * @private
	 */

	function createListener (msg) {
	  function listener (err) {
	    if (msg.__onFinished === listener) msg.__onFinished = null;
	    if (!listener.queue) return

	    var queue = listener.queue;
	    listener.queue = null;

	    for (var i = 0; i < queue.length; i++) {
	      queue[i](err, msg);
	    }
	  }

	  listener.queue = [];

	  return listener
	}

	/**
	 * Patch ServerResponse.prototype.assignSocket for node.js 0.8.
	 *
	 * @param {ServerResponse} res
	 * @param {function} callback
	 * @private
	 */

	// istanbul ignore next: node.js 0.8 patch
	function patchAssignSocket (res, callback) {
	  var assignSocket = res.assignSocket;

	  if (typeof assignSocket !== 'function') return

	  // res.on('socket', callback) is broken in 0.8
	  res.assignSocket = function _assignSocket (socket) {
	    assignSocket.call(this, socket);
	    callback(socket);
	  };
	}

	/**
	 * Try to require async_hooks
	 * @private
	 */

	function tryRequireAsyncHooks () {
	  try {
	    return require('async_hooks')
	  } catch (e) {
	    return {}
	  }
	}

	/**
	 * Wrap function with async resource, if possible.
	 * AsyncResource.bind static method backported.
	 * @private
	 */

	function wrap (fn) {
	  var res;

	  // create anonymous resource
	  if (asyncHooks.AsyncResource) {
	    res = new asyncHooks.AsyncResource(fn.name || 'bound-anonymous-fn');
	  }

	  // incompatible node.js
	  if (!res || !res.runInAsyncScope) {
	    return fn
	  }

	  // return bound function
	  return res.runInAsyncScope.bind(res, fn, null)
	}
	return onFinished$1.exports;
}

var onFinishedExports = /*@__PURE__*/ requireOnFinished();
var onFinished = /*@__PURE__*/getDefaultExportFromCjs(onFinishedExports);

function createLogger(params) {
    const { dataCortex, prepareEvent, logConsole } = params;
    return (req, res, next) => {
        const expressReq = req;
        const expressRes = res;
        const start_time = Date.now();
        onFinished(expressRes, (_err, res) => {
            const response_ms = Date.now() - start_time;
            const response_bytes = res.getHeader('content-length') || 0;
            const event_datetime = new Date();
            const event = {
                event_datetime,
                response_ms,
                response_bytes: typeof response_bytes === 'number' ? response_bytes : 0,
                log_level: String(res.statusCode),
                log_line: `${expressReq.method} ${expressReq.originalUrl} HTTP/${expressReq.httpVersionMajor}.${expressReq.httpVersionMinor}`,
            };
            if (expressReq.ip) {
                event.remote_address = expressReq.ip;
            }
            const referrer = expressReq.get('referrer');
            if (referrer) {
                event.filename = referrer;
            }
            const ua = expressReq.get('user-agent');
            _fillUserAgent(event, ua);
            prepareEvent?.(expressReq, expressRes, event);
            dataCortex.logEvent(event);
            if (logConsole) {
                console.log(`${event.remote_address} - - [${event_datetime.toUTCString()}] "${event.log_line}" ${event.log_level} ${event.response_ms}(ms) "${event.filename ?? ''}" "${ua ?? ''}"`);
            }
        });
        next();
    };
}
function _fillUserAgent(event, ua) {
    if (ua) {
        if (!event.os) {
            if (ua.includes('Win')) {
                event.os = 'windows';
                event.os_ver = _regexGet(ua, /Windows NT ([^ ;)]*)/, 'unknown');
            }
            else if (ua.includes('iPhone OS')) {
                event.os = 'ios';
                event.os_ver = _regexGet(ua, /iPhone OS ([^ ;)]*)/, 'unknown');
                event.os_ver = event.os_ver.replace(/_/g, '.');
            }
            else if (ua.includes('iPad')) {
                event.os = 'ios';
                event.os_ver = _regexGet(ua, /CPU OS ([^ ;)]*)/, 'unknown');
                event.os_ver = event.os_ver.replace(/_/g, '.');
            }
            else if (ua.includes('Mac OS X')) {
                event.os = 'mac';
                event.os_ver = _regexGet(ua, /Mac OS X ([^ ;)]*)/, 'unknown');
                event.os_ver = event.os_ver.replace(/_/g, '.');
                event.os_ver = event.os_ver.replace(/\.0$/, '');
            }
            else if (ua.includes('Android')) {
                event.os = 'android';
                event.os_ver = _regexGet(ua, /Android ([^ ;)]*)/, 'unknown');
                event.os_ver = event.os_ver.replace(/_/g, '.');
            }
            else if (ua.includes('Linux')) {
                event.os = 'linux';
            }
            else if (ua.includes('X11')) {
                event.os = 'unix';
            }
        }
        if (!event.browser) {
            if (ua.includes('Edge')) {
                event.browser = 'edge';
                event.browser_ver = _regexGet(ua, /Edge\/([^ ;)]*)/, 'unknown');
            }
            else if (ua.includes('Chrome')) {
                event.browser = 'chrome';
                event.browser_ver = _regexGet(ua, /Chrome\/([^ ;)]*)/, 'unknown');
            }
            else if (ua.includes('CriOS')) {
                event.browser = 'chrome';
                event.browser_ver = _regexGet(ua, /CriOS\/([^ ;)]*)/, 'unknown');
            }
            else if (ua.includes('Firefox')) {
                event.browser = 'firefox';
                event.browser_ver = _regexGet(ua, /Firefox\/([^ ;)]*)/, 'unknown');
            }
            else if (ua.includes('Android')) {
                event.browser = 'android';
                event.browser_ver = _regexGet(ua, /Version\/([^ ;)]*)/, 'unknown');
            }
            else if (ua.includes('Safari')) {
                event.browser = 'safari';
                event.browser_ver = _regexGet(ua, /Version\/([^ ;)]*)/, 'unknown');
            }
            else if (ua.includes('Trident')) {
                event.browser = 'ie';
                event.browser_ver = _regexGet(ua, /rv:([^ ;)]*)/, 'unknown');
            }
            else if (ua.includes('MSIE')) {
                event.browser = 'ie';
                event.browser_ver = _regexGet(ua, /MSIE ([^ ;)]*)/, 'unknown');
            }
            else if (ua.includes('MessengerForiOS')) {
                event.browser = 'fbmessenger';
                event.browser_ver = _regexGet(ua, /FBAV\/([^ ;)]*)/, 'unknown');
            }
            else if (ua.includes('FB_IAB/MESSENGER')) {
                event.browser = 'fbmessenger';
                event.browser_ver = _regexGet(ua, /FBAV\/([^ ;)]*)/, 'unknown');
            }
        }
        if (!event.device_type) {
            event.device_type = 'desktop';
            if (ua.includes('iPod')) {
                event.device_type = 'ipod';
            }
            else if (ua.includes('iPhone')) {
                event.device_type = 'iphone';
            }
            else if (ua.includes('iPad')) {
                event.device_type = 'ipad';
            }
            else if (ua.includes('Android')) {
                if (!ua.includes('Mobile')) {
                    event.device_type = 'android_tablet';
                }
                else {
                    event.device_type = 'android';
                }
            }
            else if (ua.includes('Mobile')) {
                event.device_type = 'mobile';
            }
        }
        if (!event['device_family']) {
            event['device_family'] = event.device_type || 'desktop';
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
