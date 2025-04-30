import React, { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { FiCreditCard, FiLock, FiCheckCircle } from "react-icons/fi";

// Vérifier si nous sommes en mode développement
const isDevelopment = process.env.NODE_ENV === "development";

// Charger l'instance Stripe avec la clé publique
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
);

// Interface pour les props du formulaire de paiement
interface PaymentFormProps {
  planId: string;
  planName: string;
  amount: number;
  userId: string;
  userEmail: string;
  onSuccess: (subscriptionId: string) => void;
  onCancel: () => void;
}

// Composant de formulaire de paiement qui utilise Stripe Elements
const PaymentForm: React.FC<PaymentFormProps> = ({
  planId,
  planName,
  amount,
  userId,
  userEmail,
  onSuccess,
  onCancel,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [clientSecret, setClientSecret] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Récupérer le secret client de l'API lors du chargement
  useEffect(() => {
    const fetchClientSecret = async () => {
      try {
        setIsLoading(true);
        setError(null);
        console.log("Préparation du paiement pour:", { planId, userId });

        const response = await fetch("/api/subscription/prepare", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            planId,
            userId,
            email: userEmail,
          }),
        });

        console.log("Réponse du serveur:", response.status);

        if (!response.ok) {
          let errorText = "";
          try {
            const errorData = await response.json();
            errorText = errorData.error || `Erreur ${response.status}`;
          } catch (parseError) {
            errorText = `Erreur ${response.status}`;
          }

          console.error("Erreur de réponse API:", errorText);
          throw new Error(`Échec de la préparation du paiement: ${errorText}`);
        }

        const data = await response.json();
        console.log("Données reçues:", data);

        // Vérifier que la réponse contient un clientSecret
        if (!data.clientSecret) {
          throw new Error("La réponse ne contient pas de clientSecret");
        }

        setClientSecret(data.clientSecret);
        setIsLoading(false);
      } catch (error) {
        console.error("Erreur lors de la préparation du paiement:", error);
        setError(
          `${
            error instanceof Error
              ? error.message
              : "Erreur de préparation du paiement"
          }`
        );
        setIsLoading(false);
      }
    };

    fetchClientSecret();
  }, [planId, userId, userEmail]);

  // En mode développement, simuler le succès du paiement
  const handleDevSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setProcessing(true);

    // Simuler un délai de traitement
    setTimeout(() => {
      setSucceeded(true);
      setProcessing(false);

      // Simuler un ID d'abonnement
      const simulatedSubscriptionId = `sub_sim_${Math.random()
        .toString(36)
        .substring(2, 10)}`;

      // Attendre un peu avant d'appeler onSuccess
      setTimeout(() => {
        onSuccess(simulatedSubscriptionId);
      }, 1500);
    }, 2000);
  };

  // Gérer la soumission du formulaire
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // En mode développement, utiliser la simulation
    if (isDevelopment) {
      return handleDevSubmit(event);
    }

    if (!stripe || !elements) {
      // Stripe.js n'est pas encore chargé
      setError(
        "Le service de paiement n'est pas encore initialisé. Veuillez réessayer."
      );
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const cardElement = elements.getElement(CardElement);

      if (!cardElement) {
        throw new Error("Élément de carte non trouvé");
      }

      // Confirmer le paiement avec les détails de la carte
      const { error, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: {
              email: userEmail,
            },
          },
        }
      );

      if (error) {
        setError(`Paiement échoué: ${error.message}`);
        setProcessing(false);
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        setSucceeded(true);
        setProcessing(false);

        // Appeler l'API pour finaliser l'abonnement
        const response = await fetch("/api/subscription/confirm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            planId,
            userId,
          }),
        });

        if (!response.ok) {
          throw new Error("Échec de la confirmation de l'abonnement");
        }

        const data = await response.json();
        onSuccess(data.subscriptionId);
      }
    } catch (err) {
      console.error("Erreur lors du traitement du paiement:", err);
      setError(
        "Une erreur est survenue lors du traitement de votre paiement. Veuillez réessayer."
      );
      setProcessing(false);
    }
  };

  // En mode développement, on simplifie l'interface et on évite les problèmes de sécurité liés à http://
  if (isDevelopment) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
              <FiCreditCard className="text-blue-500 dark:text-blue-300 text-3xl" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            Abonnement {planName}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-1">
            Montant: {amount.toFixed(2)} € / mois
          </p>
          <div className="flex items-center justify-center text-xs text-gray-500 dark:text-gray-400 mb-4">
            <FiLock className="mr-1" /> Paiement sécurisé (Mode développement)
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 text-blue-700 dark:text-blue-300 p-4 rounded mb-6">
            <p>
              Mode développement activé. Le paiement sera simulé pour les tests.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded mb-6">
              <p>{error}</p>
            </div>
          )}

          {succeeded ? (
            <div className="text-center py-6">
              <FiCheckCircle className="text-green-500 text-5xl mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                Paiement réussi !
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Votre abonnement au plan {planName} a été activé avec succès.
              </p>
            </div>
          ) : (
            <>
              <div className="border border-gray-300 dark:border-gray-600 p-4 rounded-md bg-white dark:bg-gray-700 mb-6">
                <p className="text-center text-gray-500 dark:text-gray-400">
                  **** **** **** 4242
                  <br />
                  Carte de test Stripe
                </p>
              </div>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
                  disabled={processing}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleDevSubmit}
                  disabled={processing}
                  className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                >
                  {processing ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Traitement...
                    </>
                  ) : (
                    "Simuler le paiement"
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Afficher un message de chargement
  if (isLoading && !error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
              <FiCreditCard className="text-blue-500 dark:text-blue-300 text-3xl" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
            Préparation du paiement...
          </h2>
          <div className="flex justify-center mt-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="flex justify-center mb-4">
          <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
            <FiCreditCard className="text-blue-500 dark:text-blue-300 text-3xl" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Abonnement {planName}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-1">
          Montant: {amount.toFixed(2)} € / mois
        </p>
        <div className="flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
          <FiLock className="mr-1" /> Paiement sécurisé via Stripe
        </div>
      </div>

      {succeeded ? (
        <div className="text-center py-6">
          <FiCheckCircle className="text-green-500 text-5xl mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
            Paiement réussi !
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Votre abonnement au plan {planName} a été activé avec succès.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Informations de carte
            </label>
            <div className="border border-gray-300 dark:border-gray-600 p-4 rounded-md bg-white dark:bg-gray-700">
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: "16px",
                      color: "#424770",
                      "::placeholder": {
                        color: "#aab7c4",
                      },
                    },
                    invalid: {
                      color: "#9e2146",
                    },
                  },
                }}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded">
              <p>{error}</p>
            </div>
          )}

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
              disabled={processing}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={(!stripe && !isDevelopment) || processing}
              className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
            >
              {processing ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Traitement...
                </>
              ) : (
                "Payer maintenant"
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

// Composant wrapper qui fournit le contexte Stripe
const StripePaymentForm: React.FC<PaymentFormProps> = (props) => {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm {...props} />
    </Elements>
  );
};

export default StripePaymentForm;
