/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false,
    swcMinify: false, // Disabled due to compatibility
    webpack: (config, { isServer }) => {
        // Exclude @react-pdf/renderer from optimization to prevent terser errors
        if (!isServer) {
            config.optimization.minimizer = config.optimization.minimizer.map((minimizer) => {
                if (minimizer.constructor.name === 'TerserPlugin') {
                    minimizer.options.exclude = /node_modules\/@react-pdf/;
                }
                return minimizer;
            });
        }
        return config;
    },
    // Rewrites are now handled by app/api/[...path]/route.js
};

module.exports = nextConfig;
