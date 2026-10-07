/** @type {import('next').NextConfig} */
const isPages = process.env.GITHUB_PAGES === 'true';
const nextConfig = {
  output: 'export',
  basePath: isPages ? '/govibe' : '',
  assetPrefix: isPages ? '/govibe/' : undefined,
  images: { unoptimized: true },
  trailingSlash: true,
  env: { NEXT_PUBLIC_BASE_PATH: isPages ? '/govibe' : '' },
};
export default nextConfig;
