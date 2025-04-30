"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BridgePage() {
  const router = useRouter();

  useEffect(() => {
    // Récupérer les paramètres de l'URL
    const params = new URLSearchParams(window.location.search);
    const planId = params.get("plan");

    if (planId) {
      console.log("[BRIDGE] Plan ID détecté:", planId);

      // Utilisation d'une fonction asynchrone à l'intérieur du useEffect
      const setupPlan = async () => {
        try {
          // Nettoyer complètement tous les stockages
          console.log("[BRIDGE] Nettoyage complet des stockages...");

          // Liste des clés à supprimer spécifiquement
          const keysToRemove = [
            "devUserPlan",
            "permanentUserPlan",
            "lastUsedPlanId",
            "planJustChanged",
            "planId",
            "currentPlanId",
            "forcedPlanUpdate",
            "planUpdateTimestamp",
          ];

          // Suppression ciblée d'abord
          keysToRemove.forEach((key) => {
            try {
              localStorage.removeItem(key);
              sessionStorage.removeItem(key);
            } catch (e) {
              console.warn(
                `[BRIDGE] Erreur lors de la suppression de ${key}:`,
                e
              );
            }
          });

          // Puis nettoyage complet pour être sûr
          localStorage.clear();
          sessionStorage.clear();

          console.log("[BRIDGE] Stockages nettoyés avec succès");

          // Pause pour s'assurer que le nettoyage est bien effectué
          await new Promise((resolve) => setTimeout(resolve, 100));

          // Enregistrer directement le plan dans tous les stockages possibles
          const dateStart = new Date();
          const dateEnd = new Date(
            dateStart.getTime() + 30 * 24 * 60 * 60 * 1000
          );

          const simulatedPlan = {
            planId: planId,
            isActive: true,
            dateStart: dateStart,
            dateEnd: dateEnd,
            stripeSubscriptionId:
              "sim_" + Math.random().toString(36).substring(2, 11),
            stripeCustomerId:
              "cus_sim_" + Math.random().toString(36).substring(2, 11),
            limites: {
              clients:
                planId === "premium" ? 50 : planId === "entreprise" ? -1 : 5,
              factures:
                planId === "premium" ? 500 : planId === "entreprise" ? -1 : 20,
              modeles:
                planId === "premium" ? 5 : planId === "entreprise" ? -1 : 1,
              utilisateurs:
                planId === "premium" ? 2 : planId === "entreprise" ? 10 : 1,
            },
          };

          // Sauvegarder le plan dans tous les stockages possibles avec des clés différentes
          // pour maximiser les chances de détection
          const planJSON = JSON.stringify(simulatedPlan);
          localStorage.setItem("devUserPlan", planJSON);
          sessionStorage.setItem("devUserPlan", planJSON);
          localStorage.setItem("permanentUserPlan", planJSON);
          localStorage.setItem("lastUsedPlanId", planId);
          sessionStorage.setItem("lastUsedPlanId", planId);
          // Définir le flag de changement de plan pour s'assurer que toutes les pages le détectent
          sessionStorage.setItem("planJustChanged", "true");
          sessionStorage.setItem("planId", planId);
          // Ajouter des clés supplémentaires pour garantir la détection
          localStorage.setItem("currentPlanId", planId);
          sessionStorage.setItem("currentPlanId", planId);
          localStorage.setItem("forcedPlanUpdate", "true");
          sessionStorage.setItem("forcedPlanUpdate", "true");
          localStorage.setItem("planUpdateTimestamp", Date.now().toString());
          sessionStorage.setItem("planUpdateTimestamp", Date.now().toString());

          console.log(
            "[BRIDGE] Plan enregistré dans tous les stockages:",
            simulatedPlan
          );
        } catch (e) {
          console.error("[BRIDGE] Erreur lors de l'enregistrement du plan:", e);
        }

        // Rediriger vers le dashboard après une courte pause
        setTimeout(() => {
          console.log("[BRIDGE] Redirection vers le dashboard...");

          // Force une actualisation complète pour garantir que le plan est bien chargé
          window.location.href = "/dashboard?forceUpdate=" + Date.now();
        }, 1000);
      };

      // Exécution de la fonction asynchrone
      setupPlan();
    } else {
      // Si pas de planId, redirection directe
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1000);
    }
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-8"></div>
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
        Finalisation de l'abonnement...
      </h1>
      <p className="text-gray-600 dark:text-gray-300">
        Redirection automatique vers votre tableau de bord dans un instant.
      </p>
    </div>
  );
}
