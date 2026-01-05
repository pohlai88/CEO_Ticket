/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    tsconfigPath: './tsconfig.json',
  },
  experimental: {
    typedEnv: true,
  },
};

module.exports = nextConfig;
