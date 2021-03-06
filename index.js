'use strict';

const request = require('request');

const EVENT_SEND_COUNT = 10;
const LOG_SEND_COUNT = 100;
const DELAY_MS = 500;
const REST_TIMEOUT = 5 * 1000;

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

const EVENT_PROP_LIST = [].concat(
  STRING_PROP_LIST,
  NUMBER_PROP_LIST,
  OTHER_PROP_LIST
);
const BUNDLE_PROP_LIST = [].concat(EVENT_PROP_LIST, DEFAULT_BUNDLE_PROP_LIST);

const API_BASE_URL = 'https://api.data-cortex.com';

function DataCortex() {
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

  return this;
}

function create() {
  return new DataCortex();
}

DataCortex.prototype.init = function (opts, done) {
  if (!done) {
    done = function () {};
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

  if (!opts.noHupHandler) {
    process.on('SIGHUP', () => this.flush());
  }

  this.isReady = true;
  done();
};

DataCortex.prototype.install = function (props) {
  if (!props || typeof props !== 'object') {
    throw new Error('props must be an object');
  }
  this._internalEventAdd(props, 'install');
};
DataCortex.prototype.dau = function (props) {
  if (!props || typeof props !== 'object') {
    throw new Error('props must be an object');
  }
  this._internalEventAdd(props, 'dau');
};
DataCortex.prototype.event = function (props) {
  if (!props || typeof props !== 'object') {
    throw new Error('props must be an object');
  }
  this._internalEventAdd(props, 'event');
};
DataCortex.prototype.messageSend = function (props) {
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
};
DataCortex.prototype.messageClick = function (props) {
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
};

DataCortex.prototype.economy = function (props) {
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
};

DataCortex.prototype.flush = function () {
  this._sendEvents();
};

DataCortex.prototype.isReady = function () {
  return this.isReady;
};

DataCortex.prototype._internalEventAdd = function (input_props, type) {
  if (!input_props.device_tag) {
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
      if (val && val.toString) {
        val = val.toString().slice(0, 32);
      } else {
        val = '';
      }
      props[p] = val;
    }
  });
  NUMBER_PROP_LIST.forEach((p) => {
    if (p in props) {
      let val = props[p];
      if (typeof val != 'number') {
        val = parseFloat(val);
      }
      if (!isFinite(val)) {
        delete props[val];
      } else {
        props[p] = val;
      }
    }
  });
  this.eventList.push(_pick(props, BUNDLE_PROP_LIST));
  this._sendEventsLater();
};

DataCortex.prototype._sendEventsLater = function (delay) {
  if (!delay) {
    delay = 0;
  }
  if (!this.timeout && this.isReady && !this.isSending) {
    this.timeout = setTimeout(() => {
      this.timeout = false;
      this._sendEvents();
    }, delay);
  }
};
DataCortex.prototype._sendEvents = function () {
  if (this.isReady && !this.isSending && this.eventList.length > 0) {
    this.isSending = true;

    const events = [];
    this.eventList.some((e) => {
      if (events.length === 0) {
        events.push(e);
      } else if (_defaultBundleEqual(events[0], e)) {
        events.push(e);
      }
      return events.length < EVENT_SEND_COUNT;
    });
    const default_props = _pick(events[0], DEFAULT_BUNDLE_PROP_LIST);
    const bundle = Object.assign({}, this.defaultBundle, default_props, {
      api_key: this.apiKey,
    });
    bundle.events = events.map((e) => _pick(e, EVENT_PROP_LIST));

    const current_time = encodeURIComponent(new Date().toISOString());
    const url =
      this.apiBaseUrl +
      '/' +
      this.orgName +
      '/1/track' +
      '?current_time=' +
      current_time;

    const opts = {
      url: url,
      method: 'POST',
      body: bundle,
      json: true,
      timeout: REST_TIMEOUT,
    };
    request(opts, (err, response, body) => {
      let remove = true;
      const status = response && response.statusCode;
      if (err) {
        remove = false;
        this.delayCount++;
      } else if (status == 400) {
        _errorLog('Bad request, please check parameters, error:', body);
      } else if (status == 403) {
        _errorLog('Bad API Key, error:', body);
        this.isReady = false;
      } else if (status == 409) {
        // Dup send?
      } else if (status != 200) {
        remove = false;
        this.delayCount++;
      } else {
        this.delayCount = 0;
      }

      if (remove) {
        this._removeEvents(bundle.events);
      }

      this.isSending = false;
      if (this.eventList.length > 0) {
        this._sendEventsLater(this.delayCount * DELAY_MS);
      }
    });
  }
};

DataCortex.prototype._removeEvents = function (event_list) {
  this.eventList = this.eventList.filter((e) => {
    return !event_list.some((e2) => {
      return e.event_index == e2.event_index;
    });
  });
};

DataCortex.prototype.log = function () {
  if (!arguments || arguments.length === 0) {
    throw new Error('log must have arguments');
  }
  let log_line = '';
  for (let i = 0; i < arguments.length; i++) {
    const arg = arguments[i];
    if (i > 0) {
      log_line += ' ';
    }

    if (_isError(arg)) {
      log_line += arg.stack;
    } else if (typeof arg === 'object') {
      try {
        log_line += JSON.stringify(arg);
      } catch (e) {
        log_line += arg;
      }
    } else {
      log_line += arg;
    }
  }
  this.logEvent({ log_line });
};

const LOG_NUMBER_PROP_LIST = ['repsonse_bytes', 'response_ms'];

const LOG_STRING_PROP_MAP = {
  hostname: 64,
  filename: 256,
  log_level: 64,
  device_tag: 62,
  user_tag: 62,
  remote_address: 64,
  log_line: 65535,
};

const LOG_OTHER_PROP_LIST = ['event_datetime'];

const LOG_PROP_LIST = _union(
  LOG_NUMBER_PROP_LIST,
  Object.keys(LOG_STRING_PROP_MAP),
  LOG_OTHER_PROP_LIST
);

DataCortex.prototype.logEvent = function (props) {
  if (!props || typeof props !== 'object') {
    throw new Error('props must be an object.');
  }

  if (!props.event_datetime) {
    props.event_datetime = new Date().toISOString();
  }

  _objectEach(LOG_STRING_PROP_MAP, (max_len, p) => {
    if (p in props) {
      const val = props[p];
      const s = val && val.toString();
      if (s) {
        props[p] = s.slice(0, max_len);
      } else {
        delete props[p];
      }
    }
  });
  LOG_NUMBER_PROP_LIST.forEach((p) => {
    if (p in props) {
      let val = props[p];
      if (typeof val !== 'number') {
        val = parseFloat(val);
      }
      if (isFinite(val)) {
        props[p] = val;
      } else {
        delete props[p];
      }
    }
  });

  const e = _pick(props, LOG_PROP_LIST);
  this.logList.push(e);
  this._sendLogsLater();
  return e;
};

DataCortex.prototype._removeLogs = function (events) {
  this.logList.splice(0, events.length);
};

function _isError(e) {
  return (
    e &&
    e.stack &&
    e.message &&
    typeof e.stack === 'string' &&
    typeof e.message === 'string'
  );
}

DataCortex.prototype._sendLogsLater = function (delay = 0) {
  if (!this.logTimeout && this.isReady && !this.isLogSending) {
    this.logTimeout = setTimeout(() => {
      this.logTimeout = false;
      this._sendLogs();
    }, delay);
  }
};
DataCortex.prototype._sendLogs = function () {
  if (this.isReady && !this.isLogSending && this.logList.length > 0) {
    this.isLogSending = true;

    const bundle = {
      api_key: this.apiKey,
      app_ver: this.serverVer || this.appVer,
      events: this.logList.slice(0, LOG_SEND_COUNT),
    };

    const url = this.apiBaseUrl + '/' + this.orgName + '/1/app_log';

    const opts = {
      url: url,
      method: 'POST',
      body: bundle,
      json: true,
      timeout: REST_TIMEOUT,
    };
    request(opts, (err, response, body) => {
      const status = response && response.statusCode;
      let remove = true;
      if (err === 'status') {
        if (status === 400) {
          _errorLog('Bad request, please check parameters, error:', body);
        } else if (status === 403) {
          _errorLog('Bad API Key, error:', body);
        } else if (status === 409) {
          // Dup send?
        } else {
          remove = false;
          this.logDelayCount++;
        }
      } else if (err) {
        remove = false;
        this.logDelayCount++;
      } else {
        this.logDelayCount = 0;
      }
      if (remove) {
        this._removeLogs(bundle.events);
      }

      this.isLogSending = false;
      if (this.logList.length > 0) {
        this._sendLogsLater(this.logDelayCount * DELAY_MS);
      }
    });
  }
};

function _defaultBundleEqual(a, b) {
  return DEFAULT_BUNDLE_PROP_LIST.every((prop) => a[prop] === b[prop]);
}

function _errorLog() {
  const args = ['Data Cortex Error:'];
  args.push.apply(args, arguments);
  console.error.apply(console, args);
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
    callback(value, key, object);
  });
}
function _union() {
  const dest = [];
  for (let i = 0; i < arguments.length; i++) {
    const array = arguments[i];
    Array.prototype.push.apply(dest, array);
  }
  return dest;
}

const g_singleObject = create();

exports.init = DataCortex.prototype.init.bind(g_singleObject);
exports.flush = DataCortex.prototype.flush.bind(g_singleObject);
exports.isReady = DataCortex.prototype.isReady.bind(g_singleObject);
exports.install = DataCortex.prototype.install.bind(g_singleObject);
exports.dau = DataCortex.prototype.dau.bind(g_singleObject);
exports.event = DataCortex.prototype.event.bind(g_singleObject);
exports.economy = DataCortex.prototype.economy.bind(g_singleObject);
exports.messageSend = DataCortex.prototype.messageSend.bind(g_singleObject);
exports.messageClick = DataCortex.prototype.messageClick.bind(g_singleObject);
exports.log = DataCortex.prototype.log.bind(g_singleObject);
exports.create = create;
