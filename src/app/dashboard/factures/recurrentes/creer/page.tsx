"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiSave } from "react-icons/fi";
import { useAuth } from "@/lib/authContext";
import {
  createFactureRecurrente,
  calculerProchaineEmission,
} from "@/services/factureRecurrenteService";
import { getModelesFacture } from "@/services/modeleFactureService";
import { FactureRecurrente, ModeleFacture } from "@/types/modeleFacture";
import { Client, Article } from "@/types/facture";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function CreerFactureRecurrentePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Données nécessaires pour créer une facture récurrente
  const [clients, setClients] = useState<Client[]>([]);
  const [modeles, setModeles] = useState<ModeleFacture[]>([]);

  // État initial de la facture récurrente
  const [factureRecurrente, setFactureRecurrente] = useState<
    Omit<FactureRecurrente, "id">
  >({
    modeleId: "",
    clientId: "",
    articles: [],
    frequence: "mensuelle",
    montantHT: 0,
    montantTTC: 0,
    jourEmission: 1,
    moisEmission: [0, 3, 6, 9], // Pour les fréquences non mensuelles
    prochaineEmission: new Date(),
    actif: true,
    nombreRepetitions: undefined, // Illimité par défaut
    repetitionsEffectuees: 0,
    dateCreation: new Date(),
    userId: user?.uid || "",
  });

  // Chargement des données
  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        router.push("/dashboard/factures");
        return;
      }

      try {
        setLoadingData(true);

        // Charger les clients
        const clientsQuery = query(
          collection(db, "clients"),
          where("userId", "==", user.uid)
        );
        const clientsSnapshot = await getDocs(clientsQuery);
        const clientsData = clientsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Client[];
        setClients(clientsData);

        // Charger les modèles de facture
        const modelesData = await getModelesFacture(user.uid);
        setModeles(modelesData);

        // Initialiser avec des valeurs par défaut
        if (clientsData.length > 0) {
          setFactureRecurrente((prev) => ({
            ...prev,
            clientId: clientsData[0].id,
          }));
        }

        if (modelesData.length > 0) {
          const modeleActif =
            modelesData.find((m) => m.actif) || modelesData[0];
          setFactureRecurrente((prev) => ({
            ...prev,
            modeleId: modeleActif.id,
          }));
        }

        // Calcul de la prochaine émission
        const prochaine = calculerProchaineEmission(
          factureRecurrente.frequence,
          factureRecurrente.jourEmission,
          factureRecurrente.moisEmission
        );
        setFactureRecurrente((prev) => ({
          ...prev,
          prochaineEmission: prochaine,
        }));
      } catch (err) {
        console.error("Erreur lors du chargement des données:", err);
        if (err instanceof Error) {
          setError(`Erreur: ${err.message}`);
        } else {
          setError("Une erreur est survenue lors du chargement des données");
        }
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [user, router, factureRecurrente]);

  // Mise à jour de la prochaine émission lors du changement de fréquence ou de jour
  useEffect(() => {
    if (
      factureRecurrente &&
      factureRecurrente.frequence &&
      factureRecurrente.jourEmission
    ) {
      const prochaine = calculerProchaineEmission(
        factureRecurrente.frequence,
        factureRecurrente.jourEmission,
        factureRecurrente.moisEmission
      );
      setFactureRecurrente((prev) => ({
        ...prev,
        prochaineEmission: prochaine,
      }));
    }
  }, [
    factureRecurrente.frequence,
    factureRecurrente.jourEmission,
    factureRecurrente.moisEmission,
  ]);

  // Gestion des champs de base
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    if (name === "jourEmission") {
      // Limiter le jour entre 1 et 28
      const jour = Math.min(Math.max(1, parseInt(value)), 28);
      setFactureRecurrente({ ...factureRecurrente, [name]: jour });
    } else if (name === "montantHT") {
      // Calculer le montant TTC automatiquement (avec TVA à 20% par défaut)
      const montantHT = value === "" ? 0 : parseFloat(value);
      const montantTTC = montantHT * 1.2;
      setFactureRecurrente({
        ...factureRecurrente,
        montantHT,
        montantTTC,
      });
    } else if (name === "montantTTC") {
      // Calcul inverse pour le montant HT
      const montantTTC = value === "" ? 0 : parseFloat(value);
      const montantHT = montantTTC / 1.2;
      setFactureRecurrente({
        ...factureRecurrente,
        montantHT,
        montantTTC,
      });
    } else if (name === "actif") {
      setFactureRecurrente({
        ...factureRecurrente,
        actif: (e.target as HTMLInputElement).checked,
      });
    } else if (name === "nombreRepetitions") {
      const value =
        e.target.value === "" ? undefined : parseInt(e.target.value);
      setFactureRecurrente({
        ...factureRecurrente,
        nombreRepetitions: value,
      });
    } else {
      setFactureRecurrente({ ...factureRecurrente, [name]: value });
    }
  };

  // Gestion des mois d'émission pour les fréquences non mensuelles
  const handleMoisEmissionChange = (mois: number) => {
    const currentMois = [...(factureRecurrente.moisEmission || [])];

    if (currentMois.includes(mois)) {
      // Retirer le mois s'il est déjà présent
      const nouveauxMois = currentMois.filter((m) => m !== mois);
      setFactureRecurrente({
        ...factureRecurrente,
        moisEmission: nouveauxMois,
      });
    } else {
      // Ajouter le mois s'il n'est pas présent
      const nouveauxMois = [...currentMois, mois].sort((a, b) => a - b);
      setFactureRecurrente({
        ...factureRecurrente,
        moisEmission: nouveauxMois,
      });
    }
  };

  // Ajout d'un article à la facture
  const addArticle = () => {
    const newArticle: Article = {
      id: Date.now(),
      description: "",
      quantite: 0,
      prixUnitaireHT: 0,
      tva: 20,
      totalTTC: 0,
      isComment: false,
    };

    setFactureRecurrente({
      ...factureRecurrente,
      articles: [...factureRecurrente.articles, newArticle],
    });

    // Mettre à jour les montants
    calculerTotaux([...factureRecurrente.articles, newArticle]);
  };

  // Mise à jour d'un article
  const handleArticleChange = (index: number, field: string, value: any) => {
    const updatedArticles = [...factureRecurrente.articles];
    updatedArticles[index] = { ...updatedArticles[index], [field]: value };

    // Calculer le total TTC pour cet article
    if (!updatedArticles[index].isComment) {
      const prixHT =
        updatedArticles[index].prixUnitaireHT * updatedArticles[index].quantite;
      const tvaAmount = (prixHT * updatedArticles[index].tva) / 100;
      updatedArticles[index].totalTTC = prixHT + tvaAmount;
    }

    setFactureRecurrente({
      ...factureRecurrente,
      articles: updatedArticles,
    });

    // Mettre à jour les montants totaux
    calculerTotaux(updatedArticles);
  };

  // Suppression d'un article
  const removeArticle = (id: number) => {
    const updatedArticles = factureRecurrente.articles.filter(
      (article) => article.id !== id
    );

    setFactureRecurrente({
      ...factureRecurrente,
      articles: updatedArticles,
    });

    // Mettre à jour les montants
    calculerTotaux(updatedArticles);
  };

  // Calcul des totaux
  const calculerTotaux = (articles: Article[]) => {
    // Filtrer les commentaires qui ne sont pas des articles
    const articlesValides = articles.filter((a) => !a.isComment);

    const totalHT = articlesValides.reduce(
      (sum, article) => sum + article.prixUnitaireHT * article.quantite,
      0
    );

    const totalTTC = articlesValides.reduce(
      (sum, article) => sum + article.totalTTC,
      0
    );

    setFactureRecurrente((prev) => ({
      ...prev,
      montantHT: totalHT,
      montantTTC: totalTTC,
    }));
  };

  // Enregistrement de la facture récurrente
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError("Vous devez être connecté pour créer une facture récurrente");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Vérifications
      if (!factureRecurrente.clientId) {
        throw new Error("Veuillez sélectionner un client");
      }

      if (!factureRecurrente.modeleId) {
        throw new Error("Veuillez sélectionner un modèle de facture");
      }

      if (factureRecurrente.articles.length === 0) {
        throw new Error("Veuillez ajouter au moins un article");
      }

      // S'assurer que l'ID utilisateur est défini
      const factureAvecUserId = {
        ...factureRecurrente,
        userId: user.uid,
      };

      await createFactureRecurrente(factureAvecUserId);
      router.push("/dashboard/factures/recurrentes");
    } catch (err) {
      console.error(
        "Erreur lors de la création de la facture récurrente:",
        err
      );
      if (err instanceof Error) {
        setError(`Erreur: ${err.message}`);
      } else {
        setError(
          "Une erreur est survenue lors de la création de la facture récurrente"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Rendu du formulaire
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
          🔄 Nouvelle Facturation Récurrente
        </h1>
        <button
          onClick={() => router.push("/dashboard/factures/recurrentes")}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Client
              </label>
              <select
                name="clientId"
                value={factureRecurrente.clientId}
                onChange={handleChange}
                className="w-full p-2 border rounded-md bg-white text-gray-800"
                required
              >
                <option value="">Sélectionnez un client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.refClient} - {client.nom}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Modèle de facture
              </label>
              <select
                name="modeleId"
                value={factureRecurrente.modeleId}
                onChange={handleChange}
                className="w-full p-2 border rounded-md bg-white text-gray-800"
                required
              >
                <option value="">Sélectionnez un modèle</option>
                {modeles.map((modele) => (
                  <option key={modele.id} value={modele.id}>
                    {modele.nom} {modele.actif ? "(Par défaut)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Fréquence
              </label>
              <select
                name="frequence"
                value={factureRecurrente.frequence}
                onChange={handleChange}
                className="w-full p-2 border rounded-md bg-white text-gray-800"
                required
              >
                <option value="mensuelle">Mensuelle</option>
                <option value="trimestrielle">Trimestrielle</option>
                <option value="semestrielle">Semestrielle</option>
                <option value="annuelle">Annuelle</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Jour d'émission du mois
              </label>
              <input
                type="number"
                name="jourEmission"
                value={factureRecurrente.jourEmission}
                onChange={handleChange}
                min="1"
                max="28"
                className="w-full p-2 border rounded-md bg-white text-gray-800"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Entre 1 et 28 pour éviter les problèmes avec les mois courts
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nombre de répétitions
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  name="nombreRepetitions"
                  value={
                    factureRecurrente.nombreRepetitions === undefined
                      ? ""
                      : factureRecurrente.nombreRepetitions
                  }
                  onChange={(e) => {
                    const value =
                      e.target.value === ""
                        ? undefined
                        : parseInt(e.target.value);
                    setFactureRecurrente({
                      ...factureRecurrente,
                      nombreRepetitions: value,
                    });
                  }}
                  min="1"
                  placeholder="Illimité"
                  className="w-full p-2 border rounded-md bg-white text-gray-800"
                />
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="illimite"
                    checked={factureRecurrente.nombreRepetitions === undefined}
                    onChange={() => {
                      setFactureRecurrente({
                        ...factureRecurrente,
                        nombreRepetitions:
                          factureRecurrente.nombreRepetitions === undefined
                            ? 12
                            : undefined,
                      });
                    }}
                    className="h-4 w-4"
                  />
                  <label
                    htmlFor="illimite"
                    className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Illimité
                  </label>
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Nombre de factures à générer (laissez vide pour illimité)
              </p>
            </div>

            {factureRecurrente.frequence !== "mensuelle" && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Mois d'émission
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    "Janvier",
                    "Février",
                    "Mars",
                    "Avril",
                    "Mai",
                    "Juin",
                    "Juillet",
                    "Août",
                    "Septembre",
                    "Octobre",
                    "Novembre",
                    "Décembre",
                  ].map((mois, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`mois-${index}`}
                        checked={
                          factureRecurrente.moisEmission?.includes(index) ||
                          false
                        }
                        onChange={() => handleMoisEmissionChange(index)}
                        className="h-4 w-4"
                      />
                      <label
                        htmlFor={`mois-${index}`}
                        className="text-sm text-gray-700 dark:text-gray-300"
                      >
                        {mois}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Montant HT
              </label>
              <input
                type="number"
                name="montantHT"
                value={
                  factureRecurrente.montantHT === 0
                    ? ""
                    : factureRecurrente.montantHT
                }
                onChange={handleChange}
                step="0.01"
                className="w-full p-2 border rounded-md bg-white text-gray-800"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Montant TTC
              </label>
              <input
                type="number"
                name="montantTTC"
                value={
                  factureRecurrente.montantTTC === 0
                    ? ""
                    : factureRecurrente.montantTTC
                }
                onChange={handleChange}
                step="0.01"
                className="w-full p-2 border rounded-md bg-white text-gray-800"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Prochaine émission
              </label>
              <input
                type="date"
                name="prochaineEmission"
                value={
                  factureRecurrente.prochaineEmission
                    .toISOString()
                    .split("T")[0]
                }
                onChange={(e) =>
                  setFactureRecurrente({
                    ...factureRecurrente,
                    prochaineEmission: new Date(e.target.value),
                  })
                }
                className="w-full p-2 border rounded-md bg-white text-gray-800"
                required
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="actif"
                name="actif"
                checked={factureRecurrente.actif}
                onChange={handleChange}
                className="h-4 w-4"
              />
              <label
                htmlFor="actif"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Activer la facturation récurrente
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
              Articles
            </h2>
            <button
              type="button"
              onClick={addArticle}
              className="bg-green-600 text-white py-1 px-3 rounded-md hover:bg-green-700 text-sm"
            >
              + Ajouter un article
            </button>
          </div>

          {factureRecurrente.articles.length === 0 ? (
            <p className="text-gray-500 italic text-sm mb-4">
              Aucun article. Cliquez sur "Ajouter un article" pour commencer.
            </p>
          ) : (
            <div className="space-y-4">
              {factureRecurrente.articles.map((article, index) => (
                <div
                  key={article.id}
                  className="flex flex-wrap items-center gap-2 p-3 border rounded-md bg-gray-50 dark:bg-gray-700"
                >
                  <div className="w-full md:w-5/12">
                    <input
                      type="text"
                      value={article.description}
                      onChange={(e) =>
                        handleArticleChange(
                          index,
                          "description",
                          e.target.value
                        )
                      }
                      placeholder="Description"
                      className="w-full p-2 border rounded-md bg-white text-gray-800"
                    />
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      value={article.quantite === 0 ? "" : article.quantite}
                      onChange={(e) =>
                        handleArticleChange(
                          index,
                          "quantite",
                          e.target.value === "" ? 0 : parseInt(e.target.value)
                        )
                      }
                      placeholder="Qté"
                      className="w-full p-2 border rounded-md bg-white text-gray-800"
                    />
                  </div>
                  <div className="w-32">
                    <input
                      type="number"
                      value={
                        article.prixUnitaireHT === 0
                          ? ""
                          : article.prixUnitaireHT
                      }
                      onChange={(e) =>
                        handleArticleChange(
                          index,
                          "prixUnitaireHT",
                          e.target.value === "" ? 0 : parseFloat(e.target.value)
                        )
                      }
                      placeholder="Prix HT"
                      className="w-full p-2 border rounded-md bg-white text-gray-800"
                    />
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      value={article.tva === 0 ? "" : article.tva}
                      onChange={(e) =>
                        handleArticleChange(
                          index,
                          "tva",
                          e.target.value === "" ? 0 : parseFloat(e.target.value)
                        )
                      }
                      placeholder="TVA %"
                      className="w-full p-2 border rounded-md bg-white text-gray-800"
                    />
                  </div>
                  <div className="w-32 font-medium">
                    {article.totalTTC.toFixed(2)} €
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => removeArticle(article.id)}
                      className="bg-red-600 text-white p-2 rounded-md hover:bg-red-700"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}

              <div className="flex justify-end p-3 font-medium">
                <div className="text-right">
                  <p>Total HT: {factureRecurrente.montantHT.toFixed(2)} €</p>
                  <p>Total TTC: {factureRecurrente.montantTTC.toFixed(2)} €</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="bg-gray-800 text-white px-6 py-2 rounded-md hover:bg-gray-600 flex items-center transform hover:scale-105 transition-transform duration-300"
          >
            <FiSave size={18} className="mr-2" />
            {loading
              ? "Création en cours..."
              : "Créer la facturation récurrente"}
          </button>
        </div>
      </form>
    </div>
  );
}
