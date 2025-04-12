import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// Initialiser Stripe avec la clé API secrète
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-03-31.basil", // Version de l'API compatible avec Stripe
});

/**
 * API route pour créer une session de paiement Stripe
 * Version simplifiée pour le déploiement Vercel
 */
export async function POST(request: NextRequest) {
  console.log("API - /api/payment/create - Mode simplifié pour déploiement");

  try {
    // Pour le déploiement, renvoyer une réponse simulée
    // qui permettra de continuer les tests sans Firebase
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    return NextResponse.json({
      url: `${baseUrl}/dashboard`,
      simulation: true,
      message: "Mode de déploiement: Firebase Admin non utilisé",
    });
  } catch (error) {
    console.error("API - Erreur:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
