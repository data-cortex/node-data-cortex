export const STRING_PROP_LIST = [
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
export const NUMBER_PROP_LIST = [
  'float1',
  'float2',
  'float3',
  'float4',
  'spend_amount',
];
export const OTHER_PROP_LIST = ['type', 'event_index', 'event_datetime', 'to_list'];
export const DEFAULT_BUNDLE_PROP_LIST = [
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

export const EVENT_PROP_LIST: string[] = [...STRING_PROP_LIST, ...NUMBER_PROP_LIST, ...OTHER_PROP_LIST];
export const BUNDLE_PROP_LIST: string[] = [...EVENT_PROP_LIST, ...DEFAULT_BUNDLE_PROP_LIST];

export const LOG_NUMBER_PROP_LIST = ['response_bytes', 'response_ms'];
export const LOG_STRING_PROP_MAP: Record<string, number> = {
  hostname: 64,
  filename: 256,
  log_level: 64,
  device_tag: 62,
  user_tag: 62,
  remote_address: 64,
  log_line: 65535,
};
export const LOG_OTHER_PROP_LIST = [
  'event_datetime',
  'device_type',
  'os',
  'os_ver',
  'browser',
  'browser_ver',
  'country',
  'language',
];

export const LOG_PROP_LIST = LOG_NUMBER_PROP_LIST.concat(Object.keys(LOG_STRING_PROP_MAP), LOG_OTHER_PROP_LIST);
