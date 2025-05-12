import React, { useState, useEffect } from "react";
import { FiCreditCard, FiX } from "react-icons/fi";

// Interface pour les props du formulaire de paiement
interface PaymentFormProps {
  planId: string;
  planName: string;
  userId: string;
  userEmail: string;
  onSuccess: (subscriptionId: string) => void;
  onCancel: () => void;
  amount?: number;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  planId,
  planName,
  userId,
  userEmail,
  onSuccess,
  onCancel,
}) => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializePayment = async () => {
      try {
        setIsLoading(true);
        setError(null);

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

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Erreur ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.url) {
          throw new Error("URL de paiement non disponible");
        }

        // Rediriger vers la page de paiement Stripe
        window.location.href = data.url;
      } catch (error) {
        console.error("Erreur lors de l'initialisation du paiement:", error);
        setError(error instanceof Error ? error.message : "Erreur lors de l'initialisation du paiement");
      } finally {
        setIsLoading(false);
      }
    };

    initializePayment();
  }, [planId, userId, userEmail, onSuccess]);

  // Affichage du formulaire de paiement avec un bouton d'annulation toujours visible
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-auto relative">
      {/* Bouton de fermeture en haut à droite */}
      <button
        onClick={onCancel}
        className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
        aria-label="Fermer"
      >
        <FiX size={24} />
      </button>

      <div className="text-center mb-6">
        <div className="flex justify-center mb-4">
          <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
            <FiCreditCard className="text-blue-500 dark:text-blue-300 text-3xl" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          {isLoading ? "Préparation du paiement..." : "Erreur de paiement"}
        </h2>
        
        {isLoading && (
          <div className="flex justify-center mt-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {error && (
          <>
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white rounded-md hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors duration-300"
            >
              Retour
            </button>
          </>
        )}
      </div>
      
      <div className="text-center mt-6">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Vous allez être redirigé vers notre partenaire de paiement sécurisé.
        </p>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white rounded-md hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors duration-300"
        >
          Annuler le paiement
        </button>
      </div>
    </div>
  );
};

export default PaymentForm;
