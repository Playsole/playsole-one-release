import { describe, it, expect } from 'vitest';
import request from 'supertest';
import gatewayApp from '../../gateway/src/index';

describe('SEO & GEO Optimization Suite', () => {
  it('GET /robots.txt serves valid crawler directives with sitemap reference', async () => {
    const res = await request(gatewayApp).get('/robots.txt');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.text).toContain('User-agent: *');
    expect(res.text).toContain('Disallow: /api/');
    expect(res.text).toContain('Disallow: /mfa/');
    expect(res.text).toContain('Disallow: /dashboard');
    expect(res.text).toContain('Sitemap: https://one.playsole.xyz/sitemap.xml');
  });

  it('GET /sitemap.xml serves XML sitemap with canonical pages and xhtml alternates', async () => {
    const res = await request(gatewayApp).get('/sitemap.xml');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('xml');
    expect(res.text).toContain('<loc>https://one.playsole.xyz/</loc>');
    expect(res.text).toContain('<loc>https://one.playsole.xyz/developers</loc>');
    expect(res.text).toContain('<loc>https://one.playsole.xyz/status</loc>');
    expect(res.text).toContain('<loc>https://one.playsole.xyz/privacy</loc>');
    expect(res.text).toContain('<loc>https://one.playsole.xyz/terms</loc>');
    expect(res.text).toContain('hreflang="x-default"');
  });

  it('GET /site.webmanifest serves PWA manifest', async () => {
    const res = await request(gatewayApp).get('/site.webmanifest');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Playsole One Identity');
    expect(res.body.short_name).toBe('Playsole One');
    expect(res.body.start_url).toBe('/');
    expect(res.body.theme_color).toBe('#0076FE');
  });

  it('GET / includes rich SEO, Geo meta tags, @getplaysole X card, and JSON-LD schema with Playsole Ltd.', async () => {
    const res = await request(gatewayApp).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-language']).toBe('en-US');
    expect(res.headers['vary']).toContain('Accept-Language');

    // Canonical & Geo
    expect(res.text).toContain('<link rel="canonical" href="https://one.playsole.xyz/">');
    expect(res.text).toContain('<meta name="geo.region" content="US">');
    expect(res.text).toContain('<meta name="geo.placename" content="Global Edge Network">');
    expect(res.text).toContain('<link rel="alternate" hreflang="x-default" href="https://one.playsole.xyz/">');

    // OpenGraph & Twitter
    expect(res.text).toContain('<meta property="og:site_name" content="Playsole One">');
    expect(res.text).toContain('<meta name="twitter:card" content="summary_large_image">');
    expect(res.text).toContain('<meta name="twitter:site" content="@getplaysole">');
    expect(res.text).toContain('<meta name="twitter:creator" content="@getplaysole">');

    // Schema JSON-LD & Company entity
    expect(res.text).toContain('"@type":"Organization"');
    expect(res.text).toContain('"name":"Playsole Ltd."');
    expect(res.text).toContain('https://x.com/getplaysole');
    expect(res.text).not.toContain('Playsole Inc');
  });

  it('GET /developers includes developer documentation SEO & Article schema', async () => {
    const res = await request(gatewayApp).get('/developers');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<link rel="canonical" href="https://one.playsole.xyz/developers">');
    expect(res.text).toContain('<meta name="twitter:site" content="@getplaysole">');
    expect(res.text).toContain('"@type":"TechArticle"');
    expect(res.text).toContain('"name":"Playsole Ltd."');
  });

  it('GET /status includes system status SEO & WebPage schema', async () => {
    const res = await request(gatewayApp).get('/status');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<link rel="canonical" href="https://one.playsole.xyz/status">');
    expect(res.text).toContain('<meta name="twitter:site" content="@getplaysole">');
    expect(res.text).toContain('Playsole One Real-Time Platform Status');
  });
});
