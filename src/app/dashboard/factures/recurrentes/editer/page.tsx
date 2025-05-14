"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FiArrowLeft, FiSave, FiTrash2 } from "react-icons/fi";
import { useAuth } from "@/lib/authContext";
import {
  getFactureRecurrente,
  updateFactureRecurrente,
  calculerProchaineEmission,
} from "@/services/factureRecurrenteService";
import { getModelesFacture } from "@/services/modeleFactureService";
import { FactureRecurrente, ModeleFacture } from "@/types/modeleFacture";
import { Client, Article } from "@/types/facture";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

// Composant de chargement
function LoadingState() {
  return (
    <div className="p-6 flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100"></div>
    </div>
  );
}

function FactureRecurrenteEditor() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const factureId = searchParams.get("id");
  const { user } = useAuth();
  const userUid = user?.uid;

  const [formLoading, setFormLoading] = useState(false); // Chargement pour la soumission du formulaire
  const [dataLoading, setDataLoading] = useState(true);  // Chargement pour les données initiales
  const [error, setError] = useState<string | null>(null);

  const [clients, setClients] = useState<Client[]>([]);
  const [modeles, setModeles] = useState<ModeleFacture[]>([]);
  const [factureRecurrente, setFactureRecurrente] = useState<FactureRecurrente | null>(null);
  
  const dataLoadedForCurrentId = useRef(false);
  const prevFactureIdRef = useRef<string | null | undefined>();
  const isCalculatingTotals = useRef(false);
  const [editingCell, setEditingCell] = useState<{ index: number; field: string; rawValue: string } | null>(null);

  useEffect(() => {
    let isEffectActive = true;

    if (factureId !== prevFactureIdRef.current) {
      dataLoadedForCurrentId.current = false;
      prevFactureIdRef.current = factureId;
      if (isEffectActive) {
        setFactureRecurrente(null);
        setClients([]);
        setModeles([]);
        // Laisser la logique ci-dessous gérer setLoadingData(true) si un nouveau fetch est nécessaire
      }
    }

    if (!userUid || !factureId) {
      if (isEffectActive) {
        setError(factureId ? "Utilisateur non authentifié." : "ID de facture récurrente manquant.");
        setDataLoading(false);
      }
      return () => { isEffectActive = false; };
    }

    if (dataLoadedForCurrentId.current) {
      if (isEffectActive) {
         setDataLoading(false); // Assurer que le chargement est terminé
      }
      return () => { isEffectActive = false; };
    }

    const fetchData = async () => {
      if (!isEffectActive) return;
      setDataLoading(true);

      try {
        const [factureDataRes, clientsSnapshot, modelesDataRes] = await Promise.all([
          getFactureRecurrente(factureId),
          getDocs(query(collection(db, "clients"), where("userId", "==", userUid))),
          getModelesFacture(userUid)
        ]);

        if (!isEffectActive) return;
        
        if (!factureDataRes) {
          throw new Error("Facture récurrente introuvable.");
        }
        
        const clientsData = clientsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Client[];

        setClients(clientsData);
        setModeles(modelesDataRes);
        setFactureRecurrente(factureDataRes);
        setError(null);
        dataLoadedForCurrentId.current = true;

      } catch (err) {
        if (!isEffectActive) return;
        console.error("Erreur lors du chargement des données:", err);
        setError(err instanceof Error ? `Erreur: ${err.message}` : "Une erreur est survenue.");
        dataLoadedForCurrentId.current = false; 
      } finally {
        if (isEffectActive) {
          setDataLoading(false);
        }
      }
    };

    fetchData();
    
    return () => {
      isEffectActive = false;
    };
  }, [userUid, factureId]);

  const calculerTotaux = useCallback((articles: Article[]) => {
    if (isCalculatingTotals.current) return null;
    isCalculatingTotals.current = true;
    try {
      const articlesValides = articles.filter(a => !a.isComment);
      const totalHT = articlesValides.reduce(
        (sum, article) => sum + (article.prixUnitaireHT * article.quantite),
        0
      );
      const totalTVA = articlesValides.reduce((sum, article) => {
        const articleHT = article.prixUnitaireHT * article.quantite;
        const articleTVA = (articleHT * article.tva) / 100;
        return sum + articleTVA;
      }, 0);
      const totalTTC = totalHT + totalTVA;
      return {
        montantHT: Number(totalHT.toFixed(2)),
        montantTTC: totalTTC, // totalTTC n'est pas arrondi ici pour précision
      };
    } finally {
      isCalculatingTotals.current = false;
    }
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      if (!factureRecurrente) return;
      const { name, value } = e.target;
      let updatedFacture = { ...factureRecurrente };

      if (name === "jourEmission") {
        const jour = Math.min(Math.max(1, parseInt(value) || 1), 28);
        updatedFacture.jourEmission = jour;
        updatedFacture.prochaineEmission = calculerProchaineEmission(
          updatedFacture.frequence, jour, updatedFacture.moisEmission
        );
      } else if (name === "frequence") {
        const freqValue = value as FactureRecurrente['frequence'];
        if (["mensuelle", "trimestrielle", "semestrielle", "annuelle"].includes(freqValue)) {
          updatedFacture.frequence = freqValue;
          updatedFacture.prochaineEmission = calculerProchaineEmission(
            freqValue, updatedFacture.jourEmission, updatedFacture.moisEmission
          );
        }
      } else if (name === "montantHT") {
        const montantHT = value === "" ? 0 : parseFloat(value);
        updatedFacture.montantHT = montantHT;
        updatedFacture.montantTTC = montantHT * 1.2; // TODO: Use actual TVA from articles or config
      } else if (name === "montantTTC") {
        const montantTTC = value === "" ? 0 : parseFloat(value);
        updatedFacture.montantTTC = montantTTC;
        updatedFacture.montantHT = montantTTC / 1.2; // TODO: Use actual TVA
      } else if (name === "actif") {
        updatedFacture.actif = (e.target as HTMLInputElement).checked;
      } else if (name === "nombreRepetitions") {
        updatedFacture.nombreRepetitions = value === "" ? undefined : parseInt(value, 10);
      } else if (name === "clientId" || name === "modeleId") {
        (updatedFacture as any)[name] = value;
      }
      setFactureRecurrente(updatedFacture);
    },
    [factureRecurrente] 
  );

  const handleMoisEmissionChange = useCallback((mois: number) => {
    if (!factureRecurrente) return;
    const updatedFacture = { ...factureRecurrente };
    const currentMois = [...(updatedFacture.moisEmission || [])];
    let nouveauxMois: number[];
    if (currentMois.includes(mois)) {
      nouveauxMois = currentMois.filter((m) => m !== mois);
    } else {
      nouveauxMois = [...currentMois, mois].sort((a, b) => a - b);
    }
    updatedFacture.moisEmission = nouveauxMois;
    updatedFacture.prochaineEmission = calculerProchaineEmission(
      updatedFacture.frequence, updatedFacture.jourEmission, nouveauxMois
    );
    setFactureRecurrente(updatedFacture);
  }, [factureRecurrente]);

  const updateFactureTotals = (articles: Article[]) => {
    if (!factureRecurrente) return factureRecurrente;
    const totals = calculerTotaux(articles);
    return {
      ...factureRecurrente,
      articles,
      montantHT: totals?.montantHT ?? factureRecurrente.montantHT,
      montantTTC: totals?.montantTTC ?? factureRecurrente.montantTTC,
    };
  };

  const addArticle = useCallback(() => {
    if (!factureRecurrente) return;
    const newArticle: Article = {
      id: Date.now(), description: "", quantite: 1, prixUnitaireHT: 0, tva: 20, totalTTC: 0, isComment: false,
    };
    const newArticles = [...factureRecurrente.articles, newArticle];
    setFactureRecurrente(prevFacture => {
      if (!prevFacture) return null;
      const totals = calculerTotaux(newArticles);
      return {
        ...prevFacture,
        articles: newArticles,
        montantHT: totals?.montantHT ?? prevFacture.montantHT,
        montantTTC: totals?.montantTTC ?? prevFacture.montantTTC,
      };
    });
  }, [factureRecurrente, calculerTotaux]);

  const handleArticleInputChange = useCallback((index: number, field: string, rawValue: string) => {
    setEditingCell({ index, field, rawValue });
  }, []);

  const handleArticleInputBlur = useCallback((index: number, field: string) => {
    if (!editingCell || editingCell.index !== index || editingCell.field !== field) {
      // Pas la cellule en cours d'édition, ou pas de cellule en édition
      return;
    }

    const { rawValue } = editingCell;
    setEditingCell(null); // Important: réinitialiser avant de mettre à jour l'état principal pour éviter les boucles

    setFactureRecurrente(prevFacture => {
      if (!prevFacture) return null;

      const updatedArticles = prevFacture.articles.map((art, i) => {
        if (i === index) {
          const article = { ...art };
          const normalizedValueStr = String(rawValue).replace(',', '.');
          let valueToParse = normalizedValueStr; // Utilisez normalizedValueStr pour le parsing
          if(rawValue === "") valueToParse = "0"; // Si l'utilisateur vide le champ, traiter comme 0

          if (field === "quantite") {
            const parsedVal = parseInt(valueToParse, 10);
            article.quantite = (isNaN(parsedVal) || !isFinite(parsedVal)) ? art.quantite : parsedVal;
          } else if (field === "prixUnitaireHT") {
            const parsedVal = parseFloat(valueToParse);
            article.prixUnitaireHT = (isNaN(parsedVal) || !isFinite(parsedVal)) ? art.prixUnitaireHT : parsedVal;
          } else if (field === "tva") {
            const parsedVal = parseFloat(valueToParse);
            article.tva = (isNaN(parsedVal) || !isFinite(parsedVal)) ? art.tva : parsedVal;
          } else if (field === "description") {
            article.description = rawValue;
          } else if (field === "prixTTC") { // L'utilisateur a modifié P.U. TTC
            const parsedPUnitTTC = parseFloat(valueToParse);
            
            if (isNaN(parsedPUnitTTC) || !isFinite(parsedPUnitTTC)) {
              article.prixUnitaireHT = art.prixUnitaireHT;
            } else {
              const tvaRate = article.tva || 0;
              if ((1 + (tvaRate / 100)) === 0) {
                article.prixUnitaireHT = art.prixUnitaireHT;
              } else {
                const calculatedPUHT = parsedPUnitTTC / (1 + (tvaRate / 100));
                article.prixUnitaireHT = isFinite(calculatedPUHT) ? calculatedPUHT : 0;
              }
            }
          }
          // isComment n'est généralement pas un input direct de ce type, mais via un checkbox

          // Recalculer totalTTC de la ligne après chaque modification
          if (!article.isComment) {
            const currentPUHT = article.prixUnitaireHT;
            const currentQte = article.quantite;
            const currentTVA = article.tva;
            const totalHTLigne = currentPUHT * currentQte;
            const tvaAmount = (totalHTLigne * currentTVA) / 100;
            article.totalTTC = Number((totalHTLigne + tvaAmount).toFixed(2));
          } else {
            article.totalTTC = 0;
          }
          return article;
        }
        return art;
      });

      const totals = calculerTotaux(updatedArticles);
      return {
        ...prevFacture,
        articles: updatedArticles,
        montantHT: totals?.montantHT ?? prevFacture.montantHT,
        montantTTC: totals?.montantTTC ?? prevFacture.montantTTC,
      };
    });
  }, [editingCell, calculerTotaux]);

  const removeArticle = useCallback((index: number) => {
    setFactureRecurrente(prevFacture => {
      if (!prevFacture) return null;
      const newArticles = prevFacture.articles.filter((_, i) => i !== index);
      const totals = calculerTotaux(newArticles);
      return {
        ...prevFacture,
        articles: newArticles,
        montantHT: totals?.montantHT ?? prevFacture.montantHT,
        montantTTC: totals?.montantTTC ?? prevFacture.montantTTC,
      };
    });
  }, [calculerTotaux]);

  const addComment = useCallback(() => {
    const newComment: Article = {
      id: Date.now(), description: "", quantite: 0, prixUnitaireHT: 0, tva: 0, totalTTC: 0, isComment: true,
    };
    setFactureRecurrente(prevFacture => {
      if (!prevFacture) return null;
      return {
        ...prevFacture,
        articles: [...prevFacture.articles, newComment],
      };
    });
  }, [calculerTotaux]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !factureRecurrente) {
      setError("Données invalides.");
      return;
    }
    setFormLoading(true);
    setError(null);
    try {
      if (!factureRecurrente.clientId) throw new Error("Client requis.");
      if (!factureRecurrente.modeleId) throw new Error("Modèle requis.");
      if (factureRecurrente.articles.length === 0 && !factureRecurrente.articles.some(a => a.isComment)) {
        // Permettre des factures avec uniquement des commentaires si c'est voulu, sinon ajouter condition
         throw new Error("Au moins un article est requis.");
      }

      let prochaineEmissionDate = new Date(factureRecurrente.prochaineEmission);
      prochaineEmissionDate.setDate(factureRecurrente.jourEmission);
      if (prochaineEmissionDate.getDate() !== factureRecurrente.jourEmission) {
        prochaineEmissionDate = new Date(prochaineEmissionDate.getFullYear(), prochaineEmissionDate.getMonth() + 1, 0);
      }

      const factureToUpdate = {
        ...factureRecurrente,
        prochaineEmission: prochaineEmissionDate
      };

      await updateFactureRecurrente(factureRecurrente.id, factureToUpdate);
      router.push("/dashboard/factures/recurrentes");
    } catch (err) {
      console.error("Erreur handleSubmit:", err);
      setError(err instanceof Error ? `Erreur: ${err.message}` : "Erreur de sauvegarde.");
    } finally {
      setFormLoading(false);
    }
  }, [factureRecurrente, user, router]);

  if (dataLoading) {
    return <LoadingState />;
  }

  if (error && !factureRecurrente) { // Erreur critique empêchant l'affichage du formulaire
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-semibold">Édition Facture Récurrente</h1>
          <button onClick={() => router.back()} className="bg-gray-600 text-white py-2 px-4 rounded-md">Retour</button>
        </div>
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
          <p>{error}</p>
        </div>
      </div>
    );
  }
  
  if (!factureRecurrente) { // Si toujours pas de facture après chargement (sans erreur bloquante)
    return (
         <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-4xl font-semibold">Édition Facture Récurrente</h1>
              <button onClick={() => router.back()} className="bg-gray-600 text-white py-2 px-4 rounded-md">Retour</button>
            </div>
            <p>Facture récurrente non trouvée ou en cours de chargement...</p>
        </div>
    );
  }

  return (
    <div className="p-6 bg-background-light dark:bg-background-dark">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-semibold text-gray-800 dark:text-white">
          🔄 Édition Facturation Récurrente
        </h1>
        <button
          onClick={() => router.back()}
          className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-800 flex items-center transform hover:scale-105 transition-transform duration-300"
        >
          <FiArrowLeft size={18} className="mr-2" /> Retour
        </button>
      </div>

      {error && ( // Erreurs non critiques (ex: soumission formulaire)
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
              <label htmlFor="clientId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client</label>
              <select id="clientId" name="clientId" value={factureRecurrente.clientId} onChange={handleChange} className="w-full p-2 border rounded-md bg-white text-gray-800" required >
                <option value="">Sélectionnez un client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}> {client.refClient} - {client.nom} </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="modeleId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Modèle de facture</label>
              <select id="modeleId" name="modeleId" value={factureRecurrente.modeleId} onChange={handleChange} className="w-full p-2 border rounded-md bg-white text-gray-800" required >
                <option value="">Sélectionnez un modèle</option>
                {modeles.map((modele) => (
                  <option key={modele.id} value={modele.id}> {modele.nom} {modele.actif ? "(Par défaut)" : ""} </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="frequence" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fréquence</label>
              <select id="frequence" name="frequence" value={factureRecurrente.frequence} onChange={handleChange} className="w-full p-2 border rounded-md bg-white text-gray-800" required >
                <option value="mensuelle">Mensuelle</option>
                <option value="trimestrielle">Trimestrielle</option>
                <option value="semestrielle">Semestrielle</option>
                <option value="annuelle">Annuelle</option>
              </select>
            </div>
            <div>
              <label htmlFor="jourEmission" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Jour d'émission</label>
              <input id="jourEmission" type="number" name="jourEmission" value={factureRecurrente.jourEmission} onChange={handleChange} min="1" max="28" className="w-full p-2 border rounded-md bg-white text-gray-800" required />
              <p className="text-xs text-gray-500 mt-1">1-28 pour éviter soucis mois courts.</p>
            </div>
            <div>
              <label htmlFor="nombreRepetitions" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Répétitions</label>
              <div className="flex items-center space-x-2">
                <input id="nombreRepetitions" type="number" name="nombreRepetitions" value={factureRecurrente.nombreRepetitions === undefined ? "" : String(factureRecurrente.nombreRepetitions)} onChange={handleChange} min="1" placeholder="Illimité" className="w-full p-2 border rounded-md bg-white text-gray-800" />
                <input type="checkbox" id="illimite" checked={factureRecurrente.nombreRepetitions === undefined} onChange={() => {
                    const isIllimite = factureRecurrente.nombreRepetitions === undefined;
                    setFactureRecurrente(prev => prev ? {...prev, nombreRepetitions: isIllimite ? 12 : undefined} : null);
                  }} className="h-4 w-4" />
                <label htmlFor="illimite" className="text-sm text-gray-700 dark:text-gray-300">Illimité</label>
              </div>
              {factureRecurrente.repetitionsEffectuees !== undefined && factureRecurrente.repetitionsEffectuees > 0 && (
                <p className="text-sm text-blue-600 mt-1">{factureRecurrente.repetitionsEffectuees} émission(s) déjà faite(s).</p>
              )}
            </div>
            {factureRecurrente.frequence !== "mensuelle" && (
              <div className="col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mois d'émission</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {["Janv", "Févr", "Mars", "Avril", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"].map((mois, index) => (
                    <div key={index} className="flex items-center">
                      <input type="checkbox" id={`mois-${index}`} checked={factureRecurrente.moisEmission?.includes(index) || false} onChange={() => handleMoisEmissionChange(index)} className="h-4 w-4 mr-1" />
                      <label htmlFor={`mois-${index}`} className="text-sm text-gray-700 dark:text-gray-300">{mois}</label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label htmlFor="prochaineEmission" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prochaine émission</label>
              <input id="prochaineEmission" type="date" name="prochaineEmission" value={
                  factureRecurrente.prochaineEmission instanceof Date
                    ? factureRecurrente.prochaineEmission.toISOString().split("T")[0]
                    : new Date().toISOString().split("T")[0] // Fallback si ce n'est pas une instance de Date valide
                }
                onChange={(e) => {
                  try {
                    const dateValue = e.target.value;
                    const [year, month, day] = dateValue.split('-').map(Number);
                    const newDate = new Date(year, month - 1, day, 12, 0, 0);
                    if (isNaN(newDate.getTime())) throw new Error("Date invalide");
                    setFactureRecurrente(prev => prev ? {...prev, prochaineEmission: newDate } : null);
                  } catch (error) { console.error(error); }
                }}
                className="w-full p-2 border rounded-md bg-white text-gray-800" required />
            </div>
             <div className="flex items-center space-x-2 pt-4">
                <input type="checkbox" id="actif" name="actif" checked={factureRecurrente.actif} onChange={handleChange} className="h-4 w-4"/>
                <label htmlFor="actif" className="text-sm font-medium text-gray-700 dark:text-gray-300">Activer la facturation récurrente</label>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Articles</h2>
            <div className="space-x-2">
              <button type="button" onClick={addArticle} className="bg-green-600 text-white py-1 px-3 rounded-md hover:bg-green-700 text-sm"> + Article </button>
              <button type="button" onClick={addComment} className="bg-blue-600 text-white py-1 px-3 rounded-md hover:bg-blue-700 text-sm"> + Commentaire </button>
            </div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 mb-4 rounded-md text-sm">
            <p className="text-blue-700 dark:text-blue-300"><strong>Astuce:</strong> Pour un abonnement, vous pouvez saisir le prix TTC directement, le HT sera calculé.</p>
          </div>

          {factureRecurrente.articles.length === 0 ? (
            <p className="text-gray-500 italic text-sm">Aucun article ou commentaire.</p>
          ) : (
            <div className="space-y-4">
              <div className="hidden md:grid md:grid-cols-12 gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 px-3 py-1 border-b">
                <div className="col-span-4">Description</div>
                <div className="col-span-1 text-right">Qté</div>
                <div className="col-span-2 text-right">P.U. HT</div>
                <div className="col-span-2 text-right">P.U. TTC</div>
                <div className="col-span-1 text-right">TVA %</div>
                <div className="col-span-2 text-right">Total TTC</div>
              </div>
              {factureRecurrente.articles.map((article, index) => {
                const isEditingPuht = editingCell && editingCell.index === index && editingCell.field === "prixUnitaireHT";
                const puhtDisplayValue = isEditingPuht 
                  ? editingCell.rawValue 
                  : (article.prixUnitaireHT === 0 ? "" : article.prixUnitaireHT.toFixed(2));

                const isEditingPuttc = editingCell && editingCell.index === index && editingCell.field === "prixTTC";
                const calculatedPUnitTTC = article.prixUnitaireHT * (1 + (article.tva || 0) / 100);
                const puttcDisplayValue = isEditingPuttc 
                  ? editingCell.rawValue 
                  : (article.prixUnitaireHT === 0 ? "" : calculatedPUnitTTC.toFixed(2));
                
                const isEditingQte = editingCell && editingCell.index === index && editingCell.field === "quantite";
                const qteDisplayValue = isEditingQte
                  ? editingCell.rawValue
                  : (article.quantite === 0 ? "" : String(article.quantite));

                const isEditingTva = editingCell && editingCell.index === index && editingCell.field === "tva";
                const tvaDisplayValue = isEditingTva
                  ? editingCell.rawValue
                  : (article.tva === 0 ? "" : String(article.tva));

                return (
                  <div key={article.id || index} className={`p-3 rounded-md ${article.isComment ? "bg-yellow-50 dark:bg-yellow-900/30" : "bg-gray-50 dark:bg-gray-700/30"}`}>
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium text-gray-800 dark:text-white">{article.isComment ? "Commentaire" : `Article ${index + 1}`}</h3>
                      <button type="button" onClick={() => removeArticle(index)} className="text-red-500 hover:text-red-700"><FiTrash2 size={16} /></button>
                    </div>
                    <div>
                      <label htmlFor={`desc-${index}`} className="sr-only">Description</label>
                      <input id={`desc-${index}`} type="text" value={article.description} onChange={(e) => handleArticleInputChange(index, "description", e.target.value)} onBlur={() => handleArticleInputBlur(index, "description")} placeholder={article.isComment ? "Votre commentaire..." : "Description de l'article..."} className="w-full p-2 border rounded-md bg-white text-gray-800 text-sm mb-2"/>
                    </div>
                    {!article.isComment && (
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
                        <div>
                          <label htmlFor={`qte-${index}`} className="block text-xs font-medium text-gray-600 dark:text-gray-400">Qté</label>
                          <input id={`qte-${index}`} type="text" inputMode="decimal" value={qteDisplayValue} onChange={(e) => handleArticleInputChange(index, "quantite", e.target.value)} onBlur={() => handleArticleInputBlur(index, "quantite")} className="w-full p-2 border rounded-md bg-white text-gray-800 text-sm"/>
                        </div>
                        <div>
                          <label htmlFor={`puht-${index}`} className="block text-xs font-medium text-gray-600 dark:text-gray-400">P.U. HT</label>
                          <input id={`puht-${index}`} type="text" inputMode="decimal" value={puhtDisplayValue} onChange={(e) => handleArticleInputChange(index, "prixUnitaireHT", e.target.value)} onBlur={() => handleArticleInputBlur(index, "prixUnitaireHT")} className="w-full p-2 border rounded-md bg-white text-gray-800 text-sm"/>
                        </div>
                        <div>
                          <label htmlFor={`puttc-${index}`} className="block text-xs font-medium text-gray-600 dark:text-gray-400">P.U. TTC</label>
                          <input id={`puttc-${index}`} type="text" inputMode="decimal" value={puttcDisplayValue} onChange={(e) => handleArticleInputChange(index, "prixTTC", e.target.value)} onBlur={() => handleArticleInputBlur(index, "prixTTC")} className="w-full p-2 border rounded-md bg-blue-100 dark:bg-blue-800 text-gray-800 dark:text-white text-sm"/>
                        </div>
                        <div>
                          <label htmlFor={`tva-${index}`} className="block text-xs font-medium text-gray-600 dark:text-gray-400">TVA %</label>
                          <input id={`tva-${index}`} type="text" inputMode="decimal" value={tvaDisplayValue} onChange={(e) => handleArticleInputChange(index, "tva", e.target.value)} onBlur={() => handleArticleInputBlur(index, "tva")} className="w-full p-2 border rounded-md bg-white text-gray-800 text-sm"/>
                        </div>
                        <div className="text-right pt-5">
                          <p className="text-sm font-semibold text-gray-800 dark:text-white">{(article.totalTTC || 0).toFixed(2)} €</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
           {factureRecurrente.articles.length > 0 && (
            <div className="mt-6 border-t pt-4">
              <div className="flex justify-end items-center mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Total HT:</span>
                <span className="text-sm font-semibold text-gray-800 dark:text-white">{factureRecurrente.montantHT.toFixed(2)} €</span>
              </div>
              <div className="flex justify-end items-center mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">Total TVA:</span>
                <span className="text-sm font-semibold text-gray-800 dark:text-white">{(factureRecurrente.montantTTC - factureRecurrente.montantHT).toFixed(2)} €</span>
              </div>
              <div className="flex justify-end items-center">
                <span className="text-lg font-bold text-gray-700 dark:text-gray-300 mr-2">Total TTC:</span>
                <span className="text-lg font-bold text-gray-800 dark:text-white">{factureRecurrente.montantTTC.toFixed(2)} €</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button type="submit" disabled={formLoading} className="bg-gray-800 text-white px-6 py-3 rounded-md hover:bg-gray-600 flex items-center transform hover:scale-105 transition-transform duration-300 text-base">
            <FiSave size={20} className="mr-2" />
            {formLoading ? "Sauvegarde..." : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function EditerFactureRecurrentePage() {
  const [shouldRender, setShouldRender] = useState(false);
  
  useEffect(() => {
    // Un délai court (ex: 50ms) peut parfois aider avec des Suspense/issues de rendu initiales complexes
    // mais l'objectif est d'avoir des composants robustes qui n'en ont pas besoin.
    // Si le problème persiste, ce délai peut être enlevé pour investiguer plus à fond.
    const timer = setTimeout(() => {
      setShouldRender(true);
    }, 50); 
    
    return () => clearTimeout(timer);
  }, []);
  
  if (!shouldRender) {
    return <LoadingState />;
  }
  
  return <FactureRecurrenteEditor />;
}
