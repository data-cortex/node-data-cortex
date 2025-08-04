import test from 'node:test';
import assert from 'node:assert';
import { DataCortex, create } from '../src/data_cortex';
import { createLogger } from '../src/middleware';

const API_KEY = process.env.DC_API_KEY || 'test_api_key';
const ORG_NAME = 'test_org';

// Test edge cases and uncovered branches for better coverage

test('init with noHupHandler option prevents SIGHUP handler registration', () => {
  const dc = new DataCortex();
  const originalListenerCount = process.listenerCount('SIGHUP');
  
  dc.init({ 
    apiKey: API_KEY, 
    orgName: ORG_NAME, 
    noHupHandler: true 
  });
  
  // Should not add a new SIGHUP listener
  assert.strictEqual(process.listenerCount('SIGHUP'), originalListenerCount);
});

test('init with custom baseUrl sets apiBaseUrl', () => {
  const dc = new DataCortex();
  const customUrl = 'https://custom-api.example.com';
  
  dc.init({ 
    apiKey: API_KEY, 
    orgName: ORG_NAME, 
    baseUrl: customUrl 
  });
  
  assert.strictEqual(dc.apiBaseUrl, customUrl);
});

test('_internalEventAdd handles Date object for event_datetime', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME, deviceTag: 'device123' });
  
  const customDate = new Date('2023-01-01T00:00:00.000Z');
  dc.event({ kingdom: 'test', event_datetime: customDate });
  
  assert.strictEqual(dc.eventList.length, 1);
  // event_datetime is in OTHER_PROP_LIST, so it's not processed as a string
  // It remains as the original Date object
  assert.strictEqual(dc.eventList[0].event_datetime, customDate);
});

test('_internalEventAdd handles empty string properties', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME, deviceTag: 'device123' });
  
  dc.event({ kingdom: '', phylum: null, class: undefined });
  
  assert.strictEqual(dc.eventList.length, 1);
  assert.strictEqual(dc.eventList[0].kingdom, '');
  // null gets converted to empty string for string properties
  assert.strictEqual(dc.eventList[0].phylum, '');
  // undefined also gets converted to empty string when explicitly set
  assert.strictEqual(dc.eventList[0].class, '');
});

test('_internalEventAdd handles invalid number properties', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME, deviceTag: 'device123' });
  
  dc.event({ 
    kingdom: 'test', 
    float1: 'not-a-number',
    float2: NaN,
    float3: Infinity,
    float4: -Infinity
  });
  
  assert.strictEqual(dc.eventList.length, 1);
  const event = dc.eventList[0];
  assert.strictEqual(event.float1, undefined);
  assert.strictEqual(event.float2, undefined);
  assert.strictEqual(event.float3, undefined);
  assert.strictEqual(event.float4, undefined);
});

test('logEvent handles undefined and null string properties', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });
  
  dc.logEvent({ 
    log_line: 'test',
    hostname: undefined,
    filename: null,
    log_level: 'undefined',
    device_tag: 'null'
  });
  
  assert.strictEqual(dc.logList.length, 1);
  const logEvent = dc.logList[0];
  assert.strictEqual(logEvent.hostname, undefined);
  assert.strictEqual(logEvent.filename, undefined);
  assert.strictEqual(logEvent.log_level, undefined);
  assert.strictEqual(logEvent.device_tag, undefined);
});

test('logEvent handles invalid number properties', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });
  
  dc.logEvent({ 
    log_line: 'test',
    response_ms: 'invalid',
    response_bytes: NaN
  });
  
  assert.strictEqual(dc.logList.length, 1);
  const logEvent = dc.logList[0];
  assert.strictEqual(logEvent.response_ms, undefined);
  assert.strictEqual(logEvent.response_bytes, undefined);
});

test('log handles circular reference objects gracefully', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });
  
  const circular: any = { name: 'test' };
  circular.self = circular;
  
  dc.log('Circular object:', circular);
  
  assert.strictEqual(dc.logList.length, 1);
  const logEvent = dc.logList[0];
  assert.ok(logEvent.log_line?.includes('Circular object:'));
  // Should handle circular reference gracefully
  assert.ok(logEvent.log_line?.includes('[object Object]'));
});

test('_sendEvents handles empty eventList gracefully', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME, deviceTag: 'device123' });
  
  // Clear any existing events
  dc.eventList.length = 0;
  
  // Should not throw when calling _sendEvents with empty list
  dc.flush();
  
  assert.strictEqual(dc.eventList.length, 0);
});

test('_sendLogs handles empty logList gracefully', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });
  
  // Clear any existing logs
  dc.logList.length = 0;
  
  // Should not throw when calling _sendLogs with empty list
  dc.flush();
  
  assert.strictEqual(dc.logList.length, 0);
});

test('middleware handles request without IP address', (t, done) => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });
  
  const middleware = createLogger({ dataCortex: dc });
  
  const req = {
    method: 'GET',
    originalUrl: '/test',
    httpVersionMajor: 1,
    httpVersionMinor: 1,
    get: () => undefined
    // No ip property
  };
  
  const { EventEmitter } = require('node:events');
  const res = new EventEmitter();
  Object.assign(res, {
    statusCode: 200,
    getHeader: () => 0,
    end: function() { 
      setImmediate(() => {
        this.emit('finish');
      });
      return this; 
    }
  });
  
  const next = () => {};
  
  middleware(req as any, res as any, next);
  res.end();
  
  setImmediate(() => {
    assert.strictEqual(dc.logList.length, 1);
    const logEvent = dc.logList[0];
    assert.strictEqual(logEvent.remote_address, undefined);
    done();
  });
});

test('middleware handles request without referrer header', (t, done) => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });
  
  const middleware = createLogger({ dataCortex: dc });
  
  const req = {
    ip: '127.0.0.1',
    method: 'GET',
    originalUrl: '/test',
    httpVersionMajor: 1,
    httpVersionMinor: 1,
    get: (header: string) => {
      if (header === 'referrer') return undefined;
      return undefined;
    }
  };
  
  const { EventEmitter } = require('node:events');
  const res = new EventEmitter();
  Object.assign(res, {
    statusCode: 200,
    getHeader: () => 0,
    end: function() { 
      setImmediate(() => {
        this.emit('finish');
      });
      return this; 
    }
  });
  
  const next = () => {};
  
  middleware(req as any, res as any, next);
  res.end();
  
  setImmediate(() => {
    assert.strictEqual(dc.logList.length, 1);
    const logEvent = dc.logList[0];
    assert.strictEqual(logEvent.filename, undefined);
    done();
  });
});

test('middleware handles Safari user agent', (t, done) => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });
  
  const middleware = createLogger({ dataCortex: dc });
  
  const req = {
    ip: '127.0.0.1',
    method: 'GET',
    originalUrl: '/test',
    httpVersionMajor: 1,
    httpVersionMinor: 1,
    get: (header: string) => {
      if (header === 'user-agent') {
        return 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15';
      }
      return undefined;
    }
  };
  
  const { EventEmitter } = require('node:events');
  const res = new EventEmitter();
  Object.assign(res, {
    statusCode: 200,
    getHeader: () => 0,
    end: function() { 
      setImmediate(() => {
        this.emit('finish');
      });
      return this; 
    }
  });
  
  const next = () => {};
  
  middleware(req as any, res as any, next);
  res.end();
  
  setImmediate(() => {
    assert.strictEqual(dc.logList.length, 1);
    const logEvent = dc.logList[0];
    assert.strictEqual(logEvent.browser, 'safari');
    assert.strictEqual(logEvent.browser_ver, '14.1.1');
    done();
  });
});

test('middleware handles Chrome iOS user agent', (t, done) => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });
  
  const middleware = createLogger({ dataCortex: dc });
  
  const req = {
    ip: '127.0.0.1',
    method: 'GET',
    originalUrl: '/test',
    httpVersionMajor: 1,
    httpVersionMinor: 1,
    get: (header: string) => {
      if (header === 'user-agent') {
        return 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/91.0.4472.80 Mobile/15E148 Safari/604.1';
      }
      return undefined;
    }
  };
  
  const { EventEmitter } = require('node:events');
  const res = new EventEmitter();
  Object.assign(res, {
    statusCode: 200,
    getHeader: () => 0,
    end: function() { 
      setImmediate(() => {
        this.emit('finish');
      });
      return this; 
    }
  });
  
  const next = () => {};
  
  middleware(req as any, res as any, next);
  res.end();
  
  setImmediate(() => {
    assert.strictEqual(dc.logList.length, 1);
    const logEvent = dc.logList[0];
    assert.strictEqual(logEvent.browser, 'chrome');
    assert.strictEqual(logEvent.browser_ver, '91.0.4472.80');
    done();
  });
});

test('middleware handles Facebook Messenger user agent', (t, done) => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });
  
  const middleware = createLogger({ dataCortex: dc });
  
  const req = {
    ip: '127.0.0.1',
    method: 'GET',
    originalUrl: '/test',
    httpVersionMajor: 1,
    httpVersionMinor: 1,
    get: (header: string) => {
      if (header === 'user-agent') {
        return 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MessengerForiOS/123.0 FBAV/123.0';
      }
      return undefined;
    }
  };
  
  const { EventEmitter } = require('node:events');
  const res = new EventEmitter();
  Object.assign(res, {
    statusCode: 200,
    getHeader: () => 0,
    end: function() { 
      setImmediate(() => {
        this.emit('finish');
      });
      return this; 
    }
  });
  
  const next = () => {};
  
  middleware(req as any, res as any, next);
  res.end();
  
  setImmediate(() => {
    assert.strictEqual(dc.logList.length, 1);
    const logEvent = dc.logList[0];
    assert.strictEqual(logEvent.browser, 'fbmessenger');
    assert.strictEqual(logEvent.browser_ver, '123.0');
    done();
  });
});

test('middleware handles Unix user agent', (t, done) => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });
  
  const middleware = createLogger({ dataCortex: dc });
  
  const req = {
    ip: '127.0.0.1',
    method: 'GET',
    originalUrl: '/test',
    httpVersionMajor: 1,
    httpVersionMinor: 1,
    get: (header: string) => {
      if (header === 'user-agent') {
        return 'Mozilla/5.0 (X11; U; SunOS sun4u; en-US; rv:1.9.1b3) Gecko/20090429 Firefox/3.1b3';
      }
      return undefined;
    }
  };
  
  const { EventEmitter } = require('node:events');
  const res = new EventEmitter();
  Object.assign(res, {
    statusCode: 200,
    getHeader: () => 0,
    end: function() { 
      setImmediate(() => {
        this.emit('finish');
      });
      return this; 
    }
  });
  
  const next = () => {};
  
  middleware(req as any, res as any, next);
  res.end();
  
  setImmediate(() => {
    assert.strictEqual(dc.logList.length, 1);
    const logEvent = dc.logList[0];
    assert.strictEqual(logEvent.os, 'unix');
    done();
  });
});

test('middleware handles iPod user agent', (t, done) => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });
  
  const middleware = createLogger({ dataCortex: dc });
  
  const req = {
    ip: '127.0.0.1',
    method: 'GET',
    originalUrl: '/test',
    httpVersionMajor: 1,
    httpVersionMinor: 1,
    get: (header: string) => {
      if (header === 'user-agent') {
        return 'Mozilla/5.0 (iPod touch; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1';
      }
      return undefined;
    }
  };
  
  const { EventEmitter } = require('node:events');
  const res = new EventEmitter();
  Object.assign(res, {
    statusCode: 200,
    getHeader: () => 0,
    end: function() { 
      setImmediate(() => {
        this.emit('finish');
      });
      return this; 
    }
  });
  
  const next = () => {};
  
  middleware(req as any, res as any, next);
  res.end();
  
  setImmediate(() => {
    assert.strictEqual(dc.logList.length, 1);
    const logEvent = dc.logList[0];
    assert.strictEqual(logEvent.device_type, 'ipod');
    done();
  });
});

test('middleware handles generic mobile user agent', (t, done) => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });
  
  const middleware = createLogger({ dataCortex: dc });
  
  const req = {
    ip: '127.0.0.1',
    method: 'GET',
    originalUrl: '/test',
    httpVersionMajor: 1,
    httpVersionMinor: 1,
    get: (header: string) => {
      if (header === 'user-agent') {
        return 'Mozilla/5.0 (Mobile; rv:26.0) Gecko/26.0 Firefox/26.0';
      }
      return undefined;
    }
  };
  
  const { EventEmitter } = require('node:events');
  const res = new EventEmitter();
  Object.assign(res, {
    statusCode: 200,
    getHeader: () => 0,
    end: function() { 
      setImmediate(() => {
        this.emit('finish');
      });
      return this; 
    }
  });
  
  const next = () => {};
  
  middleware(req as any, res as any, next);
  res.end();
  
  setImmediate(() => {
    assert.strictEqual(dc.logList.length, 1);
    const logEvent = dc.logList[0];
    assert.strictEqual(logEvent.device_type, 'mobile');
    done();
  });
});
