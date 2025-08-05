import test from 'node:test';
import assert from 'node:assert';

import * as dataCortex from '../dist/index.js';

test('synchronous passing test', (t) => {
  // This test passes because it does not throw an exception.
  assert.strictEqual(1, 1);
});

test('dataCortex.init requires apiKey', (t) => {
  assert.throws(() => {
    dataCortex.init({ orgName: 'test' });
  }, /opts.apiKey is required/);
});

test('dataCortex.init requires orgName', (t) => {
  assert.throws(() => {
    dataCortex.init({ apiKey: 'test' });
  }, /opts.orgName is required/);
});

// Import all other test files to run them
import './data_cortex.test.js';
import './middleware.test.js';
import './constants.test.js';
import './index.test.js';
import './additional-coverage.test.js';
