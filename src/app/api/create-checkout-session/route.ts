import { NextResponse } from "next/server";
import Stripe from "stripe";
import { STRIPE_PRICE_IDS } from "@/config/prices";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-03-31.basil",
});

export async function POST(request: Request) {
  try {
    const { planId, userId, userEmail } = await request.json();

    console.log("[DEBUG-API] Création de session pour:", {
      planId,
      userId,
      userEmail,
    });

    // Vérifier que le plan existe
    const priceId = STRIPE_PRICE_IDS[planId as keyof typeof STRIPE_PRICE_IDS];
    if (!priceId) {
      console.error("[DEBUG-API] Plan invalide:", planId);
      return NextResponse.json(
        { error: "Plan invalide" },
        { status: 400 }
      );
    }

    // Créer la session Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.NEXT_PUBLIC_URL}/dashboard/abonnement?success=true&plan=${planId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/dashboard/abonnement?canceled=true`,
      customer_email: userEmail,
      metadata: {
        userId,
        planId,
      },
    });

    console.log("[DEBUG-API] Session créée:", session.id);

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error("[DEBUG-API] Erreur lors de la création de la session:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de la session" },
      { status: 500 }
    );
  }
} 