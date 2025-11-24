/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false,
    swcMinify: false, // Fixes Framer Motion production animation issues
    // Rewrites are now handled by app/api/[...path]/route.js
};

module.exports = nextConfig;
