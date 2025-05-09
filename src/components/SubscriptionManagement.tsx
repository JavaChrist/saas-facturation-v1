import React from "react";
import { UserPlan } from "@/services/subscriptionService";
import { FiCreditCard, FiAlertCircle } from "react-icons/fi";

interface SubscriptionManagementProps {
  userPlan: UserPlan;
  planActuel: string;
}

const SubscriptionManagement: React.FC<SubscriptionManagementProps> = ({
  userPlan,
  planActuel,
}) => {
  const isSubscriptionActive = userPlan?.isActive && planActuel !== "gratuit";
  const hasStripeInfo =
    userPlan?.stripeSubscriptionId && userPlan?.stripeCustomerId;
  // Vérifier si nous sommes en développement - éviter la redirection Stripe
  const isDevelopment = process.env.NODE_ENV === "development";

  // Formater la date d'expiration pour l'affichage
  const formatDate = (date: Date | any) => {
    if (!date) return "Non disponible";
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      return dateObj.toLocaleDateString();
    } catch {
      return "Date invalide";
    }
  };

  const handleManageSubscription = async () => {
    // En mode développement, toujours utiliser la gestion locale
    if (isDevelopment) {
      // Rediriger vers la page d'abonnement avec un paramètre spécial
      window.location.href = "/dashboard/abonnement?mode=change";
      return;
    }

    // En production, vérifier si l'URL du portail est configurée
    if (process.env.NEXT_PUBLIC_STRIPE_CUSTOMER_PORTAL_URL) {
      window.open(process.env.NEXT_PUBLIC_STRIPE_CUSTOMER_PORTAL_URL, "_blank");
    } else {
      alert("Le portail de gestion des abonnements n'est pas configuré.");
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white flex items-center">
        <FiCreditCard className="mr-2" />
        Gestion de l'abonnement
      </h2>

      {isSubscriptionActive ? (
        <>
          <div className="space-y-4">
            {hasStripeInfo ? (
              <>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Abonnement Stripe
                  </p>
                  <p className="font-medium text-gray-800 dark:text-white">
                    {userPlan.stripeSubscriptionId}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Date de renouvellement
                  </p>
                  <p className="font-medium text-gray-800 dark:text-white">
                    {formatDate(userPlan.dateEnd)}
                  </p>
                </div>

                <button
                  onClick={handleManageSubscription}
                  className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md transition-colors duration-300"
                >
                  Gérer mon abonnement
                </button>

                <p className="text-xs text-gray-500 mt-2">
                  Vous serez redirigé vers le portail client Stripe pour gérer
                  vos informations de paiement, consulter l'historique des
                  factures ou modifier votre abonnement.
                </p>
              </>
            ) : (
              <div className="flex items-start bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md">
                <FiAlertCircle className="text-blue-500 dark:text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                    Votre abonnement est géré localement en mode développement.
                  </p>
                  <button
                    onClick={handleManageSubscription}
                    className="mt-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md transition-colors duration-300"
                  >
                    Gérer mon abonnement localement
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="flex items-start bg-gray-50 dark:bg-gray-700/30 p-4 rounded-md">
          <FiAlertCircle className="text-gray-500 dark:text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {planActuel === "gratuit"
                ? "Vous utilisez actuellement le plan gratuit sans abonnement payant."
                : "Aucun abonnement actif trouvé."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionManagement;
