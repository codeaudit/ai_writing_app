/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    DEFAULT_LLM_PROVIDER: process.env.DEFAULT_LLM_PROVIDER,
    DEFAULT_LLM_MODEL: process.env.DEFAULT_LLM_MODEL,
  },
  experimental: {
    // The appDir option is no longer needed as it's the default in newer Next.js versions
  },
  // External packages that should be treated as server components
  serverExternalPackages: [],
  reactStrictMode: true,
  // Watch for changes to the sessions.md file
  watchOptions: {
    // Add vault/system/sessions.md to the list of watched files
    ignored: ['node_modules/**', '.git/**', '.next/**', '!vault/system/sessions.md'],
  },
};

module.exports = nextConfig; 