import * as https from 'node:https';
import * as os from 'node:os';

import {
  STRING_PROP_LIST,
  NUMBER_PROP_LIST,
  DEFAULT_BUNDLE_PROP_LIST,
  EVENT_PROP_LIST,
  BUNDLE_PROP_LIST,
  LOG_NUMBER_PROP_LIST,
  LOG_STRING_PROP_MAP,
  LOG_PROP_LIST,
} from './constants';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { version } = require('../package.json') as { version: string };

const UAS = `node-data-cortex/${version}`;

const EVENT_SEND_COUNT = 10;
const LOG_SEND_COUNT = 100;
const DELAY_MS = 500;
const REST_TIMEOUT = 5 * 1000;

const API_BASE_URL = 'https://api.data-cortex.com';

// Public type definitions for DataCortex API
export interface InitOptions {
  apiKey: string;
  orgName: string;
  appVer?: string;
  serverVer?: string;
  baseUrl?: string;
  deviceType?: string;
  os?: string;
  osVer?: string;
  language?: string;
  deviceTag?: string;
  userTag?: string;
  country?: string;
  hostname?: string;
  filename?: string;
  noHupHandler?: boolean;
  errorLog?: (...args: unknown[]) => void;
}

// Base properties that can be used in events
export interface BaseEventProps {
  [key: string]: unknown;
  kingdom?: string;
  phylum?: string;
  class?: string;
  order?: string;
  family?: string;
  genus?: string;
  species?: string;
  channel?: string;
  float1?: number;
  float2?: number;
  float3?: number;
  float4?: number;
  event_datetime?: string | Date;
  device_tag?: string;
  user_tag?: string;
}

// Specific props for DataCortex.event() - only includes general event properties
export type EventProps = BaseEventProps;

// Specific props for DataCortex.install() and DataCortex.dau()
export type InstallProps = BaseEventProps;

export type DauProps = BaseEventProps;

// Specific props for message-related events
export interface MessageSendProps extends BaseEventProps {
  network: string;
  from_tag: string;
  to_list: string[];
}

export interface MessageClickProps extends BaseEventProps {
  network: string;
  from_tag: string;
  to_tag: string;
}

// Specific props for economy events
export interface EconomyProps extends BaseEventProps {
  spend_currency: string;
  spend_amount: number;
  spend_type?: string;
}

// Log event properties
export interface LogEventProps {
  [key: string]: unknown;
  event_datetime?: string | Date;
  response_bytes?: number;
  response_ms?: number;
  hostname?: string;
  filename?: string;
  log_level?: string;
  device_tag?: string;
  user_tag?: string;
  remote_address?: string;
  log_line?: string;
  device_type?: string;
  os?: string;
  os_ver?: string;
  browser?: string;
  browser_ver?: string;
  country?: string;
  language?: string;
}

// Internal types (not exported as they're implementation details)
interface InternalEventProps extends BaseEventProps {
  [key: string]: unknown;
  spend_currency?: string;
  spend_type?: string;
  network?: string;
  from_tag?: string;
  to_tag?: string;
  to_list?: unknown;
  spend_amount?: number;
  type?: string;
  event_index?: number;
}

interface Bundle {
  [key: string]: unknown;
  api_key: string | false;
  app_ver?: string;
  server_ver?: string;
  config_ver?: string;
  user_tag?: string;
  device_tag?: string;
  device_type?: string;
  os?: string;
  os_ver?: string;
  browser?: string;
  browser_ver?: string;
  marketplace?: string;
  country?: string;
  geo_ip_address?: string;
  language?: string;
  group_tag?: string;
  events?: InternalEventProps[];
}

interface LogBundle extends Bundle {
  hostname?: string;
  filename?: string;
  events?: LogEventProps[];
}

interface RequestParams {
  url: string;
  body: Bundle | LogBundle;
}

type RequestCallback = (
  err: number | string | Error | null,
  body?: string,
) => void;

export class DataCortex {
  private apiBaseUrl: string;
  private isReady: boolean;
  private isSending: boolean;
  private timeout: NodeJS.Timeout | false;
  private apiKey: string | false;
  private orgName: string | false;
  private appVer: string;
  private eventList: InternalEventProps[];
  private nextIndex: number;
  private delayCount: number;
  private defaultBundle: Partial<Bundle>;
  private logList: LogEventProps[];
  private logTimeout: NodeJS.Timeout | false;
  private isLogSending: boolean;
  private logDelayCount: number;
  private defaultLogBundle: Partial<LogBundle>;
  private hasHupHandler = false;
  private errorLog: (...args: unknown[]) => void;

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

  public init(opts: InitOptions): void {
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
  }

  public setDeviceTag(tag: string): void {
    if (tag) {
      this.defaultBundle.device_tag = tag;
    } else {
      delete this.defaultBundle.device_tag;
    }
  }

  public setUserTag(tag: string): void {
    if (tag) {
      this.defaultBundle.user_tag = tag;
    } else {
      delete this.defaultBundle.user_tag;
    }
  }

  public install(props: InstallProps): void {
    if (!props || typeof props !== 'object') {
      throw new Error('props must be an object');
    }
    this._internalEventAdd(props, 'install');
  }

  public dau(props: DauProps): void {
    if (!props || typeof props !== 'object') {
      throw new Error('props must be an object');
    }
    this._internalEventAdd(props, 'dau');
  }

  public event(props: EventProps): void {
    if (!props || typeof props !== 'object') {
      throw new Error('props must be an object');
    }
    this._internalEventAdd(props, 'event');
  }

  public messageSend(props: MessageSendProps): void {
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

  public messageClick(props: MessageClickProps): void {
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

  public economy(props: EconomyProps): void {
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

  public flush(): void {
    this._sendEvents();
    this._sendLogs();
  }

  public log(...args: unknown[]): void {
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
        log_line += (arg as Error).stack;
      } else if (typeof arg === 'object' && arg !== null) {
        try {
          log_line += JSON.stringify(arg);
        } catch (_e) {
          log_line += String(arg);
        }
      } else {
        log_line += String(arg);
      }
    }
    this.logEvent({ log_line });
  }

  public logEvent(props: LogEventProps): void {
    if (!props || typeof props !== 'object') {
      throw new Error('props must be an object.');
    }

    if (!props.event_datetime) {
      props.event_datetime = new Date().toISOString();
    }

    _objectEach(LOG_STRING_PROP_MAP, (max_len: number, p: string) => {
      if (p in props) {
        const val = props[p];
        const s =
          val && typeof val === 'object' && 'toString' in val
            ? val.toString()
            : String(val);
        if (s && s !== 'undefined' && s !== 'null') {
          props[p] = s.slice(0, max_len);
        } else {
          (props as Record<string, unknown>)[p] = undefined;
        }
      }
    });
    LOG_NUMBER_PROP_LIST.forEach((p) => {
      if (p in props) {
        const val = props[p];
        let numVal: number;
        if (typeof val !== 'number') {
          numVal = parseFloat(String(val));
        } else {
          numVal = val;
        }
        if (isFinite(numVal)) {
          props[p] = numVal;
        } else {
          (props as Record<string, unknown>)[p] = undefined;
        }
      }
    });

    const e = _pick(props, LOG_PROP_LIST);
    this.logList.push(e);
    this._sendLogsLater();
  }

  private _internalEventAdd(
    input_props: InternalEventProps,
    type: string,
  ): void {
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
        } else if (typeof val === 'string') {
          val = val.slice(0, 32);
        } else {
          val = '';
        }
        props[p] = val;
      }
    });
    NUMBER_PROP_LIST.forEach((p) => {
      if (p in props) {
        const val = props[p];
        let numVal: number;
        if (typeof val !== 'number') {
          numVal = parseFloat(String(val));
        } else {
          numVal = val;
        }
        if (!isFinite(numVal)) {
          (props as Record<string, unknown>)[p] = undefined;
        } else {
          props[p] = numVal;
        }
      }
    });
    this.eventList.push(_pick(props, BUNDLE_PROP_LIST));
    this._sendEventsLater();
  }

  private _sendEventsLater(delay?: number): void {
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

  private _sendEvents(): void {
    if (this.isReady && !this.isSending && this.eventList.length > 0) {
      this.isSending = true;

      const events: InternalEventProps[] = [];
      this.eventList.some((e) => {
        if (events.length === 0) {
          events.push(e);
        } else if (events[0] && _defaultBundleEqual(events[0], e)) {
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
      const bundle: Bundle = Object.assign(
        {},
        this.defaultBundle,
        default_props,
        {
          api_key: this.apiKey,
        },
      );
      bundle.events = events.map((e) => _pick(e, EVENT_PROP_LIST));

      const current_time = encodeURIComponent(new Date().toISOString());
      const url =
        `${this.apiBaseUrl}/${this.orgName}/1/track` +
        `?current_time=${current_time}`;

      _request({ url, body: bundle }, (err, body) => {
        let remove = true;
        if (err === 400) {
          this.errorLog('Bad request, please check parameters, error:', body);
        } else if (err === 403) {
          this.errorLog('Bad API Key, error:', body);
          this.isReady = false;
        } else if (err === 409) {
          // Dup send?
        } else if (err) {
          remove = false;
          this.delayCount++;
        } else {
          this.delayCount = 0;
        }

        if (remove && bundle.events) {
          this._removeEvents(bundle.events as InternalEventProps[]);
        }

        this.isSending = false;
        if (this.eventList.length > 0) {
          this._sendEventsLater(this.delayCount * DELAY_MS);
        }
      });
    }
  }

  private _removeEvents(event_list: InternalEventProps[]): void {
    this.eventList = this.eventList.filter(
      (e) => !event_list.some((e2) => e.event_index === e2.event_index),
    );
  }

  private _removeLogs(events: LogEventProps[]): void {
    this.logList.splice(0, events.length);
  }

  private _sendLogsLater(delay = 0): void {
    if (!this.logTimeout && this.isReady && !this.isLogSending) {
      this.logTimeout = setTimeout(() => {
        this.logTimeout = false;
        this._sendLogs();
      }, delay);
    }
  }

  private _sendLogs(): void {
    if (this.isReady && !this.isLogSending && this.logList.length > 0) {
      this.isLogSending = true;

      const bundle: LogBundle = Object.assign(
        {},
        this.defaultBundle,
        this.defaultLogBundle,
        {
          api_key: this.apiKey,
          app_ver: this.appVer,
          events: this.logList.slice(0, LOG_SEND_COUNT),
        },
      );
      const url = `${this.apiBaseUrl}/${this.orgName}/1/app_log`;
      _request({ url, body: bundle }, (err, body) => {
        let remove = true;
        if (err === 400) {
          this.errorLog('Bad request, please check parameters, error:', body);
        } else if (err === 403) {
          this.errorLog('Bad API Key, error:', body);
        } else if (err === 409) {
          // Dup send?
        } else if (err) {
          remove = false;
          this.logDelayCount++;
        } else {
          this.logDelayCount = 0;
        }
        if (remove && bundle.events) {
          this._removeLogs(bundle.events as LogEventProps[]);
        }

        this.isLogSending = false;
        if (this.logList.length > 0) {
          this._sendLogsLater(this.logDelayCount * DELAY_MS);
        }
      });
    }
  }
}

function _isError(e: unknown): e is Error {
  return (
    e !== null &&
    typeof e === 'object' &&
    'stack' in e &&
    'message' in e &&
    typeof (e as Error).stack === 'string' &&
    typeof (e as Error).message === 'string'
  );
}

function _defaultBundleEqual(
  a: InternalEventProps,
  b: InternalEventProps,
): boolean {
  return DEFAULT_BUNDLE_PROP_LIST.every((prop) => a[prop] === b[prop]);
}

function _errorLog(...args: unknown[]): void {
  const new_args: unknown[] = ['Data Cortex Error:'];
  new_args.push(...args);
  console.error(...new_args);
}

function _pick(
  obj: Record<string, unknown>,
  prop_list: string[],
): Record<string, unknown> {
  const new_obj: Record<string, unknown> = {};
  prop_list.forEach((prop) => {
    const val = obj[prop];
    if (val !== undefined) {
      new_obj[prop] = val;
    }
  });
  return new_obj;
}

function _objectEach(
  object: Record<string, number>,
  callback: (
    value: number,
    key: string,
    object: Record<string, number>,
  ) => void,
): void {
  Object.keys(object).forEach((key) => {
    const value = object[key];
    if (value !== undefined) {
      callback(value, key, object);
    }
  });
}

function _request(params: RequestParams, done: RequestCallback): void {
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
    done('bad_body_json', String(e));
    return;
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

export function create(): DataCortex {
  return new DataCortex();
}

export default { DataCortex, create };
