import { NextRequest, NextResponse } from "next/server";
import { stripe, isStripeConfigured, getStripeNotConfiguredResponse } from "@/lib/stripe-client";

export async function POST(request: NextRequest) {
  try {
    if (!isStripeConfigured()) {
      const response = getStripeNotConfiguredResponse();
      return NextResponse.json(response, { status: 503 });
    }

    const { paymentIntentId, planId, userId } = await request.json();

    // Récupérer le PaymentIntent
    const paymentIntent = await stripe!.paymentIntents.retrieve(paymentIntentId);

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
