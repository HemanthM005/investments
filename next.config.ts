import type { NextConfig } from 'next';

const config: NextConfig = {
  experimental: {
    // Disable webpack persistent caching in dev to prevent stale chunk errors
    // when multiple files change rapidly (common during active development)
    webpackBuildWorker: false,
  },
};

export default config;
