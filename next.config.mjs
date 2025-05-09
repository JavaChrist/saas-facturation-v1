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
    // Configuration pour les variables d'environnement
    env: {
        STRIPE_PREMIUM_PRICE_ID: process.env.STRIPE_PREMIUM_PRICE_ID,
        STRIPE_ENTREPRISE_PRICE_ID: process.env.STRIPE_ENTREPRISE_PRICE_ID,
        STRIPE_FREE_PRICE_ID: process.env.STRIPE_FREE_PRICE_ID,
    },
};

export default nextConfig; 