/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    DEFAULT_LLM_PROVIDER: process.env.DEFAULT_LLM_PROVIDER,
    DEFAULT_LLM_MODEL: process.env.DEFAULT_LLM_MODEL,
  },
  // When running as an Electron app, tell Next.js to output a static site
  output: process.env.ELECTRON === 'true' ? 'export' : undefined,
  // Disable image optimization for static export
  images: process.env.ELECTRON === 'true' ? { unoptimized: true } : {},
  // Disable server-only features when running as an Electron app
  experimental: {
    appDir: true,
    serverComponentsExternalPackages: [],
  },
  // Avoid cross-origin issues when running in Electron
  assetPrefix: process.env.ELECTRON === 'true' ? './' : undefined,
};

module.exports = nextConfig; 