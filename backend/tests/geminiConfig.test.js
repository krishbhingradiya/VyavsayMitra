/**
 * VYAVSAYMITRA — Gemini API Environment & Configuration Test Suite
 * 
 * Verifies production-safe, secure, centralized Gemini configuration:
 * 1. Default configuration values (model: gemini-3.8-flash, temp: 0.2, tokens: 8192, timeout: 30000)
 * 2. Safe handling of missing, empty, or placeholder API keys (never crashes)
 * 3. Environment overrides for model, temperature, maxOutputTokens, and timeout
 * 4. Strict secret isolation (no keys in diagnostics, logs, or serialized payloads)
 * 5. Diagnostic and health endpoint compatibility
 */

const assert = require('assert');
const path = require('path');
const http = require('http');

// Save original environment
const originalEnv = { ...process.env };

function resetEnv() {
  process.env = { ...originalEnv };
  delete require.cache[require.resolve('../src/config/gemini')];
}

function makeHttpRequest(appInstance, options = {}) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(appInstance);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      const requestOptions = {
        hostname: '127.0.0.1',
        port,
        path: options.path || '/',
        method: options.method || 'GET',
        headers: options.headers || {}
      };

      const req = http.request(requestOptions, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          server.close(() => {
            let json = null;
            try { json = JSON.parse(body); } catch (_) {}
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body,
              json
            });
          });
        });
      });

      req.on('error', (err) => {
        server.close();
        reject(err);
      });

      req.end();
    });
  });
}

async function runGeminiConfigTests() {
  console.log('=================================================================');
  console.log('RUNNING GEMINI API ENVIRONMENT & CONFIGURATION TEST SUITE');
  console.log('=================================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      passed++;
      console.log(`  ✓ PASS: ${name}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ FAIL: ${name}`, err.message);
    } finally {
      resetEnv();
    }
  }

  // TEST 1: Default configuration values
  await test('1. Default model defaults to "gemini-3.8-flash" and canonical parameters', () => {
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;
    delete process.env.GEMINI_TEMPERATURE;
    delete process.env.GEMINI_MAX_OUTPUT_TOKENS;
    delete process.env.GEMINI_TIMEOUT_MS;

    const geminiConfig = require('../src/config/gemini');
    assert.strictEqual(geminiConfig.getModel(), 'gemini-3.8-flash');
    assert.strictEqual(geminiConfig.getTemperature(), 0.2);
    assert.strictEqual(geminiConfig.getMaxOutputTokens(), 8192);
    assert.strictEqual(geminiConfig.getTimeoutMs(), 30000);
    assert.strictEqual(geminiConfig.isConfigured(), false);
  });

  // TEST 2: Safe handling of missing key
  await test('2. Missing GEMINI_API_KEY reports isConfigured() = false without crashing', () => {
    delete process.env.GEMINI_API_KEY;
    const geminiConfig = require('../src/config/gemini');
    assert.strictEqual(geminiConfig.isConfigured(), false);
    assert.strictEqual(geminiConfig.getApiKey(), null);
    assert.strictEqual(process.env.GEMINI_CONFIGURED, 'false');
  });

  // TEST 3: Safe handling of empty or whitespace key
  await test('3. Empty or whitespace GEMINI_API_KEY reports isConfigured() = false', () => {
    process.env.GEMINI_API_KEY = '   ';
    const geminiConfig = require('../src/config/gemini');
    assert.strictEqual(geminiConfig.isConfigured(), false);
    assert.strictEqual(geminiConfig.getApiKey(), null);
  });

  // TEST 4: Safe handling of placeholder keys
  await test('4. Placeholder keys (e.g. YOUR_REAL_KEY_HERE) report isConfigured() = false', () => {
    process.env.GEMINI_API_KEY = 'YOUR_REAL_KEY_HERE';
    const geminiConfig = require('../src/config/gemini');
    assert.strictEqual(geminiConfig.isConfigured(), false);
    assert.strictEqual(geminiConfig.getApiKey(), null);

    delete require.cache[require.resolve('../src/config/gemini')];
    process.env.GEMINI_API_KEY = 'PASTE_YOUR_GEMINI_API_KEY_HERE';
    const geminiConfig2 = require('../src/config/gemini');
    assert.strictEqual(geminiConfig2.isConfigured(), false);
  });

  // TEST 5: Valid API key marks configuration as READY
  await test('5. Valid API key reports isConfigured() = true and updates GEMINI_CONFIGURED state', () => {
    process.env.GEMINI_API_KEY = 'AIzaSyFakeTestKeyForValidation123456';
    const geminiConfig = require('../src/config/gemini');
    assert.strictEqual(geminiConfig.isConfigured(), true);
    assert.strictEqual(geminiConfig.getApiKey(), 'AIzaSyFakeTestKeyForValidation123456');
    assert.strictEqual(process.env.GEMINI_CONFIGURED, 'true');
  });

  // TEST 6: Environment variable overrides
  await test('6. Environment variable overrides for MODEL, TEMPERATURE, TOKENS, and TIMEOUT work correctly', () => {
    process.env.GEMINI_MODEL = 'gemini-3.8-pro';
    process.env.GEMINI_TEMPERATURE = '0.7';
    process.env.GEMINI_MAX_OUTPUT_TOKENS = '4096';
    process.env.GEMINI_TIMEOUT_MS = '15000';

    const geminiConfig = require('../src/config/gemini');
    assert.strictEqual(geminiConfig.getModel(), 'gemini-3.8-pro');
    assert.strictEqual(geminiConfig.getTemperature(), 0.7);
    assert.strictEqual(geminiConfig.getMaxOutputTokens(), 4096);
    assert.strictEqual(geminiConfig.getTimeoutMs(), 15000);
  });

  // TEST 7: Invalid configuration parameters safely fall back to defaults
  await test('7. Out-of-bounds or non-numeric parameters safely fall back to canonical defaults', () => {
    process.env.GEMINI_TEMPERATURE = 'invalid_number';
    process.env.GEMINI_MAX_OUTPUT_TOKENS = '-50';
    process.env.GEMINI_TIMEOUT_MS = 'not_a_time';

    const geminiConfig = require('../src/config/gemini');
    assert.strictEqual(geminiConfig.getTemperature(), 0.2);
    assert.strictEqual(geminiConfig.getMaxOutputTokens(), 8192);
    assert.strictEqual(geminiConfig.getTimeoutMs(), 30000);
  });

  // TEST 8: Diagnostics payload scrubbing
  await test('8. getDiagnostics() strictly scrubs all secrets and returns safe metadata only', () => {
    process.env.GEMINI_API_KEY = 'AIzaSyFakeSecretKeyThatMustNeverLeak';
    process.env.GEMINI_MODEL = 'gemini-3.8-flash';
    const geminiConfig = require('../src/config/gemini');

    const diag = geminiConfig.getDiagnostics();
    assert.strictEqual(diag.configured, true);
    assert.strictEqual(diag.model, 'gemini-3.8-flash');
    assert.strictEqual(diag.apiKey, undefined);
    assert.strictEqual(diag.key, undefined);

    const serialized = JSON.stringify(diag);
    assert.strictEqual(serialized.includes('AIzaSy'), false);
    assert.strictEqual(serialized.includes('SecretKey'), false);
  });

  // TEST 9: Startup logging safety
  await test('9. logStartupStatus() never outputs secrets to console', () => {
    process.env.GEMINI_API_KEY = 'AIzaSySecret1234567890';
    const geminiConfig = require('../src/config/gemini');

    const logged = [];
    const origLog = console.log;
    console.log = (...args) => logged.push(args.join(' '));

    try {
      geminiConfig.logStartupStatus();
    } finally {
      console.log = origLog;
    }

    assert.ok(logged.some(msg => msg.includes('[Gemini] Configuration: READY')));
    assert.ok(logged.some(msg => msg.includes('[Gemini] Model: gemini-3.8-flash')));
    assert.ok(!logged.some(msg => msg.includes('AIzaSySecret')));
  });

  // TEST 10: Express /api/diagnostics endpoint integration
  await test('10. Express /api/diagnostics exposes safe Gemini status without credentials', async () => {
    process.env.GEMINI_API_KEY = 'AIzaSyTestSecretShouldNotBeInEndpoint';
    process.env.GEMINI_MODEL = 'gemini-3.8-flash';

    delete require.cache[require.resolve('../src/config/gemini')];
    delete require.cache[require.resolve('../src/config/env')];
    delete require.cache[require.resolve('../index')];

    const { app } = require('../index');
    const resp = await makeHttpRequest(app, { path: '/api/diagnostics' });

    assert.strictEqual(resp.statusCode, 200, 'Diagnostics must return HTTP 200');
    assert.ok(resp.json, 'Diagnostics must return valid JSON');
    assert.ok(resp.json.gemini, 'Diagnostics must include gemini status');
    assert.strictEqual(resp.json.gemini.configured, true);
    assert.strictEqual(resp.json.gemini.model, 'gemini-3.8-flash');

    const jsonStr = JSON.stringify(resp.json);
    assert.strictEqual(jsonStr.includes('AIzaSyTestSecret'), false, 'Secret must never appear in diagnostics response');
  });

  console.log(`\n=================================================================`);
  console.log(`GEMINI CONFIGURATION TESTS SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`=================================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runGeminiConfigTests();
}

module.exports = { runGeminiConfigTests };
