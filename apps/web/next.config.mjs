/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@ntank/calc-core"],
  // O calc-core é TypeScript ESM com imports terminados em ".js" (NodeNext).
  // O webpack do Next precisa saber que ".js" pode resolver para ".ts" / ".tsx"
  // — assim consumimos os fontes diretamente, sem build intermediário.
  webpack(config) {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};

export default nextConfig;
