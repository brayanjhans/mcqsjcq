/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    output: 'standalone', // Required for PM2/production deployment
    typescript: {
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: 'http://127.0.0.1:8000/api/:path*',
            },
            {
                source: '/docs',
                destination: 'http://127.0.0.1:8000/docs',
            },
            {
                source: '/openapi.json',
                destination: 'http://127.0.0.1:8000/openapi.json',
            },
        ]
    },
}

module.exports = nextConfig
