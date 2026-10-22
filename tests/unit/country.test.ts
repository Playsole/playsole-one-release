import { describe, expect, it } from 'vitest';
import {
  COUNTRIES,
  isValidCountryCode,
  getCountryByCode,
  isPrivateIp,
  detectCountryFromHeaders,
  detectCountrySync,
} from '../../packages/shared/src/country';

describe('Country catalog and detection', () => {
  it('contains comprehensive list of sovereign countries', () => {
    expect(COUNTRIES.length).toBeGreaterThan(190);
    expect(isValidCountryCode('US')).toBe(true);
    expect(isValidCountryCode('GB')).toBe(true);
    expect(isValidCountryCode('NG')).toBe(true);
    expect(isValidCountryCode('DE')).toBe(true);
    expect(isValidCountryCode('FR')).toBe(true);
    expect(isValidCountryCode('CA')).toBe(true);
    expect(isValidCountryCode('JP')).toBe(true);
    expect(isValidCountryCode('ZZ')).toBe(false);

    const ng = getCountryByCode('NG');
    expect(ng?.name).toBe('Nigeria');

    const us = getCountryByCode('us');
    expect(us?.name).toBe('United States');
  });

  it('correctly identifies private/local and public IP addresses', () => {
    expect(isPrivateIp('127.0.0.1')).toBe(true);
    expect(isPrivateIp('::1')).toBe(true);
    expect(isPrivateIp('10.0.4.15')).toBe(true);
    expect(isPrivateIp('192.168.1.100')).toBe(true);
    expect(isPrivateIp('172.16.0.5')).toBe(true);
    expect(isPrivateIp('172.31.255.255')).toBe(true);
    expect(isPrivateIp('8.8.8.8')).toBe(false);
    expect(isPrivateIp('102.89.23.4')).toBe(false);
  });

  it('detects country from edge CDN headers (Cloudflare, CloudFront, etc.)', () => {
    expect(detectCountryFromHeaders({ 'cf-ipcountry': 'NG' })).toBe('NG');
    expect(detectCountryFromHeaders({ 'cf-ipcountry': 'gb' })).toBe('GB');
    expect(detectCountryFromHeaders({ 'cloudfront-viewer-country': 'CA' })).toBe('CA');
    expect(detectCountryFromHeaders({ 'x-country-code': 'DE' })).toBe('DE');
  });

  it('ignores invalid edge headers (XX, T1)', () => {
    expect(detectCountryFromHeaders({ 'cf-ipcountry': 'XX', 'accept-language': 'en-NG,en;q=0.9' })).toBe('NG');
    expect(detectCountryFromHeaders({ 'cf-ipcountry': 'T1' })).toBe(null);
  });

  it('detects country from Accept-Language header region subtag', () => {
    expect(detectCountryFromHeaders({ 'accept-language': 'en-NG,en;q=0.9' })).toBe('NG');
    expect(detectCountryFromHeaders({ 'accept-language': 'en-GB,en;q=0.8' })).toBe('GB');
    expect(detectCountryFromHeaders({ 'accept-language': 'fr-FR,fr;q=0.9' })).toBe('FR');
    expect(detectCountryFromHeaders({ 'accept-language': 'de-DE,de;q=0.9' })).toBe('DE');
  });

  it('detectCountrySync returns detected country or falls back to US', () => {
    expect(detectCountrySync({ headers: { 'cf-ipcountry': 'NG' } })).toBe('NG');
    expect(detectCountrySync({ headers: { 'accept-language': 'en-CA,en;q=0.9' } })).toBe('CA');
    expect(detectCountrySync({ headers: {} })).toBe('US');
  });
});
