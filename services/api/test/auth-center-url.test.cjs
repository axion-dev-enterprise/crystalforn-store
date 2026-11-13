const assert = require('node:assert/strict');
const { test } = require('node:test');
const { ServiceUnavailableException } = require('@nestjs/common');
const { approvedStoreAuthCenterOrigin } = require('../dist/src/modules/auth/auth-governance-status.js');

test('validates and normalizes the configured Auth Center origin', () => {
  const previous = {
    reference: process.env.STORE_AUTHORIZATION_REFERENCE,
    url: process.env.STORE_AUTH_CENTER_URL,
    secret: process.env.STORE_AUTH_CLIENT_SECRET,
  };
  process.env.STORE_AUTHORIZATION_REFERENCE = 'auth-center-crystalforn-customer-v1';
  process.env.STORE_AUTH_CLIENT_SECRET = 'synthetic-test-secret';

  try {
    process.env.STORE_AUTH_CENTER_URL = 'https://auth.example.test/path';
    assert.equal(approvedStoreAuthCenterOrigin(), 'https://auth.example.test');

    for (const value of [
      'not a URL',
      'http://auth.example.test',
      'https://user:pass@auth.example.test',
      'https://auth.example.test/?token=synthetic',
      'https://auth.example.test/#fragment',
    ]) {
      process.env.STORE_AUTH_CENTER_URL = value;
      assert.throws(() => approvedStoreAuthCenterOrigin(), (error) =>
        error instanceof ServiceUnavailableException && error.getStatus() === 503);
    }
    process.env.STORE_AUTH_CENTER_URL = 'https://auth.example.test';
    delete process.env.STORE_AUTH_CLIENT_SECRET;
    assert.throws(() => approvedStoreAuthCenterOrigin(), (error) =>
      error instanceof ServiceUnavailableException && error.getStatus() === 503);
  } finally {
    if (previous.reference === undefined) delete process.env.STORE_AUTHORIZATION_REFERENCE;
    else process.env.STORE_AUTHORIZATION_REFERENCE = previous.reference;
    if (previous.url === undefined) delete process.env.STORE_AUTH_CENTER_URL;
    else process.env.STORE_AUTH_CENTER_URL = previous.url;
    if (previous.secret === undefined) delete process.env.STORE_AUTH_CLIENT_SECRET;
    else process.env.STORE_AUTH_CLIENT_SECRET = previous.secret;
  }
});
