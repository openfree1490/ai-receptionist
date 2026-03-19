/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        // Match any request where the host is NOT prefixed with "www."
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: '(?!www\\.)(?<domain>.+)',
          },
        ],
        destination: 'https://www.:domain/:path*',
        permanent: true,
      },
    ]
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Treat better-sqlite3 as external to avoid webpack bundling the native module
      config.externals = [...(config.externals || []), 'better-sqlite3']
    }
    return config
  },
}

module.exports = nextConfig
