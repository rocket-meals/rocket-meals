import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import { base64url } from './base64url';

// Shared App Store Connect API helpers used by submit-ios-review.ts.

export const API_BASE = 'https://api.appstoreconnect.apple.com/v1';

export type JsonApiResource = {
  type: string;
  id: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<string, { data?: { type: string; id: string } | null }>;
};

export type JsonApiDocument = {
  data?: JsonApiResource | JsonApiResource[];
  included?: JsonApiResource[];
};

export function createAppStoreConnectToken(keyId: string, issuerId: string, privateKeyPath: string): string {
  const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'ES256', kid: keyId, typ: 'JWT' };
  const payload = { iss: issuerId, iat: now, exp: now + 15 * 60, aud: 'appstoreconnect-v1' };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  // App Store Connect expects the raw R||S signature (JOSE), not the DER encoding Node uses by default.
  const signature = crypto.sign('sha256', Buffer.from(unsigned), { key: privateKey, dsaEncoding: 'ieee-p1363' });
  return `${unsigned}.${base64url(signature)}`;
}

export type AscApiErrorDetail = { code?: string; detail?: string; source?: { pointer?: string } };

export class AscApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly errors: AscApiErrorDetail[],
    rawText: string,
    method: string,
    path: string
  ) {
    super(`App Store Connect API Fehler (${status} ${method} ${path}):\n${rawText}`);
  }
}

export async function ascRequest(token: string, method: string, path: string, body?: unknown): Promise<JsonApiDocument> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();

  if (!response.ok) {
    let errors: AscApiErrorDetail[] = [];
    try {
      errors = (JSON.parse(text) as { errors?: AscApiErrorDetail[] }).errors ?? [];
    } catch {
      // response body wasn't JSON - leave errors empty, raw text is still in the thrown error message
    }
    throw new AscApiError(response.status, errors, text, method, path);
  }

  return text ? JSON.parse(text) : {};
}

export function asArray(data: JsonApiResource | JsonApiResource[] | undefined): JsonApiResource[] {
  if (!data) return [];
  return Array.isArray(data) ? data : [data];
}

export async function findAppId(token: string, bundleId: string): Promise<string> {
  const query = new URLSearchParams({ 'filter[bundleId]': bundleId });
  const result = await ascRequest(token, 'GET', `/apps?${query}`);
  const app = asArray(result.data)[0];
  if (!app) {
    throw new Error(`Keine App mit bundleId "${bundleId}" in App Store Connect gefunden.`);
  }
  return app.id;
}

export function readRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is not set.`);
  }
  return value;
}
