import test from 'node:test';
import assert from 'node:assert';
import {
  STRING_PROP_LIST,
  NUMBER_PROP_LIST,
  OTHER_PROP_LIST,
  DEFAULT_BUNDLE_PROP_LIST,
  EVENT_PROP_LIST,
  BUNDLE_PROP_LIST,
  LOG_NUMBER_PROP_LIST,
  LOG_STRING_PROP_MAP,
  LOG_OTHER_PROP_LIST,
  LOG_PROP_LIST,
} from '../src/constants';

test('STRING_PROP_LIST contains expected string properties', () => {
  const expectedProps = [
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

  assert.deepStrictEqual(STRING_PROP_LIST, expectedProps);
});

test('NUMBER_PROP_LIST contains expected number properties', () => {
  const expectedProps = [
    'float1',
    'float2',
    'float3',
    'float4',
    'spend_amount',
  ];

  assert.deepStrictEqual(NUMBER_PROP_LIST, expectedProps);
});

test('OTHER_PROP_LIST contains expected other properties', () => {
  const expectedProps = ['type', 'event_index', 'event_datetime', 'to_list'];

  assert.deepStrictEqual(OTHER_PROP_LIST, expectedProps);
});

test('DEFAULT_BUNDLE_PROP_LIST contains expected default bundle properties', () => {
  const expectedProps = [
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

  assert.deepStrictEqual(DEFAULT_BUNDLE_PROP_LIST, expectedProps);
});

test('EVENT_PROP_LIST is combination of string, number, and other props', () => {
  const expectedProps = [
    ...STRING_PROP_LIST,
    ...NUMBER_PROP_LIST,
    ...OTHER_PROP_LIST,
  ];

  assert.deepStrictEqual(EVENT_PROP_LIST, expectedProps);
  assert.strictEqual(
    EVENT_PROP_LIST.length,
    STRING_PROP_LIST.length + NUMBER_PROP_LIST.length + OTHER_PROP_LIST.length
  );
});

test('BUNDLE_PROP_LIST is combination of event and default bundle props', () => {
  const expectedProps = [...EVENT_PROP_LIST, ...DEFAULT_BUNDLE_PROP_LIST];

  assert.deepStrictEqual(BUNDLE_PROP_LIST, expectedProps);
  assert.strictEqual(
    BUNDLE_PROP_LIST.length,
    EVENT_PROP_LIST.length + DEFAULT_BUNDLE_PROP_LIST.length
  );
});

test('LOG_NUMBER_PROP_LIST contains expected log number properties', () => {
  const expectedProps = ['response_bytes', 'response_ms'];

  assert.deepStrictEqual(LOG_NUMBER_PROP_LIST, expectedProps);
});

test('LOG_STRING_PROP_MAP contains expected log string properties with limits', () => {
  const expectedMap = {
    hostname: 64,
    filename: 256,
    log_level: 64,
    device_tag: 62,
    user_tag: 62,
    remote_address: 64,
    log_line: 65535,
  };

  assert.deepStrictEqual(LOG_STRING_PROP_MAP, expectedMap);
});

test('LOG_OTHER_PROP_LIST contains expected log other properties', () => {
  const expectedProps = [
    'event_datetime',
    'device_type',
    'os',
    'os_ver',
    'browser',
    'browser_ver',
    'country',
    'language',
  ];

  assert.deepStrictEqual(LOG_OTHER_PROP_LIST, expectedProps);
});

test('LOG_PROP_LIST is combination of log number, string, and other props', () => {
  const expectedProps = LOG_NUMBER_PROP_LIST.concat(
    Object.keys(LOG_STRING_PROP_MAP),
    LOG_OTHER_PROP_LIST
  );

  assert.deepStrictEqual(LOG_PROP_LIST, expectedProps);
  assert.strictEqual(
    LOG_PROP_LIST.length,
    LOG_NUMBER_PROP_LIST.length +
      Object.keys(LOG_STRING_PROP_MAP).length +
      LOG_OTHER_PROP_LIST.length
  );
});

test('STRING_PROP_LIST has no duplicates', () => {
  const uniqueProps = [...new Set(STRING_PROP_LIST)];
  assert.strictEqual(STRING_PROP_LIST.length, uniqueProps.length);
});

test('NUMBER_PROP_LIST has no duplicates', () => {
  const uniqueProps = [...new Set(NUMBER_PROP_LIST)];
  assert.strictEqual(NUMBER_PROP_LIST.length, uniqueProps.length);
});

test('OTHER_PROP_LIST has no duplicates', () => {
  const uniqueProps = [...new Set(OTHER_PROP_LIST)];
  assert.strictEqual(OTHER_PROP_LIST.length, uniqueProps.length);
});

test('DEFAULT_BUNDLE_PROP_LIST has no duplicates', () => {
  const uniqueProps = [...new Set(DEFAULT_BUNDLE_PROP_LIST)];
  assert.strictEqual(DEFAULT_BUNDLE_PROP_LIST.length, uniqueProps.length);
});

test('LOG_NUMBER_PROP_LIST has no duplicates', () => {
  const uniqueProps = [...new Set(LOG_NUMBER_PROP_LIST)];
  assert.strictEqual(LOG_NUMBER_PROP_LIST.length, uniqueProps.length);
});

test('LOG_OTHER_PROP_LIST has no duplicates', () => {
  const uniqueProps = [...new Set(LOG_OTHER_PROP_LIST)];
  assert.strictEqual(LOG_OTHER_PROP_LIST.length, uniqueProps.length);
});

test('EVENT_PROP_LIST has no duplicates', () => {
  const uniqueProps = [...new Set(EVENT_PROP_LIST)];
  assert.strictEqual(EVENT_PROP_LIST.length, uniqueProps.length);
});

test('BUNDLE_PROP_LIST has no duplicates', () => {
  const uniqueProps = [...new Set(BUNDLE_PROP_LIST)];
  assert.strictEqual(BUNDLE_PROP_LIST.length, uniqueProps.length);
});

test('LOG_PROP_LIST has no duplicates', () => {
  const uniqueProps = [...new Set(LOG_PROP_LIST)];
  assert.strictEqual(LOG_PROP_LIST.length, uniqueProps.length);
});

test('all string properties are strings', () => {
  STRING_PROP_LIST.forEach((prop) => {
    assert.strictEqual(typeof prop, 'string');
    assert.ok(prop.length > 0);
  });
});

test('all number properties are strings', () => {
  NUMBER_PROP_LIST.forEach((prop) => {
    assert.strictEqual(typeof prop, 'string');
    assert.ok(prop.length > 0);
  });
});

test('all other properties are strings', () => {
  OTHER_PROP_LIST.forEach((prop) => {
    assert.strictEqual(typeof prop, 'string');
    assert.ok(prop.length > 0);
  });
});

test('all default bundle properties are strings', () => {
  DEFAULT_BUNDLE_PROP_LIST.forEach((prop) => {
    assert.strictEqual(typeof prop, 'string');
    assert.ok(prop.length > 0);
  });
});

test('all log number properties are strings', () => {
  LOG_NUMBER_PROP_LIST.forEach((prop) => {
    assert.strictEqual(typeof prop, 'string');
    assert.ok(prop.length > 0);
  });
});

test('all log other properties are strings', () => {
  LOG_OTHER_PROP_LIST.forEach((prop) => {
    assert.strictEqual(typeof prop, 'string');
    assert.ok(prop.length > 0);
  });
});

test('LOG_STRING_PROP_MAP values are positive numbers', () => {
  Object.values(LOG_STRING_PROP_MAP).forEach((limit) => {
    assert.strictEqual(typeof limit, 'number');
    assert.ok(limit > 0);
    assert.ok(Number.isInteger(limit));
  });
});

test('LOG_STRING_PROP_MAP keys are strings', () => {
  Object.keys(LOG_STRING_PROP_MAP).forEach((prop) => {
    assert.strictEqual(typeof prop, 'string');
    assert.ok(prop.length > 0);
  });
});

test('specific property limits in LOG_STRING_PROP_MAP', () => {
  assert.strictEqual(LOG_STRING_PROP_MAP.hostname, 64);
  assert.strictEqual(LOG_STRING_PROP_MAP.filename, 256);
  assert.strictEqual(LOG_STRING_PROP_MAP.log_level, 64);
  assert.strictEqual(LOG_STRING_PROP_MAP.device_tag, 62);
  assert.strictEqual(LOG_STRING_PROP_MAP.user_tag, 62);
  assert.strictEqual(LOG_STRING_PROP_MAP.remote_address, 64);
  assert.strictEqual(LOG_STRING_PROP_MAP.log_line, 65535);
});

test('no overlap between STRING_PROP_LIST and NUMBER_PROP_LIST', () => {
  const stringSet = new Set(STRING_PROP_LIST);
  const numberSet = new Set(NUMBER_PROP_LIST);

  STRING_PROP_LIST.forEach((prop) => {
    assert.strictEqual(
      numberSet.has(prop),
      false,
      `Property ${prop} should not be in both string and number lists`
    );
  });

  NUMBER_PROP_LIST.forEach((prop) => {
    assert.strictEqual(
      stringSet.has(prop),
      false,
      `Property ${prop} should not be in both string and number lists`
    );
  });
});

test('no overlap between STRING_PROP_LIST and OTHER_PROP_LIST', () => {
  const stringSet = new Set(STRING_PROP_LIST);
  const otherSet = new Set(OTHER_PROP_LIST);

  STRING_PROP_LIST.forEach((prop) => {
    assert.strictEqual(
      otherSet.has(prop),
      false,
      `Property ${prop} should not be in both string and other lists`
    );
  });

  OTHER_PROP_LIST.forEach((prop) => {
    assert.strictEqual(
      stringSet.has(prop),
      false,
      `Property ${prop} should not be in both string and other lists`
    );
  });
});

test('no overlap between NUMBER_PROP_LIST and OTHER_PROP_LIST', () => {
  const numberSet = new Set(NUMBER_PROP_LIST);
  const otherSet = new Set(OTHER_PROP_LIST);

  NUMBER_PROP_LIST.forEach((prop) => {
    assert.strictEqual(
      otherSet.has(prop),
      false,
      `Property ${prop} should not be in both number and other lists`
    );
  });

  OTHER_PROP_LIST.forEach((prop) => {
    assert.strictEqual(
      numberSet.has(prop),
      false,
      `Property ${prop} should not be in both number and other lists`
    );
  });
});
