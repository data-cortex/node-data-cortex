import { DataCortex, create } from '../dist/index.js';
import type {
  InitOptions,
  EventProps,
  MessageSendProps,
  EconomyProps,
  LogEventProps,
  MiddlewareLogEvent,
} from '../dist/index.js';

// Example of proper type usage
const dataCortex = create();

// InitOptions with proper typing
const initOptions: InitOptions = {
  apiKey: process.env.DC_API_KEY,
  orgName: 'your-org',
  appVer: '1.0.0',
  deviceTag: 'device-123',
};

dataCortex.init(initOptions);

// EventProps - only includes general event properties (no spend_amount, network, etc.)
const eventData: EventProps = {
  kingdom: 'game',
  phylum: 'action',
  class: 'shooter',
  float1: 123.45,
  device_tag: 'device-123',
};

dataCortex.event(eventData);

// MessageSendProps - requires network, from_tag, and to_list
const messageSendData: MessageSendProps = {
  network: 'facebook',
  from_tag: 'user-123',
  to_list: ['user-456', 'user-789'],
  kingdom: 'social',
  float1: 1.0,
};

dataCortex.messageSend(messageSendData);

// EconomyProps - requires spend_currency and spend_amount
const economyData: EconomyProps = {
  spend_currency: 'USD',
  spend_amount: 9.99,
  spend_type: 'purchase',
  kingdom: 'shop',
  device_tag: 'device-123',
};

dataCortex.economy(economyData);

// LogEventProps for logging
const logData: LogEventProps = {
  log_level: 'info',
  log_line: 'User completed tutorial',
  device_tag: 'device-123',
  response_ms: 150,
};

dataCortex.logEvent(logData);

// MiddlewareLogEvent for logging
const middlewareLogData: MiddlewareLogEvent = {
  event_datetime: new Date(),
  response_ms: 150,
  response_bytes: 1024,
  log_level: 'info',
  log_line: 'User completed tutorial',
  device_tag: 'device-123',
};

dataCortex.logEvent(middlewareLogData);

// TypeScript will catch these errors at compile time:

// Error: Property 'spend_amount' does not exist on type 'EventProps'
// const invalidEvent: EventProps = {
//   kingdom: 'game',
//   spend_amount: 10.0  // This would cause a TypeScript error
// };

// Error: Property 'network' is missing in type
// const invalidMessageSend: MessageSendProps = {
//   from_tag: 'user-123',
//   to_list: ['user-456']
//   // Missing required 'network' property
// };

// Error: Type 'string' is not assignable to type 'number'
// const invalidEconomy: EconomyProps = {
//   spend_currency: 'USD',
//   spend_amount: 'invalid'  // Should be a number
// };

console.log('Type safety example completed successfully!');
