'use strict';

const _ = require('lodash');
const request = require('request');

exports.init = init;
exports.flush = flush;
exports.isReady = isReady;
exports.event = event;
exports.economy = economy;

const EVENT_SEND_COUNT = 10;
const DELAY_MS = 500;

const STRING_PROP_LIST = [
  'kingdom',
  'phylum',
  'class',
  'order',
  'family',
  'genus',
  'species',
  'group_tag',
  'spend_currency',
  'spend_type',
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
  'country',
  'geo_ip_address',
  'language',
  'group_tag',
];

const EVENT_PROP_LIST = _.union(
  STRING_PROP_LIST,
  NUMBER_PROP_LIST,
  OTHER_PROP_LIST
);

const BUNDLE_PROP_LIST = _.union(
  EVENT_PROP_LIST,
  DEFAULT_BUNDLE_PROP_LIST
);

const API_BASE_URL = "https://api.data-cortex.com";

let g_apiBaseUrl = API_BASE_URL;

let g_isReady = false;
let g_isSending = false;
let g_timeout = false;

let g_apiKey = false;
let g_orgName = false;
let g_appVer = "0";

let g_userTag = false;
let g_eventList = [];
let g_nextIndex = 0;

let g_delayCount = 0;

let g_defaultBundle = {}

function init(opts,done) {
  if (!done) {
    done = function() {};
  }
  if (!opts || !opts.apiKey) {
    throw new Error('opts.apiKey is required');
  }
  if (!opts || !opts.orgName) {
    throw new Error('opts.orgName is required');
  }

  g_apiKey = opts.apiKey;
  g_orgName = opts.orgName;

  g_apiBaseUrl = opts.baseUrl || API_BASE_URL;

  g_defaultBundle = {
    app_ver: opts.appVer || "0",
    device_type: opts.deviceType || "",
    os: opts.os || "",
    os_ver: opts.osVer || "",
    language: opts.language || "zz",
  };

  if (opts.serverVer) {
    g_defaultBundle.server_ver = opts.serverVer;
  }

  if (!opts.noHupHandler) {
    process.on('SIGHUP',flush);
  }

  g_isReady = true;
  done();
}

function event(props) {
  if (!props || typeof props !== 'object') {
    throw new Error('props must be an object');
  }
  _internalEventAdd(props,"event");
}

function economy(props) {
  if (!props || typeof props != 'object') {
    throw new Error('props must be an object');
  }
  if (!props.spend_currency) {
    throw new Error('spend_currency is required');
  }
  if (typeof props.spend_amount != 'number') {
    throw new Error('spend_amount is required');
  }
  _internalEventAdd(props,"economy");
}

function flush() {
  _sendEvents();
}

function isReady() {
  return g_isReady;
}

function _internalEventAdd(input_props,type) {
  if (!input_props.device_tag) {
    throw new Error('device_tag is required');
  }

  const props = _.extend({},input_props);
  props.type = type;
  props.event_index = g_nextIndex++;
  if (!props.event_datetime) {
    props.event_datetime = (new Date()).toISOString();
  }

  _.each(STRING_PROP_LIST,(p) => {
    if (p in props) {
      let val = props[p];
      val.toString().slice(0,32);
      props[p] = val;
    }
  });
  _.each(NUMBER_PROP_LIST,(p) => {
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
  g_eventList.push(_.pick(props,BUNDLE_PROP_LIST));
  _sendEventsLater();
}

function _sendEventsLater(delay) {
  if (!delay) {
    delay = 0;
  }
  if (!g_timeout && g_isReady && !g_isSending) {
    g_timeout = setTimeout(() => {
      g_timeout = false;
      _sendEvents();
    },delay);
  }
}
function _sendEvents() {
  if (g_isReady && !g_isSending && g_eventList.length > 0) {
    g_isSending = true;

    const events = [];
    _.some(g_eventList,(e) => {
      if (events.length == 0) {
        events.push(e);
      } else if (_defaultBundleEqual(events[0],e)) {
        events.push(e);
      }
      return events.length < EVENT_SEND_COUNT;
    });
    const default_props = _.pick(events[0],DEFAULT_BUNDLE_PROP_LIST);
    const bundle = _.extend({},g_defaultBundle,default_props,{
      api_key: g_apiKey,
    });
    bundle.events = _.map(events,(e) => _.pick(e,EVENT_PROP_LIST));

    const current_time = encodeURIComponent((new Date()).toISOString());
    const url = g_apiBaseUrl
      + '/' + g_orgName + '/1/track'
      + "?current_time=" + current_time;

    const opts = {
      url: url,
      method: 'POST',
      body: bundle,
      json: true,
    };

    request(opts,(err,response,body) => {
      let remove = true;
      const status = response.statusCode;
      if (err) {
        remove = false;
        g_delayCount++;
      } else if (status == 400) {
        _errorLog("Bad request, please check parameters, error:",body);
      } else if (status == 403) {
        _errorLog("Bad API Key, error:",body);
        g_isReady = false;
      } else if (status == 409) {
        // Dup send?
      } else if (status != 200) {
        remove = false;
        g_delayCount++;
      } else {
        g_delayCount = 0;
      }

      if (remove) {
        _removeEvents(bundle.events);
      }

      g_isSending = false;
      if (g_eventList.length > 0) {
        _sendEventsLater(g_delayCount * DELAY_MS);
      }
    });
  }
}

function _removeEvents(event_list) {
  g_eventList = _.filter(g_eventList,(e) => {
    return !_.some(event_list,(e2) => {
      return e.event_index == e2.event_index;
    });
  });
}

function _defaultBundleEqual(a,b) {
  return _.all(DEFAULT_BUNDLE_PROP_LIST,(prop) => a[prop] == b[prop]);
}

function _errorLog() {
  const args = ["Data Cortex Error:"];
  args.push.apply(args,arguments);
  console.error.apply(console,args);
}
