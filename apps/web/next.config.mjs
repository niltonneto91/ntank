/** @type {import('next').NextConfig} */

// ID único por boot do servidor — força URL nova dos chunks a cada restart,
// prevenindo que o browser sirva JS antigo do cache HTTP (imutável).
const BOOT_ID = Date.now();

const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@ntank/calc-core"],
  // Em dev: muda o prefixo dos assets a cada boot para que o browser
  // nunca encontre o chunk antigo no cache (URL nova = cache miss garantido).
  ...(process.env.NODE_ENV === "development" && {
    assetPrefix: `/_b${BOOT_ID}`,
    rewrites: async () => [
      // Mapeia o prefixo dinâmico de volta para o path real dos static files.
      {
        source: `/_b${BOOT_ID}/_next/:path*`,
        destination: "/_next/:path*",
      },
    ],
    headers: async () => [
      {
        source: "/_next/static/chunks/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ],
  }),
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
