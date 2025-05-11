"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiSave } from "react-icons/fi";
import { useAuth } from "@/lib/authContext";
import {
  createModeleFacture,
  getStyleParDefaut,
  getModelesFacture,
} from "@/services/modeleFactureService";
import { ModeleFacture } from "@/types/modeleFacture";
import { checkPlanLimit, getUserPlan } from "@/services/subscriptionService";

export default function CreerModelePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [planInfo, setPlanInfo] = useState<{
    planId: string;
    maxModeles: number;
    currentModeles: number;
  }>({ planId: "", maxModeles: 0, currentModeles: 0 });

  // État initial du modèle
  const [modele, setModele] = useState<Omit<ModeleFacture, "id">>({
    nom: "Nouveau modèle",
    description: "Description du modèle",
    style: getStyleParDefaut(),
    champsPersonnalises: [],
    mentionsSpeciales: [
      "En cas de retard de paiement, une pénalité de 3 fois le taux d'intérêt légal sera appliquée.",
      "Une indemnité forfaitaire de 40€ pour frais de recouvrement sera due.",
    ],
    piedDePage: "Merci pour votre confiance",
    actif: false,
    dateCreation: new Date(),
    userId: user?.uid || "",
  });

  // Vérifier les limites du plan au chargement
  useEffect(() => {
    if (!user) {
      router.push("/login");
      return;
    }

    const checkLimits = async () => {
      try {
        setChecking(true);

        // Récupérer les modèles existants
        const modeles = await getModelesFacture(user.uid);
        const modelCount = modeles.length;

        // Récupérer le plan de l'utilisateur
        const userPlan = await getUserPlan(user.uid);

        // Vérifier si la limite est atteinte
        const isLimitReached = await checkPlanLimit(
          user.uid,
          "modeles",
          modelCount
        );
        setLimitReached(isLimitReached);

        // Mettre à jour les informations du plan
        setPlanInfo({
          planId: userPlan.planId,
          maxModeles:
            userPlan.limites.modeles === -1
              ? Infinity
              : userPlan.limites.modeles,
          currentModeles: modelCount,
        });

        // Si la limite est atteinte, définir un message d'erreur
        if (isLimitReached) {
          setError(
            `Vous avez atteint la limite de ${modelCount} modèle(s) pour votre plan ${userPlan.planId}.`
          );
        }
      } catch (err) {
        console.error("Erreur lors de la vérification des limites:", err);
        if (err instanceof Error) {
          setError(`Erreur: ${err.message}`);
        } else {
          setError(
            "Une erreur est survenue lors de la vérification des limites"
          );
        }
      } finally {
        setChecking(false);
      }
    };

    checkLimits();
  }, [user, router]);

  // Gestion du changement des champs de base
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setModele({ ...modele, [name]: value });
  };

  // Gestion du changement de style
  const handleStyleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (e.target instanceof HTMLInputElement && e.target.type === "checkbox") {
      // Cas spécial pour les checkbox
      setModele({
        ...modele,
        style: {
          ...modele.style,
          [name]: e.target.checked,
        },
      });
    } else {
      // Cas standard pour les autres inputs
      setModele({
        ...modele,
        style: {
          ...modele.style,
          [name]: value,
        },
      });
    }
  };

  // Gestion des mentions spéciales
  const handleMentionChange = (index: number, value: string) => {
    const updatedMentions = [...modele.mentionsSpeciales];
    updatedMentions[index] = value;
    setModele({ ...modele, mentionsSpeciales: updatedMentions });
  };

  // Ajout d'une mention spéciale
  const addMention = () => {
    setModele({
      ...modele,
      mentionsSpeciales: [...modele.mentionsSpeciales, ""],
    });
  };

  // Suppression d'une mention spéciale
  const removeMention = (index: number) => {
    const updatedMentions = [...modele.mentionsSpeciales];
    updatedMentions.splice(index, 1);
    setModele({ ...modele, mentionsSpeciales: updatedMentions });
  };

  // Enregistrement du modèle
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!user) {
        throw new Error("Vous devez être connecté pour créer un modèle");
      }

      // Vérifier à nouveau les limites avant l'enregistrement
      const modeles = await getModelesFacture(user.uid);
      const isLimitReached = await checkPlanLimit(
        user.uid,
        "modeles",
        modeles.length
      );

      if (isLimitReached) {
        throw new Error(
          `Limite de modèles atteinte (${modeles.length}/${planInfo.maxModeles}). Passez à un plan supérieur pour créer plus de modèles.`
        );
      }

      // S'assurer que l'ID utilisateur est défini
      const modeleAvecUserId = {
        ...modele,
        userId: user.uid,
      };

      const modeleId = await createModeleFacture(modeleAvecUserId);
      router.push("/dashboard/factures/modeles");
    } catch (err) {
      console.error("Erreur lors de la création du modèle:", err);
      if (err instanceof Error) {
        setError(`Erreur: ${err.message}`);
      } else {
        setError("Une erreur est survenue lors de la création du modèle");
      }
    } finally {
      setLoading(false);
    }
  };

  // Rediriger si la limite est atteinte
  if (checking) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    );
  }

  // Afficher un message si la limite est atteinte
  if (limitReached) {
    return (
      <div className="p-6 bg-background-light dark:bg-background-dark">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-semibold text-gray-800 dark:text-white">
            🖌️ Création de modèle impossible
          </h1>
          <button
            onClick={() => router.push("/dashboard/factures/modeles")}
            className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-800 flex items-center"
          >
            <FiArrowLeft size={18} className="mr-2" /> Retour
          </button>
        </div>

        <div className="bg-amber-50 border-l-4 border-amber-500 text-amber-700 p-4 mb-6">
          <h2 className="font-bold text-lg mb-2">Limite de modèles atteinte</h2>
          <p>
            Vous utilisez actuellement {planInfo.currentModeles} modèle(s) sur{" "}
            {planInfo.maxModeles === Infinity
              ? "illimité"
              : planInfo.maxModeles}{" "}
            disponible(s) avec votre plan {planInfo.planId}.
          </p>
          <div className="mt-4">
            <a
              href="/dashboard/abonnement"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 inline-block"
            >
              Passer à un plan supérieur
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-background-light dark:bg-background-dark">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-semibold text-gray-800 dark:text-white">
          🖌️ Nouveau Modèle de Facture
        </h1>
        <button
          onClick={() => router.push("/dashboard/factures/modeles")}
          className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-800 flex items-center transform hover:scale-105 transition-transform duration-300"
        >
          <FiArrowLeft size={18} className="mr-2" /> Retour
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
            Informations générales
          </h2>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nom du modèle
              </label>
              <input
                type="text"
                name="nom"
                value={modele.nom}
                onChange={handleChange}
                className="w-full p-2 border rounded-md bg-white text-gray-800"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={modele.description}
                onChange={handleChange}
                className="w-full p-2 border rounded-md bg-white text-gray-800"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Pied de page
              </label>
              <input
                type="text"
                name="piedDePage"
                value={modele.piedDePage}
                onChange={handleChange}
                className="w-full p-2 border rounded-md bg-white text-gray-800"
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
            Style du modèle
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Couleur primaire
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  name="couleurPrimaire"
                  value={modele.style.couleurPrimaire}
                  onChange={handleStyleChange}
                  className="h-10 w-10 border-0"
                />
                <input
                  type="text"
                  name="couleurPrimaire"
                  value={modele.style.couleurPrimaire}
                  onChange={handleStyleChange}
                  className="flex-1 p-2 border rounded-md bg-white text-gray-800"
                  pattern="^#[0-9A-Fa-f]{6}$"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Couleur secondaire
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  name="couleurSecondaire"
                  value={modele.style.couleurSecondaire}
                  onChange={handleStyleChange}
                  className="h-10 w-10 border-0"
                />
                <input
                  type="text"
                  name="couleurSecondaire"
                  value={modele.style.couleurSecondaire}
                  onChange={handleStyleChange}
                  className="flex-1 p-2 border rounded-md bg-white text-gray-800"
                  pattern="^#[0-9A-Fa-f]{6}$"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Police
              </label>
              <select
                name="police"
                value={modele.style.police}
                onChange={handleStyleChange}
                className="w-full p-2 border rounded-md bg-white text-gray-800"
              >
                <option value="helvetica">Helvetica</option>
                <option value="times">Times</option>
                <option value="courier">Courier</option>
                <option value="arial">Arial</option>
                <option value="georgia">Georgia</option>
                <option value="verdana">Verdana</option>
                <option value="roboto">Roboto</option>
                <option value="montserrat">Montserrat</option>
                <option value="lato">Lato</option>
                <option value="openSans">Open Sans</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Position du logo
              </label>
              <select
                name="logoPosition"
                value={modele.style.logoPosition}
                onChange={handleStyleChange}
                className="w-full p-2 border rounded-md bg-white text-gray-800"
              >
                <option value="haut">En haut à gauche</option>
                <option value="droite">En haut à droite</option>
                <option value="aucun">Ne pas afficher</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="avecEnTete"
                checked={modele.style.avecEnTete}
                onChange={handleStyleChange}
                className="h-4 w-4"
                id="avecEnTete"
              />
              <label
                htmlFor="avecEnTete"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Utiliser du papier à en-tête
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="avecSignature"
                checked={modele.style.avecSignature}
                onChange={handleStyleChange}
                className="h-4 w-4"
                id="avecSignature"
              />
              <label
                htmlFor="avecSignature"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Inclure une signature
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              Mentions spéciales
            </h2>
            <button
              type="button"
              onClick={addMention}
              className="bg-green-600 text-white py-1 px-2 rounded-md hover:bg-green-700 text-sm"
            >
              + Ajouter
            </button>
          </div>
          <div className="space-y-3">
            {modele.mentionsSpeciales.map((mention, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={mention}
                  onChange={(e) => handleMentionChange(index, e.target.value)}
                  className="flex-1 p-2 border rounded-md bg-white text-gray-800"
                  placeholder="Mention légale ou spéciale"
                />
                <button
                  type="button"
                  onClick={() => removeMention(index)}
                  className="bg-red-600 text-white py-1 px-2 rounded-md hover:bg-red-700 text-sm"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="bg-gray-800 text-white px-6 py-2 rounded-md hover:bg-gray-600 flex items-center transform hover:scale-105 transition-transform duration-300"
          >
            <FiSave size={18} className="mr-2" />
            {loading ? "Création en cours..." : "Créer le modèle"}
          </button>
        </div>
      </form>
    </div>
  );
}
