/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    GOOGLE_API_KEY: process.env.GOGGLE_API_KEY,
    DEFAULT_LLM_PROVIDER: process.env.DEFAULT_LLM_PROVIDER,
    DEFAULT_LLM_MODEL: process.env.DEFAULT_LLM_MODEL,
  },
  experimental: {
    // The appDir option is no longer needed as it's the default in newer Next.js versions
    
    // Disable Turbo since it has issues with mdx-bundler and esbuild
    turbo: {
      // Only use Turbo for production builds, disable for development
      loaders: {
        // Define specific loaders for README.md files in node_modules
        '.md': ['file-loader']
      }
    }
  },
  // External packages that should be treated as server components
  serverExternalPackages: [],
  reactStrictMode: true,
  // Watch for changes to the sessions.md file
  watchOptions: {
    // Add vault/system/sessions.md to the list of watched files
    ignore: ['node_modules/**', '.git/**', '.next/**', '!vault/system/sessions.md'],
  },
  // Configure webpack to handle mdx-bundler and esbuild correctly
  webpack: (config) => {
    // For non-Turbo builds, add a rule to handle esbuild's README.md files
    config.module.rules.push({
      test: /node_modules\/@esbuild\/.*\/README\.md$/,
      use: 'null-loader',
      include: /node_modules/,
    });

    return config;
  },
};

module.exports = nextConfig; 