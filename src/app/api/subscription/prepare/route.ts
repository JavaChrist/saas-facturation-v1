import { NextRequest, NextResponse } from "next/server";

// Route simplifiée pour le déploiement Vercel
export async function POST(request: NextRequest) {
  console.log("API subscription/prepare - Mode simplifié pour déploiement");

  try {
    return NextResponse.json({
      clientSecret: "pi_simulated_for_deployment",
      amount: 9.99,
      message: "Mode déploiement: Prépration d'abonnement simulée",
    });
  } catch (error) {
    console.error("API - Erreur:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
