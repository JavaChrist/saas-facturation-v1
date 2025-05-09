import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { STRIPE_SECRET_KEY } from "@/config/stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || STRIPE_SECRET_KEY, {
  apiVersion: "2025-03-31.basil",
});

export async function POST(request: NextRequest) {
  try {
    const { paymentIntentId, planId, userId } = await request.json();

    // Récupérer le PaymentIntent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json(
        { error: "Le paiement n'a pas été validé" },
        { status: 400 }
      );
    }

    // Créer l'abonnement Stripe
    const subscription = await stripe.subscriptions.create({
      customer: paymentIntent.customer as string,
      items: [
        {
          price: paymentIntent.metadata.priceId,
        },
      ],
      metadata: {
        userId,
        planId,
      },
    });

    return NextResponse.json({
      subscriptionId: subscription.id,
      status: "success",
    });
  } catch (error) {
    console.error("Erreur lors de la confirmation de l'abonnement:", error);
    return NextResponse.json(
      { error: "Erreur lors de la confirmation de l'abonnement" },
      { status: 500 }
    );
  }
}
