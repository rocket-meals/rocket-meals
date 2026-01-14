import {generateAppleJWTShell} from "./generateAppleClientSecretShell";
import type {AppleClientSecretCredentials} from "./types";
export {AppleClientSecretCredentials} from "./types";

export const APPLE_AUDIENCE = 'https://appleid.apple.com';
const days = 90; // could be to the max of 180 days which Apple allows
export const MAX_TOKEN_LIFETIME_SECONDS = 60 * 60 * 24 * days;

export type AppleClientSecretResult = {
  token: string;
  expiresAt: number;
};

// Minimaler Payload-Typ, wir brauchen hauptsächlich .exp
export type AppleJwtPayload = {
  iss?: string;
  sub?: string;
  aud?: string;
  iat?: number;
  exp?: number;
  [k: string]: any;
};

// Decode the payload part of a JWT without verifying signature
export function decodeAppleClientSecret(token: string): AppleJwtPayload | null {
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length < 2) return null;

  const payloadPart = parts[1];
  if (!payloadPart) return null;

  function base64UrlDecodeToString(input: string): string {
    // Replace url-safe characters
    let str = input.replace(/-/g, '+').replace(/_/g, '/');
    // Pad with '=' to make length a multiple of 4
    const pad = str.length % 4;
    if (pad === 2) str += '==';
    else if (pad === 3) str += '=';
    else if (pad === 1) str += '==='; // unlikely
    return Buffer.from(str, 'base64').toString('utf8');
  }

  try {
    const json = base64UrlDecodeToString(payloadPart);
    return JSON.parse(json) as AppleJwtPayload;
  } catch (e) {
    return null;
  }
}

export function decodeAppleClientSecretExpiry(token: string): number | null {
    const decoded = decodeAppleClientSecret(token);
    let exp = decoded?.exp;
    if(!exp) return null;
    return parseInt(exp.toString());
}

export function generateAppleClientSecret(config: AppleClientSecretCredentials): AppleClientSecretResult {
  const { teamId, clientId, keyId, privateKey } = config;
  if (!teamId || !clientId || !keyId || !config.privateKey) {
    throw new Error('Missing configuration for Apple client secret generation.');
  }

  let result = generateAppleJWTShell({
    teamId,
    clientId,
    keyId,
    privateKey,
  })

  return {
    token: result.token,
    expiresAt: result.exp
  };
}
