"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiSave, FiTrash2 } from "react-icons/fi";
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

        // Le calcul de la prochaine émission se fera automatiquement
        // dans le second useEffect quand factureRecurrente sera mis à jour
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
  }, [user, router]);

  // UseEffect dédié au calcul de prochaine émission à chaque changement des propriétés pertinentes
  useEffect(() => {
    if (factureRecurrente.frequence && factureRecurrente.jourEmission) {
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
      quantite: 1,
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
    const article = { ...updatedArticles[index] };
    
    // Cas spécial pour le champ totalTTC personnalisé qui n'existe pas dans le modèle Article standard
    if (field === "prixTTC") {
      // Calcul inverse: du TTC vers le HT
      const prixTTC = value === "" ? 0 : parseFloat(Number(value).toFixed(2));
      const tva = article.tva || 20;
      const prixHT = Number((prixTTC / (1 + (tva / 100))).toFixed(2));
      
      article.prixUnitaireHT = prixHT;
      article.totalTTC = Number((prixTTC * article.quantite).toFixed(2));
      
      updatedArticles[index] = article;
    } else if (field === "prixUnitaireHT") {
      // Limiter à 2 décimales
      const prixHT = value === "" ? 0 : parseFloat(Number(value).toFixed(2));
      article.prixUnitaireHT = prixHT;
      
      // Ne pas calculer les totaux pour les lignes de commentaire
      if (!article.isComment) {
        const tva = article.tva || 20;
        const totalHT = prixHT * article.quantite;
        const tvaAmount = (totalHT * tva) / 100;
        article.totalTTC = Number((totalHT + tvaAmount).toFixed(2));
      }
      
      updatedArticles[index] = article;
    } else {
      // Traitement normal pour les autres champs
      article[field] = value;
      updatedArticles[index] = article;
      
      // Ne pas calculer les totaux pour les lignes de commentaire
      if (!article.isComment) {
        // Calcul standard du HT vers le TTC
        if (field === "quantite" || field === "tva") {
          const prixHT = article.prixUnitaireHT * article.quantite;
          const tvaAmount = (prixHT * article.tva) / 100;
          article.totalTTC = Number((prixHT + tvaAmount).toFixed(2));
        }
      }
    }
    
    setFactureRecurrente({
      ...factureRecurrente,
      articles: updatedArticles,
    });

    // Mettre à jour les montants totaux
    calculerTotaux(updatedArticles);
  };

  // Suppression d'un article
  const removeArticle = (index: number) => {
    const updatedArticles = [...factureRecurrente.articles];
    updatedArticles.splice(index, 1);

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

    const totalTVA = articlesValides.reduce((sum, article) => {
      const articleHT = article.prixUnitaireHT * article.quantite;
      const articleTVA = (articleHT * article.tva) / 100;
      return sum + articleTVA;
    }, 0);

    const totalTTC = Number((totalHT + totalTVA).toFixed(2));

    setFactureRecurrente((prev) => ({
      ...prev,
      montantHT: Number(totalHT.toFixed(2)),
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
            <div className="space-x-2">
              <button
                type="button"
                onClick={addArticle}
                className="bg-green-600 text-white py-1 px-3 rounded-md hover:bg-green-700 text-sm"
              >
                + Ajouter un article
              </button>
              <button
                type="button"
                onClick={() => {
                  const newComment: Article = {
                    id: Date.now(),
                    description: "",
                    quantite: 0,
                    prixUnitaireHT: 0,
                    tva: 0,
                    totalTTC: 0,
                    isComment: true,
                  };
                  
                  setFactureRecurrente({
                    ...factureRecurrente,
                    articles: [...factureRecurrente.articles, newComment],
                  });
                }}
                className="bg-blue-600 text-white py-1 px-3 rounded-md hover:bg-blue-700 text-sm"
              >
                + Ajouter un commentaire
              </button>
            </div>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 mb-4 rounded-md text-sm">
            <p className="text-blue-700 dark:text-blue-300">
              <strong>Astuce :</strong> Pour les abonnements, il est généralement plus simple de saisir directement le prix TTC puis de laisser l'application calculer le prix HT et la TVA.
            </p>
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
                  className={`p-4 rounded-md ${
                    article.isComment
                      ? "bg-yellow-50 dark:bg-yellow-900/20"
                      : "bg-gray-50 dark:bg-gray-700/30"
                  }`}
                >
                  <div className="flex justify-between mb-2">
                    <div className="font-medium">
                      {article.isComment ? "Commentaire" : `Article ${index + 1}`}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeArticle(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <FiTrash2 size={18} />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {article.isComment ? "Commentaire" : "Description"}
                      </label>
                      <input
                        type="text"
                        value={article.description}
                        onChange={(e) =>
                          handleArticleChange(index, "description", e.target.value)
                        }
                        placeholder={
                          article.isComment ? "Votre commentaire" : "Description"
                        }
                        className="w-full p-2 border rounded-md bg-white text-gray-800"
                      />
                    </div>

                    {!article.isComment && (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Quantité
                          </label>
                          <input
                            type="number"
                            value={article.quantite === 0 ? "" : article.quantite}
                            onChange={(e) =>
                              handleArticleChange(
                                index,
                                "quantite",
                                e.target.value === ""
                                  ? 0
                                  : parseInt(e.target.value)
                              )
                            }
                            placeholder="Quantité"
                            min="1"
                            className="w-full p-2 border rounded-md bg-white text-gray-800"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Prix unitaire HT
                          </label>
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
                            step="0.01"
                            className="w-full p-2 border rounded-md bg-white text-gray-800"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Prix unitaire TTC
                          </label>
                          <input
                            type="number"
                            value={
                              article.prixUnitaireHT === 0
                                ? ""
                                : Number((article.prixUnitaireHT * (1 + article.tva / 100)).toFixed(2))
                            }
                            onChange={(e) =>
                              handleArticleChange(
                                index,
                                "prixTTC",
                                e.target.value === "" ? 0 : parseFloat(e.target.value)
                              )
                            }
                            placeholder="Prix TTC"
                            step="0.01"
                            className="w-full p-2 border rounded-md bg-blue-500 text-white dark:bg-blue-700 dark:text-white font-semibold"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            TVA (%)
                          </label>
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
                            placeholder="TVA"
                            step="0.1"
                            className="w-full p-2 border rounded-md bg-white text-gray-800"
                          />
                        </div>
                      </div>
                    )}

                    {!article.isComment && (
                      <div className="mt-3 text-right text-sm font-semibold">
                        <span className="text-gray-700 dark:text-gray-300">
                          Total HT: {(article.prixUnitaireHT * article.quantite).toFixed(2)} € | 
                          Total TTC: {article.totalTTC.toFixed(2)} €
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Affichage des totaux */}
              <div className="mt-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                <div className="flex justify-between border-b pb-2 mb-2">
                  <span className="font-medium">Total HT</span>
                  <span>{factureRecurrente.montantHT.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between border-b pb-2 mb-2">
                  <span className="font-medium">Total TVA</span>
                  <span>{(factureRecurrente.montantTTC - factureRecurrente.montantHT).toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total TTC</span>
                  <span>{factureRecurrente.montantTTC.toFixed(2)} €</span>
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
