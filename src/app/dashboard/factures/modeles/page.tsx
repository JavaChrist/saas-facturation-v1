"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiPlus, FiEdit, FiTrash2, FiCheck } from "react-icons/fi";
import { useAuth } from "@/lib/authContext";
import {
  getModelesFacture,
  deleteModeleFacture,
  setModeleParDefaut,
} from "@/services/modeleFactureService";
import { ModeleFacture } from "@/types/modeleFacture";
import { getUserPlan, checkPlanLimit } from "@/services/subscriptionService";

export default function ModelesFacturePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [modeles, setModeles] = useState<ModeleFacture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [planInfo, setPlanInfo] = useState<{
    planId: string;
    maxModeles: number;
    currentModeles: number;
  }>({ planId: "gratuit", maxModeles: 1, currentModeles: 0 });

  // Charger les modèles de facture et vérifier les limites
  useEffect(() => {
    if (!user) return;

    const fetchModelesAndLimits = async () => {
      try {
        setLoading(true);
        console.log(
          "Tentative de récupération des modèles pour l'utilisateur:",
          user.uid
        );

        // Récupérer les modèles
        const modelesData = await getModelesFacture(user.uid);
        console.log("Modèles récupérés avec succès:", modelesData);
        setModeles(modelesData);

        // Récupérer le plan de l'utilisateur
        const userPlan = await getUserPlan(user.uid);

        // Vérifier si la limite est atteinte
        const isLimitReached = await checkPlanLimit(
          user.uid,
          "modeles",
          modelesData.length
        );
        setLimitReached(isLimitReached);

        // Définir les informations du plan
        setPlanInfo({
          planId: userPlan.planId,
          maxModeles:
            userPlan.limites.modeles === -1
              ? Infinity
              : userPlan.limites.modeles,
          currentModeles: modelesData.length,
        });
      } catch (err) {
        console.error("Erreur détaillée lors du chargement des modèles:", err);
        if (err instanceof Error) {
          setError(
            `Impossible de charger les modèles de facture: ${err.message}. Veuillez réessayer.`
          );
        } else {
          setError(
            "Impossible de charger les modèles de facture. Veuillez réessayer."
          );
        }
      } finally {
        setLoading(false);
      }
    };

    fetchModelesAndLimits();
  }, [user]);

  // Naviguer vers la création d'un nouveau modèle
  const handleCreateNew = () => {
    router.push("/dashboard/factures/modeles/creer");
  };

  // Naviguer vers l'édition d'un modèle
  const handleEdit = (modeleId: string) => {
    router.push(`/dashboard/factures/modeles/editer?id=${modeleId}`);
  };

  // Supprimer un modèle
  const handleDelete = async (modeleId: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce modèle?")) {
      try {
        await deleteModeleFacture(modeleId);
        setModeles(modeles.filter((m) => m.id !== modeleId));
      } catch (err) {
        console.error("Erreur lors de la suppression:", err);
        alert("Impossible de supprimer le modèle. Veuillez réessayer.");
      }
    }
  };

  // Définir un modèle comme modèle par défaut
  const handleSetDefault = async (modeleId: string) => {
    try {
      if (!user) return;
      await setModeleParDefaut(user.uid, modeleId);

      // Mettre à jour l'état local
      setModeles(
        modeles.map((modele) => ({
          ...modele,
          actif: modele.id === modeleId,
        }))
      );
    } catch (err) {
      console.error("Erreur lors de la définition du modèle par défaut:", err);
      alert("Impossible de définir le modèle par défaut. Veuillez réessayer.");
    }
  };

  return (
    <div className="p-6 bg-background-light dark:bg-background-dark">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-semibold text-gray-800 dark:text-white">
          📝 Modèles de Facture
        </h1>
        <div className="flex space-x-4">
          <button
            onClick={() => router.push("/dashboard/factures")}
            className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-800 flex items-center transform hover:scale-105 transition-transform duration-300"
          >
            <FiArrowLeft size={18} className="mr-2" /> Retour
          </button>
          <button
            onClick={handleCreateNew}
            disabled={limitReached}
            className={`${
              limitReached
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700 transform hover:scale-105"
            } text-white py-2 px-4 rounded-md flex items-center transition-transform duration-300`}
            title={
              limitReached
                ? "Limite de modèles atteinte pour votre plan"
                : "Créer un nouveau modèle"
            }
          >
            <FiPlus size={18} className="mr-2" /> Nouveau modèle
          </button>
        </div>
      </div>

      {/* Afficher les informations sur les limites du plan */}
      <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-medium text-gray-700 dark:text-gray-300">
              Modèles de facture
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {planInfo.maxModeles === Infinity
                ? `Vous utilisez ${planInfo.currentModeles} modèle(s) (illimité avec le plan ${planInfo.planId})`
                : `Vous utilisez ${planInfo.currentModeles} modèle(s) sur ${planInfo.maxModeles} disponible(s) avec votre plan ${planInfo.planId}`}
            </p>
          </div>
          {limitReached && (
            <div className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 px-3 py-1 rounded-full text-sm">
              Limite atteinte
            </div>
          )}
        </div>
        {limitReached && (
          <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            <a
              href="/dashboard/abonnement"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Passez à un plan supérieur
            </a>{" "}
            pour créer plus de modèles de facture.
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
          <p>{error}</p>
        </div>
      ) : modeles.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-500 dark:text-gray-300 text-lg">
            Aucun modèle de facture créé
          </p>
          <button
            onClick={handleCreateNew}
            className="mt-4 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 flex items-center mx-auto"
          >
            <FiPlus size={18} className="mr-2" /> Créer mon premier modèle
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modeles.map((modele) => (
            <div
              key={modele.id}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden ${
                modele.actif ? "ring-2 ring-blue-500" : ""
              }`}
            >
              <div
                className="h-20 flex items-center justify-center text-white font-bold text-xl"
                style={{ backgroundColor: modele.style.couleurPrimaire }}
              >
                {modele.nom}
              </div>
              <div className="p-4">
                <p className="text-gray-600 dark:text-gray-300 mb-2">
                  {modele.description}
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: modele.style.couleurPrimaire }}
                    title="Couleur primaire"
                  ></div>
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: modele.style.couleurSecondaire }}
                    title="Couleur secondaire"
                  ></div>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  <span className="font-medium">Police:</span>{" "}
                  {modele.style.police}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-medium">Créé le:</span>{" "}
                  {modele.dateCreation.toLocaleDateString()}
                </div>

                <div className="mt-4 flex justify-between items-center">
                  <button
                    onClick={() => handleSetDefault(modele.id)}
                    className={`flex items-center px-3 py-1 rounded ${
                      modele.actif
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/50"
                    }`}
                    disabled={modele.actif}
                    title={
                      modele.actif
                        ? "Modèle par défaut"
                        : "Définir comme modèle par défaut"
                    }
                  >
                    <FiCheck size={16} className="mr-1" />
                    {modele.actif ? "Par défaut" : "Définir"}
                  </button>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(modele.id)}
                      className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      title="Modifier"
                    >
                      <FiEdit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(modele.id)}
                      className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      title="Supprimer"
                    >
                      <FiTrash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
