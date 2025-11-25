/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false,
    swcMinify: false, // Disabled due to compatibility
    // Rewrites are now handled by app/api/[...path]/route.js
};

module.exports = nextConfig;
