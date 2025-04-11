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

      try {
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

        // Sauvegarder le plan dans tous les stockages possibles
        const planJSON = JSON.stringify(simulatedPlan);
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem("devUserPlan", planJSON);
        sessionStorage.setItem("devUserPlan", planJSON);
        localStorage.setItem("permanentUserPlan", planJSON);
        localStorage.setItem("lastUsedPlanId", planId);
        sessionStorage.setItem("lastUsedPlanId", planId);

        console.log(
          "[BRIDGE] Plan enregistré dans tous les stockages:",
          simulatedPlan
        );
      } catch (e) {
        console.error("[BRIDGE] Erreur lors de l'enregistrement du plan:", e);
      }
    }

    // Rediriger vers le dashboard après une courte pause
    setTimeout(() => {
      console.log("[BRIDGE] Redirection vers le dashboard...");

      // Force une actualisation complète pour garantir que le plan est bien chargé
      window.location.href = "/dashboard";
    }, 1000);
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
