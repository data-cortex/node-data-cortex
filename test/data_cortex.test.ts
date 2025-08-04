import test from 'node:test';
import assert from 'node:assert';
import { DataCortex, create } from '../src/data_cortex';

const API_KEY = process.env.DC_API_KEY || 'test_api_key';
const ORG_NAME = 'test_org';

test('DataCortex constructor initializes with default values', () => {
  const dc = new DataCortex();
  assert.strictEqual(dc.isReady, false);
  assert.strictEqual(dc.isSending, false);
  assert.strictEqual(dc.apiKey, false);
  assert.strictEqual(dc.orgName, false);
  assert.strictEqual(dc.appVer, '0');
  assert.strictEqual(dc.serverVer, '');
  assert.strictEqual(dc.userTag, false);
  assert.deepStrictEqual(dc.eventList, []);
  assert.strictEqual(dc.nextIndex, 0);
  assert.strictEqual(dc.delayCount, 0);
  assert.deepStrictEqual(dc.defaultBundle, {});
  assert.deepStrictEqual(dc.logList, []);
  assert.strictEqual(dc.logTimeout, false);
  assert.strictEqual(dc.isLogSending, false);
  assert.strictEqual(dc.logDelayCount, 0);
  assert.deepStrictEqual(dc.defaultLogBundle, {});
});

test('create function returns new DataCortex instance', () => {
  const dc = create();
  assert.ok(dc instanceof DataCortex);
});

test('init throws error when apiKey is missing', () => {
  const dc = new DataCortex();
  assert.throws(() => {
    dc.init({ orgName: ORG_NAME } as any);
  }, /opts.apiKey is required/);
});

test('init throws error when orgName is missing', () => {
  const dc = new DataCortex();
  assert.throws(() => {
    dc.init({ apiKey: API_KEY } as any);
  }, /opts.orgName is required/);
});

test('init sets basic properties correctly', () => {
  const dc = new DataCortex();
  dc.init({
    apiKey: API_KEY,
    orgName: ORG_NAME,
    appVer: '1.0.0',
    serverVer: '2.0.0',
  });
  
  assert.strictEqual(dc.apiKey, API_KEY);
  assert.strictEqual(dc.orgName, ORG_NAME);
  assert.strictEqual(dc.appVer, '1.0.0');
  assert.strictEqual(dc.serverVer, '2.0.0');
  assert.strictEqual(dc.isReady, true);
});

test('init sets default bundle properties', () => {
  const dc = new DataCortex();
  dc.init({
    apiKey: API_KEY,
    orgName: ORG_NAME,
    appVer: '1.0.0',
    deviceType: 'mobile',
    os: 'ios',
    osVer: '15.0',
    language: 'en',
    deviceTag: 'device123',
    userTag: 'user456',
    country: 'US',
  });
  
  assert.strictEqual(dc.defaultBundle.app_ver, '1.0.0');
  assert.strictEqual(dc.defaultBundle.device_type, 'mobile');
  assert.strictEqual(dc.defaultBundle.os, 'ios');
  assert.strictEqual(dc.defaultBundle.os_ver, '15.0');
  assert.strictEqual(dc.defaultBundle.language, 'en');
  assert.strictEqual(dc.defaultBundle.device_tag, 'device123');
  assert.strictEqual(dc.defaultBundle.user_tag, 'user456');
  assert.strictEqual(dc.defaultBundle.country, 'US');
});

test('init sets default log bundle properties', () => {
  const dc = new DataCortex();
  dc.init({
    apiKey: API_KEY,
    orgName: ORG_NAME,
    hostname: 'test-host',
    filename: 'test-file.js',
  });
  
  assert.strictEqual(dc.defaultLogBundle.hostname, 'test-host');
  assert.strictEqual(dc.defaultLogBundle.filename, 'test-file.js');
});

test('init uses os.hostname() when hostname not provided', () => {
  const dc = new DataCortex();
  dc.init({
    apiKey: API_KEY,
    orgName: ORG_NAME,
  });
  
  assert.ok(dc.defaultLogBundle.hostname);
  assert.ok(typeof dc.defaultLogBundle.hostname === 'string');
});

test('init calls done callback when provided', (t, done) => {
  const dc = new DataCortex();
  dc.init({
    apiKey: API_KEY,
    orgName: ORG_NAME,
  }, () => {
    assert.strictEqual(dc.isReady, true);
    done();
  });
});

test('setDeviceTag sets device tag', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });
  
  dc.setDeviceTag('new_device');
  assert.strictEqual(dc.defaultBundle.device_tag, 'new_device');
});

test('setDeviceTag removes device tag when empty', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME, deviceTag: 'old_device' });
  
  dc.setDeviceTag('');
  assert.strictEqual(dc.defaultBundle.device_tag, undefined);
});

test('setUserTag sets user tag', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });
  
  dc.setUserTag('new_user');
  assert.strictEqual(dc.defaultBundle.user_tag, 'new_user');
});

test('setUserTag removes user tag when empty', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME, userTag: 'old_user' });
  
  dc.setUserTag('');
  assert.strictEqual(dc.defaultBundle.user_tag, undefined);
});

test('install throws error when props is not an object', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME, deviceTag: 'device123' });
  
  assert.throws(() => {
    dc.install(null as any);
  }, /props must be an object/);
  
  assert.throws(() => {
    dc.install('string' as any);
  }, /props must be an object/);
});

test('install adds event to eventList', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME, deviceTag: 'device123' });
  
  dc.install({ kingdom: 'test' });
  assert.strictEqual(dc.eventList.length, 1);
  assert.strictEqual(dc.eventList[0].type, 'install');
  assert.strictEqual(dc.eventList[0].kingdom, 'test');
});

test('dau throws error when props is not an object', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME, deviceTag: 'device123' });
  
  assert.throws(() => {
    dc.dau(null as any);
  }, /props must be an object/);
});

test('dau adds event to eventList', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME, deviceTag: 'device123' });
  
  dc.dau({ kingdom: 'test' });
  assert.strictEqual(dc.eventList.length, 1);
  assert.strictEqual(dc.eventList[0].type, 'dau');
});

test('event throws error when props is not an object', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME, deviceTag: 'device123' });
  
  assert.throws(() => {
    dc.event(null as any);
  }, /props must be an object/);
});

test('event adds event to eventList', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME, deviceTag: 'device123' });
  
  dc.event({ kingdom: 'test' });
  assert.strictEqual(dc.eventList.length, 1);
  assert.strictEqual(dc.eventList[0].type, 'event');
});

test('messageSend throws error when props is not an object', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME, deviceTag: 'device123' });
  
  assert.throws(() => {
    dc.messageSend(null as any);
  }, /props must be an object/);
});

test('messageSend throws error when network is missing', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME, deviceTag: 'device123' });
  
  assert.throws(() => {
    dc.messageSend({ from_tag: 'sender', to_list: ['recipient'] });
  }, /network is required/);
});

test('messageSend throws error when from_tag is missing', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME, deviceTag: 'device123' });
  
  assert.throws(() => {
    dc.messageSend({ network: 'email', to_list: ['recipient'] });
  }, /from_tag is required/);
});

test('messageSend throws error when to_list is missing', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME, deviceTag: 'device123' });
  
  assert.throws(() => {
    dc.messageSend({ network: 'email', from_tag: 'sender' });
  }, /to_list is required/);
});

test('messageSend adds event to eventList', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME, deviceTag: 'device123' });
  
  dc.messageSend({ network: 'email', from_tag: 'sender', to_list: ['recipient'] });
  assert.strictEqual(dc.eventList.length, 1);
  assert.strictEqual(dc.eventList[0].type, 'message_send');
});

test('messageClick throws error when props is not an object', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME, deviceTag: 'device123' });
  
  assert.throws(() => {
    dc.messageClick(null as any);
  }, /props must be an object/);
});

test('messageClick throws error when network is missing', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME, deviceTag: 'device123' });
  
  assert.throws(() => {
    dc.messageClick({ from_tag: 'sender', to_tag: 'recipient' });
  }, /network is required/);
});

test('messageClick throws error when from_tag is missing', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME, deviceTag: 'device123' });
  
  assert.throws(() => {
    dc.messageClick({ network: 'email', to_tag: 'recipient' });
  }, /from_tag is required/);
});

test('messageClick throws error when to_tag is missing', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME, deviceTag: 'device123' });
  
  assert.throws(() => {
    dc.messageClick({ network: 'email', from_tag: 'sender' });
  }, /to_tag is required/);
});

test('messageClick adds event to eventList', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME, deviceTag: 'device123' });
  
  dc.messageClick({ network: 'email', from_tag: 'sender', to_tag: 'recipient' });
  assert.strictEqual(dc.eventList.length, 1);
  assert.strictEqual(dc.eventList[0].type, 'message_click');
});

test('economy throws error when props is not an object', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME, deviceTag: 'device123' });
  
  assert.throws(() => {
    dc.economy(null as any);
  }, /props must be an object/);
});

test('economy throws error when spend_currency is missing', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME, deviceTag: 'device123' });
  
  assert.throws(() => {
    dc.economy({ spend_amount: 10 });
  }, /spend_currency is required/);
});

test('economy throws error when spend_amount is not a number', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME, deviceTag: 'device123' });
  
  assert.throws(() => {
    dc.economy({ spend_currency: 'USD', spend_amount: 'ten' as any });
  }, /spend_amount is required/);
});

test('economy throws error when spend_amount is not finite', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME, deviceTag: 'device123' });
  
  assert.throws(() => {
    dc.economy({ spend_currency: 'USD', spend_amount: Infinity });
  }, /spend_amount must be finite/);
});

test('economy adds event to eventList', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME, deviceTag: 'device123' });
  
  dc.economy({ spend_currency: 'USD', spend_amount: 10.50 });
  assert.strictEqual(dc.eventList.length, 1);
  assert.strictEqual(dc.eventList[0].type, 'economy');
  assert.strictEqual(dc.eventList[0].spend_currency, 'USD');
  assert.strictEqual(dc.eventList[0].spend_amount, 10.50);
});

test('_internalEventAdd throws error when device_tag is missing', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });
  
  assert.throws(() => {
    dc.install({ kingdom: 'test' });
  }, /device_tag is required/);
});

test('_internalEventAdd sets event properties correctly', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME, deviceTag: 'device123' });
  
  dc.event({ kingdom: 'test' });
  const event = dc.eventList[0];
  
  assert.strictEqual(event.type, 'event');
  assert.strictEqual(event.event_index, 0);
  assert.ok(event.event_datetime);
  assert.strictEqual(event.kingdom, 'test');
});

test('_internalEventAdd increments nextIndex', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME, deviceTag: 'device123' });
  
  dc.event({ kingdom: 'test1' });
  dc.event({ kingdom: 'test2' });
  
  assert.strictEqual(dc.eventList[0].event_index, 0);
  assert.strictEqual(dc.eventList[1].event_index, 1);
  assert.strictEqual(dc.nextIndex, 2);
});

test('_internalEventAdd truncates string properties to 32 characters', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME, deviceTag: 'device123' });
  
  const longString = 'a'.repeat(50);
  dc.event({ kingdom: longString });
  
  assert.strictEqual(dc.eventList[0].kingdom, 'a'.repeat(32));
});

test('_internalEventAdd handles object toString for string properties', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME, deviceTag: 'device123' });
  
  const obj = { toString: () => 'object_string' };
  dc.event({ kingdom: obj as any });
  
  assert.strictEqual(dc.eventList[0].kingdom, 'object_string');
});

test('_internalEventAdd converts and validates number properties', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME, deviceTag: 'device123' });
  
  dc.event({ float1: '123.45' as any, float2: Infinity as any });
  
  assert.strictEqual(dc.eventList[0].float1, 123.45);
  assert.strictEqual(dc.eventList[0].float2, undefined);
});

test('log throws error when no arguments provided', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });
  
  assert.throws(() => {
    dc.log();
  }, /log must have arguments/);
});

test('log handles string arguments', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });
  
  dc.log('test', 'message');
  
  assert.strictEqual(dc.logList.length, 1);
  const logEvent = dc.logList[0];
  assert.strictEqual(logEvent.log_line, 'test message');
});

test('log handles Error objects', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });
  
  const error = new Error('test error');
  dc.log(error);
  
  assert.strictEqual(dc.logList.length, 1);
  const logEvent = dc.logList[0];
  assert.ok(logEvent.log_line?.includes('test error'));
  assert.ok(logEvent.log_line?.includes('Error:'));
});

test('log handles object arguments', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });
  
  const obj = { key: 'value' };
  dc.log(obj);
  
  assert.strictEqual(dc.logList.length, 1);
  const logEvent = dc.logList[0];
  assert.strictEqual(logEvent.log_line, '{"key":"value"}');
});

test('log handles mixed argument types', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });
  
  dc.log('prefix', { key: 'value' }, 123);
  
  assert.strictEqual(dc.logList.length, 1);
  const logEvent = dc.logList[0];
  assert.strictEqual(logEvent.log_line, 'prefix {"key":"value"} 123');
});

test('logEvent throws error when props is not an object', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });
  
  assert.throws(() => {
    dc.logEvent(null as any);
  }, /props must be an object/);
});

test('logEvent sets event_datetime if not provided', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });
  
  dc.logEvent({ log_line: 'test' });
  
  assert.strictEqual(dc.logList.length, 1);
  const logEvent = dc.logList[0];
  assert.ok(logEvent.event_datetime);
});

test('logEvent truncates string properties according to limits', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });
  
  const longString = 'a'.repeat(100);
  dc.logEvent({ hostname: longString });
  
  assert.strictEqual(dc.logList.length, 1);
  const logEvent = dc.logList[0];
  assert.strictEqual(logEvent.hostname, 'a'.repeat(64)); // hostname limit is 64
});

test('logEvent handles number properties', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });
  
  dc.logEvent({ response_ms: '123.45' as any, response_bytes: Infinity as any });
  
  assert.strictEqual(dc.logList.length, 1);
  const logEvent = dc.logList[0];
  assert.strictEqual(logEvent.response_ms, 123.45);
  assert.strictEqual(logEvent.response_bytes, undefined);
});

test('flush calls _sendEvents and _sendLogs', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME, deviceTag: 'device123' });
  
  // Add some events and logs
  dc.event({ kingdom: 'test' });
  dc.log('test log');
  
  // Mock the send methods to avoid actual HTTP requests
  let sendEventsCalled = false;
  let sendLogsCalled = false;
  
  const originalSendEvents = dc._sendEvents;
  const originalSendLogs = dc._sendLogs;
  
  dc._sendEvents = function() { sendEventsCalled = true; };
  dc._sendLogs = function() { sendLogsCalled = true; };
  
  dc.flush();
  
  assert.strictEqual(sendEventsCalled, true);
  assert.strictEqual(sendLogsCalled, true);
  
  // Restore original methods
  dc._sendEvents = originalSendEvents;
  dc._sendLogs = originalSendLogs;
});

test('_removeEvents removes events by event_index', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME, deviceTag: 'device123' });
  
  dc.event({ kingdom: 'test1' });
  dc.event({ kingdom: 'test2' });
  dc.event({ kingdom: 'test3' });
  
  assert.strictEqual(dc.eventList.length, 3);
  
  // Remove the middle event
  dc._removeEvents([{ event_index: 1 } as any]);
  
  assert.strictEqual(dc.eventList.length, 2);
  assert.strictEqual(dc.eventList[0].event_index, 0);
  assert.strictEqual(dc.eventList[1].event_index, 2);
});

test('_removeLogs removes logs from beginning of array', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });
  
  dc.log('log1');
  dc.log('log2');
  dc.log('log3');
  
  assert.strictEqual(dc.logList.length, 3);
  
  // Remove first 2 logs
  dc._removeLogs([{}, {}] as any);
  
  assert.strictEqual(dc.logList.length, 1);
  assert.strictEqual(dc.logList[0].log_line, 'log3');
});
