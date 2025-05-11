import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Fonction pour vérifier si un cookie est présent
function hasCookie(request: NextRequest, name: string): boolean {
  return request.cookies.has(name);
}

export function middleware(request: NextRequest) {
  // URLs protégées qui nécessitent une authentification
  const PROTECTED_PATHS = [
    '/dashboard',
    '/dashboard/factures',
    '/dashboard/clients',
    '/dashboard/parametres',
    '/dashboard/abonnement',
    '/dashboard/utilisateurs',
  ];
  
  // Détecter si nous sommes sur un chemin protégé
  const isProtectedPath = PROTECTED_PATHS.some(path => 
    request.nextUrl.pathname.startsWith(path)
  );
  
  // URL actuelle pour la redirection après connexion
  const url = request.nextUrl.clone();
  
  // Vérifier si un utilisateur est connecté via les cookies Firebase
  // Firebase Auth stocke ses données d'authentification dans plusieurs cookies
  const isUserLoggedIn = hasCookie(request, 'firebaseToken') || 
                         hasCookie(request, 'firebase:authUser');
  
  // Si c'est un chemin protégé et que l'utilisateur n'est pas connecté
  if (isProtectedPath && !isUserLoggedIn) {
    // Stocker l'URL actuelle dans une URL de redirection
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', url.pathname + url.search);
    
    return NextResponse.redirect(redirectUrl);
  }
  
  // Si l'utilisateur est déjà connecté et essaie d'accéder aux pages d'authentification
  if ((url.pathname === '/login' || url.pathname === '/register') && isUserLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  // Pour toutes les autres requêtes, continuer normalement
  return NextResponse.next();
}

// Configurer le middleware pour s'appliquer à toutes les routes
export const config = {
  matcher: [
    // Protéger toutes les routes /dashboard/*
    '/dashboard/:path*', 
    // Appliquer aussi aux pages d'authentification
    '/login',
    '/register'
  ],
}; 