/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false,
    swcMinify: false, // Fixes Framer Motion production animation issues
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: process.env.NODE_ENV === 'development'
                    ? 'http://127.0.0.1:8000/api/:path*'
                    : 'https://portfolio-optimizer-backend-pudl.onrender.com/api/:path*',
            },
        ];
    },
};

module.exports = nextConfig;
