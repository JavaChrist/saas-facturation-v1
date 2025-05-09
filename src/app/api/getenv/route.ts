import { NextRequest, NextResponse } from "next/server";

// Une route d'API simple pour obtenir l'environnement Node.js actuel
export async function GET() {
  try {
    // Vérifier l'environnement Node.js
    const nodeEnv = process.env.NODE_ENV || "development";

    return NextResponse.json({
      success: true,
      env: {
        nodeEnv,
        isProduction: nodeEnv === "production",
        isDevelopment: nodeEnv === "development",
      },
      message: `Mode d'environnement actuel: ${nodeEnv}`,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération de l'environnement:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

// Endpoint pour définir des valeurs dans localStorage depuis l'API (utile pour déboguer)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { planId } = body;

    if (!planId) {
      return NextResponse.json(
        { success: false, error: "planId requis" },
        { status: 400 }
      );
    }

    // Retourner les données nécessaires pour configurer localStorage côté client
    return NextResponse.json({
      success: true,
      planData: {
        planId,
        dateStart: new Date(),
        dateEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
        limites: {
          clients: planId === "premium" ? 50 : planId === "enterprise" ? -1 : 5,
          factures:
            planId === "premium" ? 500 : planId === "enterprise" ? -1 : 20,
          modeles: planId === "premium" ? 5 : planId === "enterprise" ? -1 : 1,
          utilisateurs:
            planId === "premium" ? 2 : planId === "enterprise" ? 10 : 1,
        },
      },
      instructions:
        "Utilisez ces données pour mettre à jour localStorage et sessionStorage",
    });
  } catch (error) {
    console.error("Erreur lors du traitement de la requête:", error);
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
