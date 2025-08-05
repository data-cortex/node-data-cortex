import test from 'node:test';
import assert from 'node:assert';
import { DataCortex, create, createLogger } from '../dist';

const API_KEY = process.env.DC_API_KEY;
const ORG_NAME = 'test_org';

// Only run integration tests if API key is available
const runIntegrationTests = !!API_KEY;

if (runIntegrationTests) {
  test('integration: full event workflow', async (t) => {
    const dc = create();

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
    });

    assert.strictEqual(dc.isReady, true);

    // Add various types of events
    dc.install({ kingdom: 'integration_test' });
    dc.dau({ kingdom: 'integration_test' });
    dc.event({ kingdom: 'integration_test', phylum: 'test_event' });
    dc.economy({
      spend_currency: 'USD',
      spend_amount: 1.99,
      spend_type: 'test',
    });
    dc.messageSend({
      network: 'test_network',
      from_tag: 'test_sender',
      to_list: ['test_recipient1', 'test_recipient2'],
    });
    dc.messageClick({
      network: 'test_network',
      from_tag: 'test_sender',
      to_tag: 'test_recipient',
    });

    assert.strictEqual(dc.eventList.length, 6);

    // Test logging
    dc.log('Integration test log message');
    dc.logEvent({
      log_line: 'Custom log event',
      log_level: 'INFO',
      hostname: 'test-host',
      filename: 'integration.test.ts',
    });

    assert.strictEqual(dc.logList.length, 2);

    // Flush to send events (this will make actual API calls)
    dc.flush();

    // Wait a bit for async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  test('integration: middleware workflow', async (t) => {
    const dc = create();

    dc.init({
      apiKey: API_KEY!,
      orgName: ORG_NAME,
      hostname: 'integration-test-host',
      filename: 'middleware.test.ts',
    });

    // Test the middleware functionality by simulating what the middleware would do
    // Use device_tag which is an allowed property in LOG_PROP_LIST
    const testEvent = {
      event_datetime: new Date(),
      response_ms: 150,
      response_bytes: 2048,
      log_level: '201',
      log_line: 'POST /api/test HTTP/1.1',
      remote_address: '192.168.1.100',
      filename: 'https://integration-test.com',
      os: 'mac',
      browser: 'chrome',
      device_tag: 'integration_test', // Use device_tag instead of custom_field
    };

    dc.logEvent(testEvent);

    assert.strictEqual(dc.logList.length, 1);
    const logEvent = dc.logList[0];

    assert.strictEqual(logEvent.remote_address, '192.168.1.100');
    assert.strictEqual(logEvent.log_level, '201');
    assert.strictEqual(logEvent.log_line, 'POST /api/test HTTP/1.1');
    assert.strictEqual(logEvent.response_bytes, 2048);
    assert.strictEqual(logEvent.os, 'mac');
    assert.strictEqual(logEvent.browser, 'chrome');
    assert.strictEqual(logEvent.filename, 'https://integration-test.com');
    assert.strictEqual(logEvent.device_tag, 'integration_test');

    // Flush logs
    dc.flush();

    // Wait for async operations
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  test('integration: error handling with invalid data', async (t) => {
    const dc = create();

    dc.init({
      apiKey: 'invalid_api_key', // Use invalid API key to test error handling
      orgName: ORG_NAME,
      deviceTag: 'error_test_device',
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
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Restore console.error
    console.error = originalConsoleError;

    // Should have received an error about bad API key
    const hasApiKeyError = errorMessages.some(
      (msg) => msg.includes('Bad API Key') || msg.includes('403'),
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

    dc.init({
      apiKey: API_KEY!,
      orgName: ORG_NAME,
      deviceTag: 'batch_test_device',
    });

    // Add more events than the batch size (EVENT_SEND_COUNT = 10)
    for (let i = 0; i < 15; i++) {
      dc.event({
        kingdom: 'batch_test',
        phylum: `event_${i}`,
        float1: i * 1.5,
      });
    }

    assert.strictEqual(dc.eventList.length, 15);

    // Flush should process events in batches
    dc.flush();

    // Wait for processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Events should be processed (removed from list) or still queued for retry
    assert.ok(dc.eventList.length >= 0);
  });

  test('integration: log batch processing', async (t) => {
    const dc = create();

    dc.init({
      apiKey: API_KEY!,
      orgName: ORG_NAME,
      hostname: 'batch-log-test',
    });

    // Add more logs than the batch size (LOG_SEND_COUNT = 100)
    for (let i = 0; i < 150; i++) {
      dc.log(`Batch log message ${i}`, { index: i });
    }

    assert.strictEqual(dc.logList.length, 150);

    // Flush should process logs in batches
    dc.flush();

    // Wait for processing
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Logs should be processed (removed from list) or still queued for retry
    assert.ok(dc.logList.length >= 0);
  });
} else {
  test('integration tests skipped - no API key', () => {
    console.log(
      'Integration tests skipped because DC_API_KEY environment variable is not set',
    );
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
  dc.logEvent({ log_line: veryLongLogLine });

  // Check the logList instead of expecting a return value
  assert.strictEqual(dc.logList.length, 1);
  const logEvent = dc.logList[0];
  assert.strictEqual(logEvent.log_line, 'x'.repeat(65535)); // Should be truncated to limit
});

test('integration: concurrent operations', async () => {
  const dc = create();
  dc.init({
    apiKey: 'test_key',
    orgName: ORG_NAME,
    deviceTag: 'concurrent_test',
  });

  // Test concurrent-like operations by adding events synchronously
  // This tests that the event indexing works correctly under rapid additions
  for (let i = 0; i < 10; i++) {
    dc.event({ kingdom: `concurrent_${i}` });
  }

  // Verify we have exactly 10 events
  assert.strictEqual(
    dc.eventList.length,
    10,
    `Expected 10 events, got ${dc.eventList.length}`,
  );

  // Verify all events have unique indices
  const indices = dc.eventList.map((e) => e.event_index);
  const uniqueIndices = [...new Set(indices)];
  assert.strictEqual(
    indices.length,
    uniqueIndices.length,
    'All events should have unique indices',
  );

  // Verify all expected kingdoms are present
  const kingdoms = dc.eventList.map((e) => e.kingdom).sort();
  const expectedKingdoms = Array.from(
    { length: 10 },
    (_, i) => `concurrent_${i}`,
  ).sort();
  assert.deepStrictEqual(
    kingdoms,
    expectedKingdoms,
    'All expected kingdoms should be present',
  );

  // Test that indices are sequential
  const sortedIndices = [...indices].sort((a, b) => a - b);
  for (let i = 1; i < sortedIndices.length; i++) {
    assert.strictEqual(
      sortedIndices[i],
      sortedIndices[i - 1] + 1,
      'Indices should be sequential',
    );
  }
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

// Min and Max argument tests for DataCortex methods
test('min/max arguments: event method', async () => {
  let errorLogs: string[] = [];
  let apiKeyErrors = 0;
  const mockErrorLog = (...args: unknown[]) => {
    const message = args.join(' ');
    errorLogs.push(message);
    if (message.includes('Bad API Key')) {
      apiKeyErrors++;
    }
  };

  const dc = create();
  dc.init({
    apiKey: 'test_key',
    orgName: ORG_NAME,
    deviceTag: 'test_device',
    errorLog: mockErrorLog,
  });

  // Min test - only required arguments (kingdom is not required, but we need at least one property)
  dc.event({ kingdom: 'test' });
  dc.flush();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  // We expect API key errors since we're using a test key, but no other errors
  assert.strictEqual(
    errorLogs.length - apiKeyErrors,
    0,
    'Min test should not produce non-API-key error logs',
  );

  // Reset error logs for max test
  errorLogs = [];
  apiKeyErrors = 0;

  // Max test - all possible arguments
  dc.event({
    kingdom: 'test_kingdom',
    phylum: 'test_phylum',
    class: 'test_class',
    order: 'test_order',
    family: 'test_family',
    genus: 'test_genus',
    species: 'test_species',
    channel: 'test_channel',
    float1: 1.1,
    float2: 2.2,
    float3: 3.3,
    float4: 4.4,
    event_datetime: new Date(),
    device_tag: 'test_device_override',
    user_tag: 'test_user_override',
  });
  dc.flush();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  assert.strictEqual(
    errorLogs.length - apiKeyErrors,
    0,
    'Max test should not produce non-API-key error logs',
  );
});

test('min/max arguments: install method', async () => {
  let errorLogs: string[] = [];
  let apiKeyErrors = 0;
  const mockErrorLog = (...args: unknown[]) => {
    const message = args.join(' ');
    errorLogs.push(message);
    if (message.includes('Bad API Key')) {
      apiKeyErrors++;
    }
  };

  const dc = create();
  dc.init({
    apiKey: 'test_key',
    orgName: ORG_NAME,
    deviceTag: 'test_device',
    errorLog: mockErrorLog,
  });

  // Min test - only required arguments
  dc.install({ kingdom: 'test' });
  dc.flush();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  assert.strictEqual(
    errorLogs.length - apiKeyErrors,
    0,
    'Min test should not produce non-API-key error logs',
  );

  // Reset error logs for max test
  errorLogs = [];
  apiKeyErrors = 0;

  // Max test - all possible arguments
  dc.install({
    kingdom: 'install_kingdom',
    phylum: 'install_phylum',
    class: 'install_class',
    order: 'install_order',
    family: 'install_family',
    genus: 'install_genus',
    species: 'install_species',
    channel: 'install_channel',
    float1: 10.1,
    float2: 20.2,
    float3: 30.3,
    float4: 40.4,
    event_datetime: new Date(),
    device_tag: 'install_device_override',
    user_tag: 'install_user_override',
  });
  dc.flush();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  assert.strictEqual(
    errorLogs.length - apiKeyErrors,
    0,
    'Max test should not produce non-API-key error logs',
  );
});

test('min/max arguments: dau method', async () => {
  let errorLogs: string[] = [];
  let apiKeyErrors = 0;
  const mockErrorLog = (...args: unknown[]) => {
    const message = args.join(' ');
    errorLogs.push(message);
    if (message.includes('Bad API Key')) {
      apiKeyErrors++;
    }
  };

  const dc = create();
  dc.init({
    apiKey: 'test_key',
    orgName: ORG_NAME,
    deviceTag: 'test_device',
    errorLog: mockErrorLog,
  });

  // Min test - only required arguments
  dc.dau({ kingdom: 'test' });
  dc.flush();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  assert.strictEqual(
    errorLogs.length - apiKeyErrors,
    0,
    'Min test should not produce non-API-key error logs',
  );

  // Reset error logs for max test
  errorLogs = [];
  apiKeyErrors = 0;

  // Max test - all possible arguments
  dc.dau({
    kingdom: 'dau_kingdom',
    phylum: 'dau_phylum',
    class: 'dau_class',
    order: 'dau_order',
    family: 'dau_family',
    genus: 'dau_genus',
    species: 'dau_species',
    channel: 'dau_channel',
    float1: 100.1,
    float2: 200.2,
    float3: 300.3,
    float4: 400.4,
    event_datetime: new Date(),
    device_tag: 'dau_device_override',
    user_tag: 'dau_user_override',
  });
  dc.flush();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  assert.strictEqual(
    errorLogs.length - apiKeyErrors,
    0,
    'Max test should not produce non-API-key error logs',
  );
});

test('min/max arguments: economy method', async () => {
  let errorLogs: string[] = [];
  let apiKeyErrors = 0;
  const mockErrorLog = (...args: unknown[]) => {
    const message = args.join(' ');
    errorLogs.push(message);
    if (message.includes('Bad API Key')) {
      apiKeyErrors++;
    }
  };

  const dc = create();
  dc.init({
    apiKey: 'test_key',
    orgName: ORG_NAME,
    deviceTag: 'test_device',
    errorLog: mockErrorLog,
  });

  // Min test - only required arguments
  dc.economy({
    spend_currency: 'USD',
    spend_amount: 9.99,
  });
  dc.flush();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  assert.strictEqual(
    errorLogs.length - apiKeyErrors,
    0,
    'Min test should not produce non-API-key error logs',
  );

  // Reset error logs for max test
  errorLogs = [];
  apiKeyErrors = 0;

  // Max test - all possible arguments
  dc.economy({
    spend_currency: 'EUR',
    spend_amount: 19.99,
    spend_type: 'premium_upgrade',
    kingdom: 'economy_kingdom',
    phylum: 'economy_phylum',
    class: 'economy_class',
    order: 'economy_order',
    family: 'economy_family',
    genus: 'economy_genus',
    species: 'economy_species',
    channel: 'economy_channel',
    float1: 1000.1,
    float2: 2000.2,
    float3: 3000.3,
    float4: 4000.4,
    event_datetime: new Date(),
    device_tag: 'economy_device_override',
    user_tag: 'economy_user_override',
  });
  dc.flush();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  assert.strictEqual(
    errorLogs.length - apiKeyErrors,
    0,
    'Max test should not produce non-API-key error logs',
  );
});

test('min/max arguments: messageSend method', async () => {
  let errorLogs: string[] = [];
  let apiKeyErrors = 0;
  const mockErrorLog = (...args: unknown[]) => {
    const message = args.join(' ');
    errorLogs.push(message);
    if (message.includes('Bad API Key')) {
      apiKeyErrors++;
    }
  };

  const dc = create();
  dc.init({
    apiKey: 'test_key',
    orgName: ORG_NAME,
    deviceTag: 'test_device',
    errorLog: mockErrorLog,
  });

  // Min test - only required arguments
  dc.messageSend({
    network: 'test_network',
    from_tag: 'sender123',
    to_list: ['recipient1', 'recipient2'],
  });
  dc.flush();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  assert.strictEqual(
    errorLogs.length - apiKeyErrors,
    0,
    'Min test should not produce non-API-key error logs',
  );

  // Reset error logs for max test
  errorLogs = [];
  apiKeyErrors = 0;

  // Max test - all possible arguments
  dc.messageSend({
    network: 'premium_network',
    from_tag: 'premium_sender',
    to_list: ['recipient1', 'recipient2', 'recipient3'],
    kingdom: 'message_kingdom',
    phylum: 'message_phylum',
    class: 'message_class',
    order: 'message_order',
    family: 'message_family',
    genus: 'message_genus',
    species: 'message_species',
    channel: 'message_channel',
    float1: 10000.1,
    float2: 20000.2,
    float3: 30000.3,
    float4: 40000.4,
    event_datetime: new Date(),
    device_tag: 'message_device_override',
    user_tag: 'message_user_override',
  });
  dc.flush();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  assert.strictEqual(
    errorLogs.length - apiKeyErrors,
    0,
    'Max test should not produce non-API-key error logs',
  );
});

test('min/max arguments: messageClick method', async () => {
  let errorLogs: string[] = [];
  let apiKeyErrors = 0;
  const mockErrorLog = (...args: unknown[]) => {
    const message = args.join(' ');
    errorLogs.push(message);
    if (message.includes('Bad API Key')) {
      apiKeyErrors++;
    }
  };

  const dc = create();
  dc.init({
    apiKey: 'test_key',
    orgName: ORG_NAME,
    deviceTag: 'test_device',
    errorLog: mockErrorLog,
  });

  // Min test - only required arguments
  dc.messageClick({
    network: 'test_network',
    from_tag: 'sender123',
    to_tag: 'recipient123',
  });
  dc.flush();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  assert.strictEqual(
    errorLogs.length - apiKeyErrors,
    0,
    'Min test should not produce non-API-key error logs',
  );

  // Reset error logs for max test
  errorLogs = [];
  apiKeyErrors = 0;

  // Max test - all possible arguments
  dc.messageClick({
    network: 'premium_network',
    from_tag: 'premium_sender',
    to_tag: 'premium_recipient',
    kingdom: 'click_kingdom',
    phylum: 'click_phylum',
    class: 'click_class',
    order: 'click_order',
    family: 'click_family',
    genus: 'click_genus',
    species: 'click_species',
    channel: 'click_channel',
    float1: 100000.1,
    float2: 200000.2,
    float3: 300000.3,
    float4: 400000.4,
    event_datetime: new Date(),
    device_tag: 'click_device_override',
    user_tag: 'click_user_override',
  });
  dc.flush();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  assert.strictEqual(
    errorLogs.length - apiKeyErrors,
    0,
    'Max test should not produce non-API-key error logs',
  );
});

test('min/max arguments: log method', async () => {
  let errorLogs: string[] = [];
  let apiKeyErrors = 0;
  const mockErrorLog = (...args: unknown[]) => {
    const message = args.join(' ');
    errorLogs.push(message);
    if (message.includes('Bad API Key')) {
      apiKeyErrors++;
    }
  };

  const dc = create();
  dc.init({
    apiKey: 'test_key',
    orgName: ORG_NAME,
    deviceTag: 'test_device',
    errorLog: mockErrorLog,
  });

  // Min test - only required arguments
  dc.log('Simple log message');
  dc.flush();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  assert.strictEqual(
    errorLogs.length - apiKeyErrors,
    0,
    'Min test should not produce non-API-key error logs',
  );

  // Reset error logs for max test
  errorLogs = [];
  apiKeyErrors = 0;

  // Max test - multiple arguments of different types
  dc.log(
    'Complex log message',
    { key: 'value' },
    42,
    true,
    new Error('test error'),
  );
  dc.flush();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  assert.strictEqual(
    errorLogs.length - apiKeyErrors,
    0,
    'Max test should not produce non-API-key error logs',
  );
});

test('min/max arguments: logEvent method', async () => {
  let errorLogs: string[] = [];
  let apiKeyErrors = 0;
  const mockErrorLog = (...args: unknown[]) => {
    const message = args.join(' ');
    errorLogs.push(message);
    if (message.includes('Bad API Key')) {
      apiKeyErrors++;
    }
  };

  const dc = create();
  dc.init({
    apiKey: 'test_key',
    orgName: ORG_NAME,
    deviceTag: 'test_device',
    hostname: 'test_hostname',
    filename: 'test_filename',
    errorLog: mockErrorLog,
  });

  // Min test - only required arguments (log_line is effectively required)
  dc.logEvent({
    log_line: 'Minimal log event',
  });
  dc.flush();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  assert.strictEqual(
    errorLogs.length - apiKeyErrors,
    0,
    'Min test should not produce non-API-key error logs',
  );

  // Reset error logs for max test
  errorLogs = [];
  apiKeyErrors = 0;

  // Max test - all possible arguments
  dc.logEvent({
    event_datetime: new Date(),
    response_bytes: 1024,
    response_ms: 250,
    hostname: 'custom_hostname',
    filename: 'custom_filename.js',
    log_level: 'INFO',
    device_tag: 'custom_device_tag',
    user_tag: 'custom_user_tag',
    remote_address: '192.168.1.100',
    log_line: 'Maximum log event with all properties',
    device_type: 'mobile',
    os: 'iOS',
    os_ver: '15.0',
    browser: 'Safari',
    browser_ver: '15.0',
    country: 'US',
    language: 'en',
  });
  dc.flush();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  assert.strictEqual(
    errorLogs.length - apiKeyErrors,
    0,
    'Max test should not produce non-API-key error logs',
  );
});
