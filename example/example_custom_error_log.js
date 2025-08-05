const { DataCortex } = require('./dist/index.js');

// Example 1: Using default error logging
console.log('=== Example 1: Default error logging ===');
const dataCortex1 = new DataCortex();
dataCortex1.init({
  apiKey: 'test-key',
  orgName: 'test-org',
  deviceTag: 'test-device',
});

// Example 2: Using custom error logging function
console.log('\n=== Example 2: Custom error logging ===');
const dataCortex2 = new DataCortex();

// Custom error logger that writes to a different format
const customErrorLog = (...args) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] CUSTOM ERROR:`, ...args);
};

dataCortex2.init({
  apiKey: 'test-key',
  orgName: 'test-org',
  deviceTag: 'test-device',
  errorLog: customErrorLog, // Use our custom error logger
});

// Example 3: Using a logger that writes to file or external service
console.log('\n=== Example 3: Silent error logging ===');
const dataCortex3 = new DataCortex();

// Silent error logger (could write to file, send to monitoring service, etc.)
const silentErrorLog = (...args) => {
  // In a real application, you might:
  // - Write to a log file
  // - Send to a monitoring service like Sentry
  // - Store in a database
  // For this example, we'll just store in memory
  console.log(
    'Silent logger received error (would normally write to file):',
    args.join(' '),
  );
};

dataCortex3.init({
  apiKey: 'test-key',
  orgName: 'test-org',
  deviceTag: 'test-device',
  errorLog: silentErrorLog,
});

console.log(
  '\nAll DataCortex instances initialized with different error logging strategies!',
);
