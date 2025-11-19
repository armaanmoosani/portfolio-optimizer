/** @type {import('next').NextConfig} */
const nextConfig = {
    async rewrites() {
        return process.env.NODE_ENV === 'development'
            ? [
                {
                    source: '/api/optimize',
                    destination: 'http://127.0.0.1:8000/api/optimize',
                },
            ]
            : [];
    },
};

module.exports = nextConfig;
