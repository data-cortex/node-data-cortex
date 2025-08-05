import test from 'node:test';
import assert from 'node:assert';
import {
  createLogger,
  CreateLoggerParams,
  MiddlewareLogEvent,
} from '../src/middleware';
import { DataCortex } from '../src/data_cortex';
import { EventEmitter } from 'node:events';

const API_KEY = process.env.DC_API_KEY || 'test_api_key';
const ORG_NAME = 'test_org';

// Mock Express request object
function createMockRequest(overrides: any = {}): any {
  return {
    ip: '127.0.0.1',
    method: 'GET',
    originalUrl: '/test',
    httpVersionMajor: 1,
    httpVersionMinor: 1,
    get: (header: string) => {
      const headers: Record<string, string> = {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        referrer: 'https://example.com',
        ...overrides.headers,
      };
      return headers[header.toLowerCase()];
    },
    ...overrides,
  };
}

// Mock Express response object that extends EventEmitter to work with on-finished
function createMockResponse(overrides: any = {}): any {
  const headers: Record<string, string | number> = {
    'content-length': 1024,
    ...overrides.headers,
  };

  const res = new EventEmitter();
  Object.assign(res, {
    statusCode: 200,
    getHeader: (name: string) => headers[name.toLowerCase()],
    end: function (chunk?: unknown, encoding?: BufferEncoding) {
      // Simulate the response finishing
      setImmediate(() => {
        this.emit('finish');
      });
      return this;
    },
    finished: false,
    headersSent: false,
    ...overrides,
  });

  return res;
}

// Mock next function
function createMockNext(): any {
  return () => {};
}

test('createLogger returns middleware function', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });

  const middleware = createLogger({ dataCortex: dc });
  assert.strictEqual(typeof middleware, 'function');
});

test('middleware sets up response monitoring', () => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });

  const middleware = createLogger({ dataCortex: dc });
  const req = createMockRequest();
  const res = createMockResponse();
  const next = createMockNext();

  middleware(req, res, next);

  // Verify middleware was called without error
  assert.ok(true);
});

test('middleware logs event when response ends', (t, done) => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });

  const middleware = createLogger({ dataCortex: dc });
  const req = createMockRequest();
  const res = createMockResponse();
  const next = createMockNext();

  middleware(req, res, next);

  // Simulate response end
  res.end();

  // Wait for the event to be processed
  setImmediate(() => {
    assert.strictEqual(dc.logList.length, 1);
    const logEvent = dc.logList[0];
    assert.strictEqual(logEvent.remote_address, '127.0.0.1');
    assert.strictEqual(logEvent.log_level, '200');
    assert.strictEqual(logEvent.log_line, 'GET /test HTTP/1.1');
    assert.ok(logEvent.response_ms !== undefined);
    assert.strictEqual(logEvent.response_bytes, 1024);
    done();
  });
});

test('middleware handles missing content-length header', (t, done) => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });

  const middleware = createLogger({ dataCortex: dc });
  const req = createMockRequest();
  const res = createMockResponse({
    getHeader: () => undefined,
  });
  const next = createMockNext();

  middleware(req, res, next);
  res.end();

  setImmediate(() => {
    assert.strictEqual(dc.logList.length, 1);
    assert.strictEqual(dc.logList[0].response_bytes, 0);
    done();
  });
});

test('middleware sets filename from referrer header', (t, done) => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });

  const middleware = createLogger({ dataCortex: dc });
  const req = createMockRequest();
  const res = createMockResponse();
  const next = createMockNext();

  middleware(req, res, next);
  res.end();

  setImmediate(() => {
    assert.strictEqual(dc.logList.length, 1);
    assert.strictEqual(dc.logList[0].filename, 'https://example.com');
    done();
  });
});

test('middleware parses Windows user agent', (t, done) => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });

  const middleware = createLogger({ dataCortex: dc });
  const req = createMockRequest({
    get: (header: string) => {
      if (header === 'user-agent') {
        return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
      }
      return undefined;
    },
  });
  const res = createMockResponse();
  const next = createMockNext();

  middleware(req, res, next);
  res.end();

  setImmediate(() => {
    assert.strictEqual(dc.logList.length, 1);
    const logEvent = dc.logList[0];
    assert.strictEqual(logEvent.os, 'windows');
    assert.strictEqual(logEvent.os_ver, '10.0');
    assert.strictEqual(logEvent.browser, 'chrome');
    assert.strictEqual(logEvent.browser_ver, '91.0.4472.124');
    assert.strictEqual(logEvent.device_type, 'desktop');
    done();
  });
});

test('middleware parses iPhone user agent', (t, done) => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });

  const middleware = createLogger({ dataCortex: dc });
  const req = createMockRequest({
    get: (header: string) => {
      if (header === 'user-agent') {
        return 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1';
      }
      return undefined;
    },
  });
  const res = createMockResponse();
  const next = createMockNext();

  middleware(req, res, next);
  res.end();

  setImmediate(() => {
    assert.strictEqual(dc.logList.length, 1);
    const logEvent = dc.logList[0];
    assert.strictEqual(logEvent.os, 'ios');
    assert.strictEqual(logEvent.os_ver, '14.6');
    assert.strictEqual(logEvent.browser, 'safari');
    assert.strictEqual(logEvent.device_type, 'iphone');
    done();
  });
});

test('middleware parses iPad user agent', (t, done) => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });

  const middleware = createLogger({ dataCortex: dc });
  const req = createMockRequest({
    get: (header: string) => {
      if (header === 'user-agent') {
        return 'Mozilla/5.0 (iPad; CPU OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Mobile/15E148 Safari/604.1';
      }
      return undefined;
    },
  });
  const res = createMockResponse();
  const next = createMockNext();

  middleware(req, res, next);
  res.end();

  setImmediate(() => {
    assert.strictEqual(dc.logList.length, 1);
    const logEvent = dc.logList[0];
    assert.strictEqual(logEvent.os, 'ios');
    assert.strictEqual(logEvent.os_ver, '14.6');
    assert.strictEqual(logEvent.browser, 'safari');
    assert.strictEqual(logEvent.device_type, 'ipad');
    done();
  });
});

test('middleware parses Mac user agent', (t, done) => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });

  const middleware = createLogger({ dataCortex: dc });
  const req = createMockRequest({
    get: (header: string) => {
      if (header === 'user-agent') {
        return 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
      }
      return undefined;
    },
  });
  const res = createMockResponse();
  const next = createMockNext();

  middleware(req, res, next);
  res.end();

  setImmediate(() => {
    assert.strictEqual(dc.logList.length, 1);
    const logEvent = dc.logList[0];
    assert.strictEqual(logEvent.os, 'mac');
    assert.strictEqual(logEvent.os_ver, '10.15.7');
    assert.strictEqual(logEvent.browser, 'chrome');
    assert.strictEqual(logEvent.device_type, 'desktop');
    done();
  });
});

test('middleware parses Android mobile user agent', (t, done) => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });

  const middleware = createLogger({ dataCortex: dc });
  const req = createMockRequest({
    get: (header: string) => {
      if (header === 'user-agent') {
        return 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Mobile Safari/537.36';
      }
      return undefined;
    },
  });
  const res = createMockResponse();
  const next = createMockNext();

  middleware(req, res, next);
  res.end();

  setImmediate(() => {
    assert.strictEqual(dc.logList.length, 1);
    const logEvent = dc.logList[0];
    assert.strictEqual(logEvent.os, 'android');
    assert.strictEqual(logEvent.os_ver, '11');
    assert.strictEqual(logEvent.browser, 'chrome');
    assert.strictEqual(logEvent.device_type, 'android');
    done();
  });
});

test('middleware parses Android tablet user agent', (t, done) => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });

  const middleware = createLogger({ dataCortex: dc });
  const req = createMockRequest({
    get: (header: string) => {
      if (header === 'user-agent') {
        return 'Mozilla/5.0 (Linux; Android 11; SM-T870) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
      }
      return undefined;
    },
  });
  const res = createMockResponse();
  const next = createMockNext();

  middleware(req, res, next);
  res.end();

  setImmediate(() => {
    assert.strictEqual(dc.logList.length, 1);
    const logEvent = dc.logList[0];
    assert.strictEqual(logEvent.os, 'android');
    assert.strictEqual(logEvent.os_ver, '11');
    assert.strictEqual(logEvent.browser, 'chrome');
    assert.strictEqual(logEvent.device_type, 'android_tablet');
    done();
  });
});

test('middleware parses Firefox user agent', (t, done) => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });

  const middleware = createLogger({ dataCortex: dc });
  const req = createMockRequest({
    get: (header: string) => {
      if (header === 'user-agent') {
        return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0';
      }
      return undefined;
    },
  });
  const res = createMockResponse();
  const next = createMockNext();

  middleware(req, res, next);
  res.end();

  setImmediate(() => {
    assert.strictEqual(dc.logList.length, 1);
    const logEvent = dc.logList[0];
    assert.strictEqual(logEvent.browser, 'firefox');
    assert.strictEqual(logEvent.browser_ver, '89.0');
    done();
  });
});

test('middleware parses Edge user agent', (t, done) => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });

  const middleware = createLogger({ dataCortex: dc });
  const req = createMockRequest({
    get: (header: string) => {
      if (header === 'user-agent') {
        return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edge/91.0.864.59';
      }
      return undefined;
    },
  });
  const res = createMockResponse();
  const next = createMockNext();

  middleware(req, res, next);
  res.end();

  setImmediate(() => {
    assert.strictEqual(dc.logList.length, 1);
    const logEvent = dc.logList[0];
    assert.strictEqual(logEvent.browser, 'edge');
    assert.strictEqual(logEvent.browser_ver, '91.0.864.59');
    done();
  });
});

test('middleware parses Internet Explorer user agent', (t, done) => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });

  const middleware = createLogger({ dataCortex: dc });
  const req = createMockRequest({
    get: (header: string) => {
      if (header === 'user-agent') {
        return 'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko';
      }
      return undefined;
    },
  });
  const res = createMockResponse();
  const next = createMockNext();

  middleware(req, res, next);
  res.end();

  setImmediate(() => {
    assert.strictEqual(dc.logList.length, 1);
    const logEvent = dc.logList[0];
    assert.strictEqual(logEvent.browser, 'ie');
    assert.strictEqual(logEvent.browser_ver, '11.0');
    done();
  });
});

test('middleware parses Linux user agent', (t, done) => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });

  const middleware = createLogger({ dataCortex: dc });
  const req = createMockRequest({
    get: (header: string) => {
      if (header === 'user-agent') {
        return 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
      }
      return undefined;
    },
  });
  const res = createMockResponse();
  const next = createMockNext();

  middleware(req, res, next);
  res.end();

  setImmediate(() => {
    assert.strictEqual(dc.logList.length, 1);
    const logEvent = dc.logList[0];
    assert.strictEqual(logEvent.os, 'linux');
    done();
  });
});

test('middleware handles unknown user agent gracefully', (t, done) => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });

  const middleware = createLogger({ dataCortex: dc });
  const req = createMockRequest({
    get: (header: string) => {
      if (header === 'user-agent') {
        return 'UnknownBot/1.0';
      }
      return undefined;
    },
  });
  const res = createMockResponse();
  const next = createMockNext();

  middleware(req, res, next);
  res.end();

  setImmediate(() => {
    assert.strictEqual(dc.logList.length, 1);
    const logEvent = dc.logList[0];
    assert.strictEqual(logEvent.device_type, 'desktop');
    done();
  });
});

test('middleware calls prepareEvent callback when provided', (t, done) => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });

  let prepareEventCalled = false;
  const middleware = createLogger({
    dataCortex: dc,
    prepareEvent: (req, res, event: MiddlewareLogEvent) => {
      prepareEventCalled = true;
      event.user_tag = 'test_user';
    },
  });

  const req = createMockRequest();
  const res = createMockResponse();
  const next = createMockNext();

  middleware(req, res, next);
  res.end();

  setImmediate(() => {
    assert.strictEqual(prepareEventCalled, true);
    assert.strictEqual(dc.logList.length, 1);
    assert.strictEqual(dc.logList[0].user_tag, 'test_user');
    done();
  });
});

test('middleware logs to console when logConsole is true', (t, done) => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });

  // Mock console.log to capture output
  const originalConsoleLog = console.log;
  let consoleLogCalled = false;
  console.log = () => {
    consoleLogCalled = true;
  };

  const middleware = createLogger({
    dataCortex: dc,
    logConsole: true,
  });

  const req = createMockRequest();
  const res = createMockResponse();
  const next = createMockNext();

  middleware(req, res, next);
  res.end();

  setImmediate(() => {
    assert.strictEqual(consoleLogCalled, true);

    // Restore console.log
    console.log = originalConsoleLog;
    done();
  });
});

test('middleware does not log to console when logConsole is false', (t, done) => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });

  // Mock console.log to capture output
  const originalConsoleLog = console.log;
  let consoleLogCalled = false;
  console.log = () => {
    consoleLogCalled = true;
  };

  const middleware = createLogger({
    dataCortex: dc,
    logConsole: false,
  });

  const req = createMockRequest();
  const res = createMockResponse();
  const next = createMockNext();

  middleware(req, res, next);
  res.end();

  setImmediate(() => {
    assert.strictEqual(consoleLogCalled, false);

    // Restore console.log
    console.log = originalConsoleLog;
    done();
  });
});

test('middleware handles missing _startTimestamp gracefully', (t, done) => {
  const dc = new DataCortex();
  dc.init({ apiKey: API_KEY, orgName: ORG_NAME });

  const middleware = createLogger({ dataCortex: dc });
  const req = createMockRequest();
  const res = createMockResponse();
  const next = createMockNext();

  middleware(req, res, next);
  res.end();

  setImmediate(() => {
    assert.strictEqual(dc.logList.length, 1);
    const logEvent = dc.logList[0];
    assert.ok(typeof logEvent.response_ms === 'number');
    assert.ok(logEvent.response_ms >= 0);
    done();
  });
});
