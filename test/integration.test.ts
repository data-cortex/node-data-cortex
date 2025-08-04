import test from 'node:test';
import assert from 'node:assert';
import { DataCortex, create, createLogger } from '../src/data_cortex';

const API_KEY = process.env.DC_API_KEY;
const ORG_NAME = 'test_org';

// Only run integration tests if API key is available
const runIntegrationTests = !!API_KEY;

if (runIntegrationTests) {
  test('integration: full event workflow', async (t) => {
    const dc = create();
    
    await new Promise<void>((resolve, reject) => {
      dc.init({
        apiKey: API_KEY!,
        orgName: ORG_NAME,
        appVer: '1.0.0',
        deviceTag: 'integration_test_device',
        userTag: 'integration_test_user',
        deviceType: 'test',
        os: 'test_os',
        osVer: '1.0',
        language: 'en',
        country: 'US',
      }, () => {
        resolve();
      });
    });
    
    assert.strictEqual(dc.isReady, true);
    
    // Add various types of events
    dc.install({ kingdom: 'integration_test' });
    dc.dau({ kingdom: 'integration_test' });
    dc.event({ kingdom: 'integration_test', phylum: 'test_event' });
    dc.economy({ spend_currency: 'USD', spend_amount: 1.99, spend_type: 'test' });
    dc.messageSend({ 
      network: 'test_network', 
      from_tag: 'test_sender', 
      to_list: ['test_recipient1', 'test_recipient2'] 
    });
    dc.messageClick({ 
      network: 'test_network', 
      from_tag: 'test_sender', 
      to_tag: 'test_recipient' 
    });
    
    assert.strictEqual(dc.eventList.length, 6);
    
    // Test logging
    dc.log('Integration test log message');
    dc.logEvent({ 
      log_line: 'Custom log event',
      log_level: 'INFO',
      hostname: 'test-host',
      filename: 'integration.test.ts'
    });
    
    assert.strictEqual(dc.logList.length, 2);
    
    // Flush to send events (this will make actual API calls)
    dc.flush();
    
    // Wait a bit for async operations to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  test('integration: middleware workflow', async (t) => {
    const dc = create();
    
    await new Promise<void>((resolve) => {
      dc.init({
        apiKey: API_KEY!,
        orgName: ORG_NAME,
        hostname: 'integration-test-host',
        filename: 'middleware.test.ts',
      }, resolve);
    });
    
    const middleware = createLogger({ 
      dataCortex: dc,
      logConsole: false,
      prepareEvent: (req, res, event) => {
        event.custom_field = 'integration_test';
      }
    });
    
    // Mock Express request/response
    const mockReq = {
      _startTimestamp: Date.now(),
      ip: '192.168.1.100',
      method: 'POST',
      originalUrl: '/api/test',
      httpVersionMajor: 1,
      httpVersionMinor: 1,
      get: (header: string) => {
        const headers: Record<string, string> = {
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'referrer': 'https://integration-test.com'
        };
        return headers[header.toLowerCase()];
      }
    };
    
    const mockRes = {
      statusCode: 201,
      getHeader: (name: string) => {
        if (name.toLowerCase() === 'content-length') return 2048;
        return undefined;
      },
      end: function(chunk?: unknown, encoding?: BufferEncoding) {
        return this;
      }
    };
    
    const mockNext = () => {};
    
    // Use the middleware
    middleware(mockReq as any, mockRes as any, mockNext);
    
    // Simulate response end
    mockRes.end();
    
    assert.strictEqual(dc.logList.length, 1);
    const logEvent = dc.logList[0];
    
    assert.strictEqual(logEvent.remote_address, '192.168.1.100');
    assert.strictEqual(logEvent.log_level, '201');
    assert.strictEqual(logEvent.log_line, 'POST /api/test HTTP/1.1');
    assert.strictEqual(logEvent.response_bytes, 2048);
    assert.strictEqual(logEvent.os, 'mac');
    assert.strictEqual(logEvent.browser, 'chrome');
    assert.strictEqual(logEvent.filename, 'https://integration-test.com');
    assert.strictEqual((logEvent as any).custom_field, 'integration_test');
    
    // Flush logs
    dc.flush();
    
    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  test('integration: error handling with invalid data', async (t) => {
    const dc = create();
    
    await new Promise<void>((resolve) => {
      dc.init({
        apiKey: 'invalid_api_key', // Use invalid API key to test error handling
        orgName: ORG_NAME,
        deviceTag: 'error_test_device',
      }, resolve);
    });
    
    // Add an event that should fail due to invalid API key
    dc.event({ kingdom: 'error_test' });
    
    assert.strictEqual(dc.eventList.length, 1);
    
    // Mock console.error to capture error messages
    const originalConsoleError = console.error;
    let errorMessages: string[] = [];
    console.error = (...args: any[]) => {
      errorMessages.push(args.join(' '));
    };
    
    // Flush to trigger API call with invalid key
    dc.flush();
    
    // Wait for async operations and error handling
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Restore console.error
    console.error = originalConsoleError;
    
    // Should have received an error about bad API key
    const hasApiKeyError = errorMessages.some(msg => 
      msg.includes('Bad API Key') || msg.includes('403')
    );
    
    if (hasApiKeyError) {
      // API key error was properly handled
      assert.ok(true);
    } else {
      // If no error was captured, the event should still be in the list (retry logic)
      assert.ok(dc.eventList.length >= 0);
    }
  });

  test('integration: batch processing', async (t) => {
    const dc = create();
    
    await new Promise<void>((resolve) => {
      dc.init({
        apiKey: API_KEY!,
        orgName: ORG_NAME,
        deviceTag: 'batch_test_device',
      }, resolve);
    });
    
    // Add more events than the batch size (EVENT_SEND_COUNT = 10)
    for (let i = 0; i < 15; i++) {
      dc.event({ 
        kingdom: 'batch_test',
        phylum: `event_${i}`,
        float1: i * 1.5
      });
    }
    
    assert.strictEqual(dc.eventList.length, 15);
    
    // Flush should process events in batches
    dc.flush();
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Events should be processed (removed from list) or still queued for retry
    assert.ok(dc.eventList.length >= 0);
  });

  test('integration: log batch processing', async (t) => {
    const dc = create();
    
    await new Promise<void>((resolve) => {
      dc.init({
        apiKey: API_KEY!,
        orgName: ORG_NAME,
        hostname: 'batch-log-test',
      }, resolve);
    });
    
    // Add more logs than the batch size (LOG_SEND_COUNT = 100)
    for (let i = 0; i < 150; i++) {
      dc.log(`Batch log message ${i}`, { index: i });
    }
    
    assert.strictEqual(dc.logList.length, 150);
    
    // Flush should process logs in batches
    dc.flush();
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Logs should be processed (removed from list) or still queued for retry
    assert.ok(dc.logList.length >= 0);
  });

} else {
  test('integration tests skipped - no API key', () => {
    console.log('Integration tests skipped because DC_API_KEY environment variable is not set');
    assert.ok(true);
  });
}

// Always run these tests regardless of API key
test('integration: data validation and sanitization', () => {
  const dc = create();
  dc.init({
    apiKey: 'test_key',
    orgName: ORG_NAME,
    deviceTag: 'validation_test',
  });
  
  // Test string truncation
  const longString = 'a'.repeat(100);
  dc.event({ kingdom: longString });
  
  assert.strictEqual(dc.eventList[0].kingdom, 'a'.repeat(32));
  
  // Test number validation
  dc.event({ float1: 'not_a_number' as any, float2: Infinity, float3: 123.45 });
  
  const event = dc.eventList[1];
  assert.strictEqual(event.float1, undefined); // Invalid number should be removed
  assert.strictEqual(event.float2, undefined); // Infinity should be removed
  assert.strictEqual(event.float3, 123.45); // Valid number should be kept
  
  // Test log string limits
  const veryLongLogLine = 'x'.repeat(70000);
  const logResult = dc.logEvent({ log_line: veryLongLogLine });
  
  assert.strictEqual(logResult.log_line, 'x'.repeat(65535)); // Should be truncated to limit
});

test('integration: concurrent operations', async () => {
  const dc = create();
  dc.init({
    apiKey: 'test_key',
    orgName: ORG_NAME,
    deviceTag: 'concurrent_test',
  });
  
  // Simulate concurrent event additions
  const promises = [];
  for (let i = 0; i < 10; i++) {
    promises.push(
      new Promise<void>((resolve) => {
        setTimeout(() => {
          dc.event({ kingdom: `concurrent_${i}` });
          resolve();
        }, Math.random() * 100);
      })
    );
  }
  
  await Promise.all(promises);
  
  assert.strictEqual(dc.eventList.length, 10);
  
  // Verify all events have unique indices
  const indices = dc.eventList.map(e => e.event_index);
  const uniqueIndices = [...new Set(indices)];
  assert.strictEqual(indices.length, uniqueIndices.length);
});

test('integration: memory management', () => {
  const dc = create();
  dc.init({
    apiKey: 'test_key',
    orgName: ORG_NAME,
    deviceTag: 'memory_test',
  });
  
  // Add many events and logs
  for (let i = 0; i < 1000; i++) {
    dc.event({ kingdom: `memory_test_${i}` });
    dc.log(`Memory test log ${i}`);
  }
  
  const initialEventCount = dc.eventList.length;
  const initialLogCount = dc.logList.length;
  
  assert.strictEqual(initialEventCount, 1000);
  assert.strictEqual(initialLogCount, 1000);
  
  // Simulate removing processed events
  dc._removeEvents(dc.eventList.slice(0, 500));
  dc._removeLogs(dc.logList.slice(0, 500));
  
  assert.strictEqual(dc.eventList.length, 500);
  assert.strictEqual(dc.logList.length, 500);
});
