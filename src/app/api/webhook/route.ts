import { NextRequest, NextResponse } from "next/server";

// Version simplifiée pour le déploiement Vercel
export async function POST(request: NextRequest) {
  console.log("API webhook - Appel webhook simplifié pour déploiement");

  try {
    // Renvoyer un accusé de réception simplifié
    return NextResponse.json({ received: true, mode: "deployment" });
  } catch (err) {
    console.error("Erreur:", err);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
