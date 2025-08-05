import test from 'node:test';
import assert from 'node:assert';
import * as dataCortex from '../src/index';
import { DataCortex } from '../src/data_cortex';

const API_KEY = process.env.DC_API_KEY || 'test_api_key';
const ORG_NAME = 'test_org';

test('exports DataCortex class', () => {
  assert.strictEqual(typeof dataCortex.DataCortex, 'function');
  assert.ok(dataCortex.DataCortex.prototype.init);
});

test('exports create function', () => {
  assert.strictEqual(typeof dataCortex.create, 'function');
  const instance = dataCortex.create();
  assert.ok(instance instanceof DataCortex);
});

test('exports createLogger function', () => {
  assert.strictEqual(typeof dataCortex.createLogger, 'function');
});

test('exports defaultObject', () => {
  assert.ok(dataCortex.defaultObject instanceof DataCortex);
});

test('exports bound init method', () => {
  assert.strictEqual(typeof dataCortex.init, 'function');

  // Test that it's bound to defaultObject
  dataCortex.init({ apiKey: API_KEY, orgName: ORG_NAME });
  assert.strictEqual(dataCortex.defaultObject.isReady, true);
});

test('exports bound setDeviceTag method', () => {
  assert.strictEqual(typeof dataCortex.setDeviceTag, 'function');

  dataCortex.init({ apiKey: API_KEY, orgName: ORG_NAME });
  dataCortex.setDeviceTag('test_device');
  assert.strictEqual(
    dataCortex.defaultObject.defaultBundle.device_tag,
    'test_device',
  );
});

test('exports bound setUserTag method', () => {
  assert.strictEqual(typeof dataCortex.setUserTag, 'function');

  dataCortex.init({ apiKey: API_KEY, orgName: ORG_NAME });
  dataCortex.setUserTag('test_user');
  assert.strictEqual(
    dataCortex.defaultObject.defaultBundle.user_tag,
    'test_user',
  );
});

test('exports bound flush method', () => {
  assert.strictEqual(typeof dataCortex.flush, 'function');

  dataCortex.init({ apiKey: API_KEY, orgName: ORG_NAME });

  // Mock the internal methods to avoid actual HTTP requests
  let sendEventsCalled = false;
  let sendLogsCalled = false;

  const originalSendEvents = dataCortex.defaultObject._sendEvents;
  const originalSendLogs = dataCortex.defaultObject._sendLogs;

  dataCortex.defaultObject._sendEvents = function () {
    sendEventsCalled = true;
  };
  dataCortex.defaultObject._sendLogs = function () {
    sendLogsCalled = true;
  };

  dataCortex.flush();

  assert.strictEqual(sendEventsCalled, true);
  assert.strictEqual(sendLogsCalled, true);

  // Restore original methods
  dataCortex.defaultObject._sendEvents = originalSendEvents;
  dataCortex.defaultObject._sendLogs = originalSendLogs;
});

test('exports bound install method', () => {
  assert.strictEqual(typeof dataCortex.install, 'function');

  dataCortex.init({
    apiKey: API_KEY,
    orgName: ORG_NAME,
    deviceTag: 'device123',
  });
  dataCortex.install({ kingdom: 'test' });

  assert.strictEqual(dataCortex.defaultObject.eventList.length, 1);
  assert.strictEqual(dataCortex.defaultObject.eventList[0].type, 'install');
});

test('exports bound dau method', () => {
  assert.strictEqual(typeof dataCortex.dau, 'function');

  dataCortex.init({
    apiKey: API_KEY,
    orgName: ORG_NAME,
    deviceTag: 'device123',
  });
  dataCortex.dau({ kingdom: 'test' });

  const events = dataCortex.defaultObject.eventList.filter(
    (e) => e.type === 'dau',
  );
  assert.strictEqual(events.length, 1);
});

test('exports bound event method', () => {
  assert.strictEqual(typeof dataCortex.event, 'function');

  dataCortex.init({
    apiKey: API_KEY,
    orgName: ORG_NAME,
    deviceTag: 'device123',
  });
  dataCortex.event({ kingdom: 'test' });

  const events = dataCortex.defaultObject.eventList.filter(
    (e) => e.type === 'event',
  );
  assert.strictEqual(events.length, 1);
});

test('exports bound economy method', () => {
  assert.strictEqual(typeof dataCortex.economy, 'function');

  dataCortex.init({
    apiKey: API_KEY,
    orgName: ORG_NAME,
    deviceTag: 'device123',
  });
  dataCortex.economy({ spend_currency: 'USD', spend_amount: 10.5 });

  const events = dataCortex.defaultObject.eventList.filter(
    (e) => e.type === 'economy',
  );
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].spend_currency, 'USD');
  assert.strictEqual(events[0].spend_amount, 10.5);
});

test('exports bound messageSend method', () => {
  assert.strictEqual(typeof dataCortex.messageSend, 'function');

  dataCortex.init({
    apiKey: API_KEY,
    orgName: ORG_NAME,
    deviceTag: 'device123',
  });
  dataCortex.messageSend({
    network: 'email',
    from_tag: 'sender',
    to_list: ['recipient'],
  });

  const events = dataCortex.defaultObject.eventList.filter(
    (e) => e.type === 'message_send',
  );
  assert.strictEqual(events.length, 1);
});

test('exports bound messageClick method', () => {
  assert.strictEqual(typeof dataCortex.messageClick, 'function');

  dataCortex.init({
    apiKey: API_KEY,
    orgName: ORG_NAME,
    deviceTag: 'device123',
  });
  dataCortex.messageClick({
    network: 'email',
    from_tag: 'sender',
    to_tag: 'recipient',
  });

  const events = dataCortex.defaultObject.eventList.filter(
    (e) => e.type === 'message_click',
  );
  assert.strictEqual(events.length, 1);
});

test('exports bound log method', () => {
  assert.strictEqual(typeof dataCortex.log, 'function');

  // Clear any existing state
  dataCortex.defaultObject.logList.length = 0;

  dataCortex.init({ apiKey: API_KEY, orgName: ORG_NAME });
  dataCortex.log('test message');

  assert.strictEqual(dataCortex.defaultObject.logList.length, 1);
  const logEvent = dataCortex.defaultObject.logList[0];
  assert.strictEqual(logEvent.log_line, 'test message');
});

test('exports bound logEvent method', () => {
  assert.strictEqual(typeof dataCortex.logEvent, 'function');

  // Clear any existing state
  dataCortex.defaultObject.logList.length = 0;

  dataCortex.init({ apiKey: API_KEY, orgName: ORG_NAME });
  dataCortex.logEvent({ log_line: 'test event' });

  assert.strictEqual(dataCortex.defaultObject.logList.length, 1);
  const logEvent = dataCortex.defaultObject.logList[0];
  assert.strictEqual(logEvent.log_line, 'test event');
});

test('default export contains all expected properties', () => {
  const defaultExport = dataCortex.default;

  assert.ok(defaultExport.defaultObject instanceof DataCortex);
  assert.strictEqual(typeof defaultExport.init, 'function');
  assert.strictEqual(typeof defaultExport.setDeviceTag, 'function');
  assert.strictEqual(typeof defaultExport.setUserTag, 'function');
  assert.strictEqual(typeof defaultExport.flush, 'function');
  assert.strictEqual(typeof defaultExport.install, 'function');
  assert.strictEqual(typeof defaultExport.dau, 'function');
  assert.strictEqual(typeof defaultExport.event, 'function');
  assert.strictEqual(typeof defaultExport.economy, 'function');
  assert.strictEqual(typeof defaultExport.messageSend, 'function');
  assert.strictEqual(typeof defaultExport.messageClick, 'function');
  assert.strictEqual(typeof defaultExport.log, 'function');
  assert.strictEqual(typeof defaultExport.logEvent, 'function');
  assert.strictEqual(typeof defaultExport.create, 'function');
  assert.strictEqual(typeof defaultExport.createLogger, 'function');
});

test('bound methods work independently of defaultObject reference', () => {
  // Clear any existing state
  dataCortex.defaultObject.eventList.length = 0;
  dataCortex.defaultObject.logList.length = 0;

  // Create a new instance to avoid interference
  const newInstance = dataCortex.create();
  newInstance.init({
    apiKey: API_KEY,
    orgName: ORG_NAME,
    deviceTag: 'device123',
  });

  // The bound methods should still work with the original defaultObject
  dataCortex.init({
    apiKey: API_KEY,
    orgName: ORG_NAME,
    deviceTag: 'device456',
  });
  dataCortex.event({ kingdom: 'bound_test' });

  // Check that the bound method affected the defaultObject, not the new instance
  assert.strictEqual(dataCortex.defaultObject.eventList.length, 1);
  assert.strictEqual(
    dataCortex.defaultObject.eventList[0].kingdom,
    'bound_test',
  );
  assert.strictEqual(newInstance.eventList.length, 0);
});

test('multiple instances work independently', () => {
  const instance1 = dataCortex.create();
  const instance2 = dataCortex.create();

  instance1.init({ apiKey: API_KEY, orgName: ORG_NAME, deviceTag: 'device1' });
  instance2.init({ apiKey: API_KEY, orgName: ORG_NAME, deviceTag: 'device2' });

  instance1.event({ kingdom: 'test1' });
  instance2.event({ kingdom: 'test2' });

  assert.strictEqual(instance1.eventList.length, 1);
  assert.strictEqual(instance2.eventList.length, 1);
  assert.strictEqual(instance1.eventList[0].kingdom, 'test1');
  assert.strictEqual(instance2.eventList[0].kingdom, 'test2');
});

test('type exports are available', () => {
  // These should not throw TypeScript compilation errors
  // We can't directly test types at runtime, but we can verify the module structure

  // Verify that the main classes and functions are exported
  assert.ok(dataCortex.DataCortex);
  assert.ok(dataCortex.create);
  assert.ok(dataCortex.createLogger);

  // The types should be available for TypeScript consumers
  // but we can't test them directly in a runtime test
});

test('bound methods maintain correct this context', () => {
  // Reset defaultObject
  const newDefaultObject = dataCortex.create();
  (dataCortex as any).defaultObject = newDefaultObject;

  // Re-bind methods to new default object
  const init = DataCortex.prototype.init.bind(newDefaultObject);
  const setDeviceTag = DataCortex.prototype.setDeviceTag.bind(newDefaultObject);

  init({ apiKey: API_KEY, orgName: ORG_NAME });
  setDeviceTag('bound_device');

  assert.strictEqual(newDefaultObject.isReady, true);
  assert.strictEqual(newDefaultObject.defaultBundle.device_tag, 'bound_device');
});

test('createLogger integration with DataCortex instance', (t, done) => {
  const dc = dataCortex.create();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });

  const middleware = dataCortex.createLogger({ dataCortex: dc });
  assert.strictEqual(typeof middleware, 'function');

  // Test that the middleware is properly bound to the DataCortex instance
  const mockReq = {
    ip: '127.0.0.1',
    method: 'GET',
    originalUrl: '/test',
    httpVersionMajor: 1,
    httpVersionMinor: 1,
    get: () => undefined,
  };

  // Create a proper mock response that can emit events
  const { EventEmitter } = require('node:events');
  const mockRes = new EventEmitter();
  Object.assign(mockRes, {
    statusCode: 200,
    getHeader: () => 0,
    end: function () {
      setImmediate(() => {
        this.emit('finish');
      });
      return this;
    },
  });

  const mockNext = () => {};

  middleware(mockReq as any, mockRes as any, mockNext);
  mockRes.end();

  setImmediate(() => {
    assert.strictEqual(dc.logList.length, 1);
    done();
  });
});
