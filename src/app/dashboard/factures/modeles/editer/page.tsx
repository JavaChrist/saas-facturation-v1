"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FiArrowLeft, FiSave } from "react-icons/fi";
import { useAuth } from "@/lib/authContext";
import {
  getModeleFacture,
  updateModeleFacture,
  getStyleParDefaut,
} from "@/services/modeleFactureService";
import { ModeleFacture } from "@/types/modeleFacture";

function EditerModeleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Récupérer l'ID du modèle depuis l'URL
  const modeleId = searchParams.get("id");

  // État initial du modèle
  const [modele, setModele] = useState<Omit<ModeleFacture, "id">>({
    nom: "",
    description: "",
    style: getStyleParDefaut(),
    champsPersonnalises: [],
    mentionsSpeciales: [],
    piedDePage: "",
    actif: false,
    dateCreation: new Date(),
    userId: user?.uid || "",
  });

  // Chargement des données du modèle
  useEffect(() => {
    const fetchModele = async () => {
      if (!modeleId || !user) {
        router.push("/dashboard/factures/modeles");
        return;
      }

      try {
        setLoadingData(true);
        const modeleData = await getModeleFacture(modeleId);

        if (!modeleData) {
          setError("Modèle introuvable");
          return;
        }

        // Vérifier que l'utilisateur est bien le propriétaire du modèle
        if (modeleData.userId !== user.uid) {
          setError("Vous n'êtes pas autorisé à modifier ce modèle");
          return;
        }

        // Omettre l'ID du modèle pour correspondre à notre structure d'état
        const { id, ...modeleWithoutId } = modeleData;
        setModele(modeleWithoutId);
      } catch (err) {
        console.error("Erreur lors du chargement du modèle:", err);
        if (err instanceof Error) {
          setError(`Erreur: ${err.message}`);
        } else {
          setError("Une erreur est survenue lors du chargement du modèle");
        }
      } finally {
        setLoadingData(false);
      }
    };

    fetchModele();
  }, [modeleId, user, router]);

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

  // Mise à jour du modèle
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!modeleId || !user) {
      setError("Impossible de mettre à jour le modèle");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // S'assurer que l'ID utilisateur est défini
      const modeleAvecUserId = {
        ...modele,
        userId: user.uid,
      };

      await updateModeleFacture(modeleId, modeleAvecUserId);
      router.push("/dashboard/factures/modeles");
    } catch (err) {
      console.error("Erreur lors de la mise à jour du modèle:", err);
      if (err instanceof Error) {
        setError(`Erreur: ${err.message}`);
      } else {
        setError("Une erreur est survenue lors de la mise à jour du modèle");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="p-6 flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-background-light dark:bg-background-dark">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-semibold text-gray-800 dark:text-white">
          ✏️ Modifier le Modèle
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
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="actif"
                name="actif"
                checked={modele.actif}
                onChange={(e) =>
                  setModele({ ...modele, actif: e.target.checked })
                }
                className="h-4 w-4"
              />
              <label
                htmlFor="actif"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Modèle par défaut
              </label>
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
            {modele.mentionsSpeciales.length === 0 && (
              <p className="text-gray-500 italic text-sm">
                Aucune mention spéciale
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="bg-gray-800 text-white px-6 py-2 rounded-md hover:bg-gray-600 flex items-center transform hover:scale-105 transition-transform duration-300"
          >
            <FiSave size={18} className="mr-2" />
            {loading
              ? "Mise à jour en cours..."
              : "Enregistrer les modifications"}
          </button>
        </div>
      </form>
    </div>
  );
}

// Composant principal qui enveloppe le contenu dans un Suspense
export default function EditerModelePage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100"></div>
        </div>
      }
    >
      <EditerModeleContent />
    </Suspense>
  );
}
