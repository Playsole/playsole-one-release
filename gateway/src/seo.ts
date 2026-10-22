export interface SeoPageConfig {
  title: string;
  description: string;
  path: string;
  ogType?: 'website' | 'article';
  image?: string;
  imageAlt?: string;
  noindex?: boolean;
  schemas?: Record<string, any>[];
  geoRegion?: string;
  geoPlacename?: string;
  geoPosition?: string;
}

export const CANONICAL_ORIGIN =
  process.env.CANONICAL_ORIGIN ||
  (process.env.PUBLIC_ORIGIN && !process.env.PUBLIC_ORIGIN.includes('localhost')
    ? process.env.PUBLIC_ORIGIN
    : 'https://one.playsole.xyz');
export const BASE_URL = CANONICAL_ORIGIN;
export const DEFAULT_OG_IMAGE = `${BASE_URL}/logo.png`;
export const BRAND_NAME = 'Playsole One';
export const TWITTER_HANDLE = '@getplaysole';

export function renderSeoHead(config: SeoPageConfig): string {
  const canonicalUrl = `${BASE_URL}${config.path.startsWith('/') ? config.path : `/${config.path}`}`;
  const ogImage = config.image || DEFAULT_OG_IMAGE;
  const imageAlt = config.imageAlt || `${BRAND_NAME} — Unified Identity & Auth Infrastructure`;
  const robots = config.noindex
    ? 'noindex, nofollow'
    : 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1';

  const defaultSchemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'Playsole Ltd.',
      url: BASE_URL,
      logo: `${BASE_URL}/logo.png`,
      sameAs: [
        'https://github.com/Playsole',
        'https://x.com/getplaysole',
        'https://linkedin.com/company/playsole',
      ],
      contactPoint: {
        '@type': 'ContactPoint',
        email: 'support@playsole.xyz',
        contactType: 'technical support',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: BRAND_NAME,
      url: BASE_URL,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${BASE_URL}/developers?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
  ];

  const allSchemas = [...defaultSchemas, ...(config.schemas || [])];
  const schemasHtml = allSchemas
    .map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`)
    .join('\n');

  return `<!-- Primary SEO Meta -->
<title>${config.title}</title>
<meta name="description" content="${config.description}">
<meta name="robots" content="${robots}">
<link rel="canonical" href="${canonicalUrl}">

<!-- GEO & Localization -->
<meta name="geo.region" content="${config.geoRegion || 'US'}">
<meta name="geo.placename" content="${config.geoPlacename || 'Global Edge Network'}">
<meta name="geo.position" content="${config.geoPosition || '37.7749;-122.4194'}">
<meta name="ICBM" content="${config.geoPosition ? config.geoPosition.replace(';', ', ') : '37.7749, -122.4194'}">
<meta http-equiv="content-language" content="en-US">
<link rel="alternate" hreflang="x-default" href="${canonicalUrl}">
<link rel="alternate" hreflang="en" href="${canonicalUrl}">

<!-- OpenGraph / Facebook / LinkedIn / Discord / Slack -->
<meta property="og:site_name" content="${BRAND_NAME}">
<meta property="og:title" content="${config.title}">
<meta property="og:description" content="${config.description}">
<meta property="og:url" content="${canonicalUrl}">
<meta property="og:type" content="${config.ogType || 'website'}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:secure_url" content="${ogImage}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${imageAlt}">
<meta property="og:locale" content="en_US">

<!-- Twitter / X Cards -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="${TWITTER_HANDLE}">
<meta name="twitter:creator" content="${TWITTER_HANDLE}">
<meta name="twitter:title" content="${config.title}">
<meta name="twitter:description" content="${config.description}">
<meta name="twitter:image" content="${ogImage}">
<meta name="twitter:image:alt" content="${imageAlt}">

<!-- Mobile & App Manifest -->
<link rel="manifest" href="/site.webmanifest">
<link rel="apple-touch-icon" sizes="180x180" href="/logo.png">
<meta name="apple-mobile-web-app-title" content="${BRAND_NAME}">
<meta name="application-name" content="${BRAND_NAME}">
<meta name="format-detection" content="telephone=no">

<!-- Structured Data -->
${schemasHtml}`;
}

export const landingSeo: SeoPageConfig = {
  title: 'Playsole One — Unified Identity, Auth & Session Infrastructure',
  description: 'Playsole One is the modern authentication, authorization, and session layer for web applications. Standards-compliant OpenID Connect, S256 PKCE, and zero-trust session security.',
  path: '/',
  ogType: 'website',
  image: `${BASE_URL}/logo.png`,
  imageAlt: 'Playsole One Identity & Auth Platform',
  schemas: [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Playsole One',
      applicationCategory: 'SecurityApplication',
      operatingSystem: 'All',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      description: 'Standards-compliant OpenID Connect, S256 PKCE, and zero-trust session security layer for modern web applications.',
      softwareVersion: '2.0.0',
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.9',
        ratingCount: '128',
      },
    },
  ],
};

export const developersSeo: SeoPageConfig = {
  title: 'Developer Documentation & API Reference — Playsole One',
  description: 'Complete integration guide for Playsole One OpenID Connect, S256 PKCE authorization codes, JWKS public keys, and OAuth 2.0 token exchange.',
  path: '/developers',
  ogType: 'article',
  image: `${BASE_URL}/logo.png`,
  imageAlt: 'Playsole One Developer Documentation',
  schemas: [
    {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: 'Playsole One Developer Documentation & API Reference',
      description: 'Integration guide for OpenID Connect, S256 PKCE authorization flows, JWKS public keys, and OAuth 2.0 token exchanges.',
      image: `${BASE_URL}/logo.png`,
      author: {
        '@type': 'Organization',
        name: 'Playsole Ltd.',
      },
      publisher: {
        '@type': 'Organization',
        name: 'Playsole Ltd.',
        logo: {
          '@type': 'ImageObject',
          url: `${BASE_URL}/logo.png`,
        },
      },
    },
  ],
};

export const statusSeo: SeoPageConfig = {
  title: 'Real-Time System & Service Status — Playsole One',
  description: 'Live operational status, uptime telemetry, and health metrics for Playsole One distributed edge clusters and identity microservices.',
  path: '/status',
  ogType: 'website',
  image: `${BASE_URL}/logo.png`,
  imageAlt: 'Playsole One Platform Status',
  schemas: [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Playsole One Real-Time Platform Status',
      description: 'Live uptime telemetry, latency metrics, and operational health status across all Playsole One distributed edge clusters.',
      url: `${BASE_URL}/status`,
    },
  ],
};

export const privacySeo: SeoPageConfig = {
  title: 'Privacy Policy — Playsole One',
  description: 'Learn how Playsole One protects your data with cryptographic hashing, explicit consent controls, and GDPR-compliant identity privacy.',
  path: '/privacy',
  ogType: 'article',
  image: `${BASE_URL}/logo.png`,
  imageAlt: 'Playsole One Privacy Policy',
  schemas: [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Playsole One Privacy Policy',
      description: 'Data privacy practices, account data encryption, consent grant auditing, and GDPR compliance at Playsole One.',
      url: `${BASE_URL}/privacy`,
    },
  ],
};

export const termsSeo: SeoPageConfig = {
  title: 'Terms of Service — Playsole One',
  description: 'Read the terms of service, acceptable use policies, and developer guidelines for building on Playsole One.',
  path: '/terms',
  ogType: 'article',
  image: `${BASE_URL}/logo.png`,
  imageAlt: 'Playsole One Terms of Service',
  schemas: [
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Playsole One Terms of Service',
      description: 'Terms of service, acceptable use policy, API quotas, and platform terms for Playsole One.',
      url: `${BASE_URL}/terms`,
    },
  ],
};
