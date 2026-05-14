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
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=31536000; includeSubDomains; preload'
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'SAMEORIGIN'
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff'
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin'
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()'
                    },
                    {
                        key: 'Content-Security-Policy',
                        value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com https://ka-f.fontawesome.com; img-src 'self' data: https: blob:; font-src 'self' data: https://cdnjs.cloudflare.com https://fonts.gstatic.com https://ka-f.fontawesome.com; connect-src 'self' https: wss: ws: ws://127.0.0.1:8000 ws://localhost:8000 http://127.0.0.1:8000 http://localhost:8000;"
                    }
                ]
            }
        ];
    },
}

module.exports = nextConfig
