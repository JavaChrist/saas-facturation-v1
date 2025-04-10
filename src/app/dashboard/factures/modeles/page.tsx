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

export default function ModelesFacturePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [modeles, setModeles] = useState<ModeleFacture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les modèles de facture
  useEffect(() => {
    if (!user) return;

    const fetchModeles = async () => {
      try {
        setLoading(true);
        console.log(
          "Tentative de récupération des modèles pour l'utilisateur:",
          user.uid
        );
        const modelesData = await getModelesFacture(user.uid);
        console.log("Modèles récupérés avec succès:", modelesData);
        setModeles(modelesData);
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

    fetchModeles();
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
            className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 flex items-center transform hover:scale-105 transition-transform duration-300"
          >
            <FiPlus size={18} className="mr-2" /> Nouveau modèle
          </button>
        </div>
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
