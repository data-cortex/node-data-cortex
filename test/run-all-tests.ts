#!/usr/bin/env tsx

import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

const testDir = __dirname;
const srcDir = join(__dirname, '..', 'src');

async function getTestFiles(): Promise<string[]> {
  const files = await readdir(testDir);
  return files
    .filter((file) => file.endsWith('.test.ts') || file.endsWith('.test.js'))
    .map((file) => join(testDir, file));
}

async function getSrcFiles(): Promise<string[]> {
  const files = await readdir(srcDir);
  return files
    .filter((file) => file.endsWith('.ts'))
    .map((file) => join(srcDir, file));
}

async function runTests(): Promise<void> {
  console.log('🧪 Running comprehensive test suite for node-data-cortex\n');

  const testFiles = await getTestFiles();
  const srcFiles = await getSrcFiles();

  console.log(`📁 Found ${testFiles.length} test files:`);
  testFiles.forEach((file) => console.log(`   - ${file.split('/').pop()}`));

  console.log(`\n📁 Testing ${srcFiles.length} source files:`);
  srcFiles.forEach((file) => console.log(`   - ${file.split('/').pop()}`));

  console.log('\n' + '='.repeat(60));
  console.log('🚀 Starting test execution...\n');

  // Build the project first
  console.log('📦 Building project...');
  const buildProcess = spawn('npm', ['run', 'build'], {
    cwd: join(__dirname, '..'),
    stdio: 'inherit',
  });

  await new Promise<void>((resolve, reject) => {
    buildProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Build successful\n');
        resolve();
      } else {
        console.error('❌ Build failed');
        reject(new Error(`Build failed with code ${code}`));
      }
    });
  });

  // Run the main test file which imports all others
  console.log('🧪 Running all tests...');
  const testProcess = spawn('tsx', ['--test', '--experimental-test-coverage', join(testDir, 'test.ts')], {
    cwd: join(__dirname, '..'),
    stdio: 'inherit',
  });

  await new Promise<void>((resolve, reject) => {
    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log('\n✅ All tests passed!');
        resolve();
      } else {
        console.error('\n❌ Some tests failed');
        reject(new Error(`Tests failed with code ${code}`));
      }
    });
  });

  // Run integration tests separately if API key is available
  if (process.env.DC_API_KEY) {
    console.log('\n🔗 Running integration tests...');
    const integrationProcess = spawn(
      'tsx',
      ['--test', join(testDir, 'integration.test.ts')],
      {
        cwd: join(__dirname, '..'),
        stdio: 'inherit',
      }
    );

    await new Promise<void>((resolve, reject) => {
      integrationProcess.on('close', (code) => {
        if (code === 0) {
          console.log('\n✅ Integration tests passed!');
          resolve();
        } else {
          console.error('\n❌ Integration tests failed');
          reject(new Error(`Integration tests failed with code ${code}`));
        }
      });
    });
  } else {
    console.log('\n⚠️  Integration tests skipped (DC_API_KEY not set)');
    console.log(
      '   Set DC_API_KEY environment variable to run integration tests'
    );
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 Test suite completed!');
  console.log('\n📊 Test Coverage Summary:');
  console.log(
    '   - DataCortex class: Constructor, init, all event methods, logging'
  );
  console.log('   - Middleware: Express integration, user agent parsing');
  console.log('   - Constants: All exported constants and their properties');
  console.log('   - Index: All exports and bound methods');
  console.log(
    '   - Integration: Full workflow with real API calls (if API key provided)'
  );

  console.log('\n🔍 Areas covered:');
  console.log('   ✅ Input validation and error handling');
  console.log('   ✅ Data sanitization and truncation');
  console.log('   ✅ Event batching and processing');
  console.log('   ✅ Logging functionality');
  console.log('   ✅ Express middleware integration');
  console.log('   ✅ User agent parsing');
  console.log('   ✅ Configuration and initialization');
  console.log('   ✅ Memory management');
  console.log('   ✅ Concurrent operations');
  console.log('   ✅ API integration (when API key available)');
}

if (require.main === module) {
  runTests().catch((error) => {
    console.error('❌ Test runner failed:', error.message);
    process.exit(1);
  });
}

export { runTests };
