import { NextRequest, NextResponse } from "next/server";

// Route simplifiée pour le déploiement Vercel
export async function POST(request: NextRequest) {
  console.log("API subscription/confirm - Mode simplifié pour déploiement");

  try {
    return NextResponse.json({
      success: true,
      message: "Mode déploiement: Confirmation d'abonnement simulée",
    });
  } catch (error) {
    console.error("API - Erreur:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
