import * as https from 'node:https';
import * as os from 'node:os';
import {
  STRING_PROP_LIST,
  NUMBER_PROP_LIST,
  OTHER_PROP_LIST,
  DEFAULT_BUNDLE_PROP_LIST,
  EVENT_PROP_LIST,
  BUNDLE_PROP_LIST,
  LOG_NUMBER_PROP_LIST,
  LOG_STRING_PROP_MAP,
  LOG_OTHER_PROP_LIST,
  LOG_PROP_LIST,
} from './constants';

const { version } = require('../package.json');
const UAS = `node-data-cortex/${version}`;

const EVENT_SEND_COUNT = 10;
const LOG_SEND_COUNT = 100;
const DELAY_MS = 500;
const REST_TIMEOUT = 5 * 1000;

const API_BASE_URL = 'https://api.data-cortex.com';

export class DataCortex {
  apiBaseUrl: string;
  isReady: boolean;
  isSending: boolean;
  timeout: NodeJS.Timeout | false;
  apiKey: string | false;
  orgName: string | false;
  appVer: string;
  serverVer: string;
  userTag: boolean;
  eventList: any[];
  nextIndex: number;
  delayCount: number;
  defaultBundle: any;
  logList: any[];
  logTimeout: NodeJS.Timeout | false;
  isLogSending: boolean;
  logDelayCount: number;
  defaultLogBundle: any;
  hasHupHandler: boolean = false;

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

    return this;
  }

  init(opts: any, done: () => void) {
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
    } else {
      this.defaultLogBundle.hostname = os.hostname();
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

  setDeviceTag(tag: string) {
    if (tag) {
      this.defaultBundle.device_tag = tag;
    } else {
      delete this.defaultBundle.device_tag;
    }
  }

  setUserTag(tag: string) {
    if (tag) {
      this.defaultBundle.user_tag = tag;
    } else {
      delete this.defaultBundle.user_tag;
    }
  }

  install(props: any) {
    if (!props || typeof props !== 'object') {
      throw new Error('props must be an object');
    }
    this._internalEventAdd(props, 'install');
  }

  dau(props: any) {
    if (!props || typeof props !== 'object') {
      throw new Error('props must be an object');
    }
    this._internalEventAdd(props, 'dau');
  }

  event(props: any) {
    if (!props || typeof props !== 'object') {
      throw new Error('props must be an object');
    }
    this._internalEventAdd(props, 'event');
  }

  messageSend(props: any) {
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

  messageClick(props: any) {
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

  economy(props: any) {
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

  

  _internalEventAdd(input_props: any, type: string) {
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
  }

  _sendEventsLater(delay?: number) {
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

      const events: any[] = [];
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

      _request({ url, body: bundle }, (err, body) => {
        let remove = true;
        if (err == 400) {
          _errorLog('Bad request, please check parameters, error:', body);
        } else if (err == 403) {
          _errorLog('Bad API Key, error:', body);
          this.isReady = false;
        } else if (err == 409) {
          // Dup send?
        } else if (err) {
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
  }

  _removeEvents(event_list: any[]) {
    this.eventList = this.eventList.filter((e) => {
      return !event_list.some((e2) => {
        return e.event_index == e2.event_index;
      });
    });
  }

  log(...args: any[]) {
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
      } else if (typeof arg === 'object') {
        try {
          log_line += JSON.stringify(arg);
        } catch (_e) {
          log_line += arg;
        }
      } else {
        log_line += arg;
      }
    }
    this.logEvent({ log_line });
  }

  logEvent(props: any) {
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
  }

  _removeLogs(events: any[]) {
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

      const bundle = Object.assign(
        {},
        this.defaultBundle,
        this.defaultLogBundle,
        {
          api_key: this.apiKey,
          app_ver: this.appVer,
          events: this.logList.slice(0, LOG_SEND_COUNT),
        }
      );
      const url = this.apiBaseUrl + '/' + this.orgName + '/1/app_log';
      _request({ url, body: bundle }, (err, body) => {
        let remove = true;
        if (err === 400) {
          _errorLog('Bad request, please check parameters, error:', body);
        } else if (err === 403) {
          _errorLog('Bad API Key, error:', body);
        } else if (err === 409) {
          // Dup send?
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
  }
}



function _isError(e: any) {
  return (
    e &&
    e.stack &&
    e.message &&
    typeof e.stack === 'string' &&
    typeof e.message === 'string'
  );
}
function _defaultBundleEqual(a: any, b: any) {
  return DEFAULT_BUNDLE_PROP_LIST.every((prop) => a[prop] === b[prop]);
}
function _errorLog(...args: any[]) {
  const new_args = ['Data Cortex Error:'];
  new_args.push.apply(new_args, args);
  console.error.apply(console, new_args);
}
function _pick(obj: any, prop_list: string[]) {
  const new_obj: any = {};
  prop_list.forEach((prop) => {
    const val = obj[prop];
    if (val !== undefined) {
      new_obj[prop] = val;
    }
  });
  return new_obj;
}
function _objectEach(object: any, callback: (value: any, key: string, object: any) => void) {
  Object.keys(object).forEach((key) => {
    const value = object[key];
    callback(value, key, object);
  });
}
function _request(params: any, done: (err: any, body?: any) => void) {
  let is_done = false;
  const opts: https.RequestOptions = {
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
  } catch (e) {
    is_done = true;
    done('bad_body_json', e);
  }

  let err: number | Error | null = null;
  let response_body = '';
  const req = https.request(params.url, opts, (res) => {
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
export function create() {
  return new DataCortex();
}
export default { DataCortex, create };
