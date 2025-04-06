/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    eslint: {
        // Désactiver la vérification ESLint pendant le build
        ignoreDuringBuilds: true,
    },
    typescript: {
        // Désactiver la vérification TypeScript pendant le build
        ignoreBuildErrors: true,
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'firebasestorage.googleapis.com',
                port: '',
                pathname: '/v0/b/**',
            },
        ],
    },
};

export default nextConfig; 