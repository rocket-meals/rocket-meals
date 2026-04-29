// Integration test: fetch Apple App Store reviews and respond via App Store Connect API.
// Requires APP_STORE_CONNECT_PRIVATE_KEY to be set.
import { describe, expect, it } from '@jest/globals';
import { AppleAppStoreConnectHelper } from '../AppleAppStoreConnectHelper';
import { EnvVariableHelper } from '../EnvVariableHelper';
import { SWOSY_APP_STORE_IDS } from 'repo-depkit-common';

describe('AppleAppStoreConnectHelper.normalizePemKey', () => {
  it('converts literal \\n sequences to real newlines', () => {
    const raw = '-----BEGIN PRIVATE KEY-----\\nABC\\nDEF\\n-----END PRIVATE KEY-----';
    const result = AppleAppStoreConnectHelper.normalizePemKey(raw);
    expect(result).toBe('-----BEGIN PRIVATE KEY-----\nABC\nDEF\n-----END PRIVATE KEY-----');
  });

  it('converts double-escaped \\\\n sequences to real newlines', () => {
    // Some secret management systems double-escape newlines: \\n instead of \n
    const raw = '-----BEGIN PRIVATE KEY-----\\\\nABC\\\\nDEF\\\\n-----END PRIVATE KEY-----';
    const result = AppleAppStoreConnectHelper.normalizePemKey(raw);
    expect(result).toBe('-----BEGIN PRIVATE KEY-----\nABC\nDEF\n-----END PRIVATE KEY-----');
  });

  it('leaves keys with real newlines unchanged', () => {
    const raw = '-----BEGIN PRIVATE KEY-----\nABC\nDEF\n-----END PRIVATE KEY-----';
    const result = AppleAppStoreConnectHelper.normalizePemKey(raw);
    expect(result).toBe(raw);
  });

  it('trims surrounding whitespace', () => {
    const raw = '  -----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----  ';
    const result = AppleAppStoreConnectHelper.normalizePemKey(raw);
    expect(result).toBe('-----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----');
  });
});

describe('Apple App Store Reviews via ASC API (requires APP_STORE_CONNECT_PRIVATE_KEY)', () => {
  it('fetches reviews via ASC API and verifies IDs are valid for response', async () => {
    const privateKey = EnvVariableHelper.getAppStoreConnectPrivateKey();
    if (!privateKey) {
      console.log('Skipping: APP_STORE_CONNECT_PRIVATE_KEY not set');
      return;
    }

    const appleAppId = SWOSY_APP_STORE_IDS.appleAppId;
    if (!appleAppId) {
      console.log('Skipping: No Apple App ID configured for Swosy');
      return;
    }

    const result = await AppleAppStoreConnectHelper.fetchReviews(appleAppId, privateKey);
    expect(result).toBeDefined();
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);

    if (result.data.length > 0) {
      const review = result.data[0]!;
      expect(review.id).toBeDefined();
      expect(typeof review.id).toBe('string');
      expect(review.id.length).toBeGreaterThan(0);
      expect(review.attributes.rating).toBeGreaterThanOrEqual(1);
      expect(review.attributes.rating).toBeLessThanOrEqual(5);
    }
  }, 30000);

  it('responds to a Swosy review using the ID from ASC API', async () => {
    const privateKey = EnvVariableHelper.getAppStoreConnectPrivateKey();
    if (!privateKey) {
      console.log('Skipping: APP_STORE_CONNECT_PRIVATE_KEY not set');
      return;
    }

    const appleAppId = SWOSY_APP_STORE_IDS.appleAppId;
    if (!appleAppId) {
      console.log('Skipping: No Apple App ID configured for Swosy');
      return;
    }

    const result = await AppleAppStoreConnectHelper.fetchReviews(appleAppId, privateKey);
    expect(result.data.length).toBeGreaterThan(0);

    const reviewId = result.data[0]!.id;
    expect(typeof reviewId).toBe('string');
    expect(reviewId.length).toBeGreaterThan(0);

    // respondToReview should not throw; the API returns 201 or 409 (already responded)
    await expect(
      AppleAppStoreConnectHelper.respondToReview(reviewId, 'Vielen Dank für dein Feedback!', privateKey)
    ).resolves.not.toThrow();
  }, 30000);
});

