"use client";
import React, { createContext, useContext, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Facture, Article } from '@/types/facture';
import { useAuth } from './authContext';
import { DelaiPaiementType } from "@/services/delaisPaiementService";
import { mettreAJourMontantsFacture } from "@/services/paiementService";

// Type pour le contexte
interface FactureContextType {
  factureData: { [key: string]: Facture };
  loadFacture: (factureId: string) => Promise<Facture | null>;
  loading: boolean;
  error: string | null;
}

// Valeur par défaut du contexte
const defaultContext: FactureContextType = {
  factureData: {},
  loadFacture: async () => null,
  loading: false,
  error: null
};

// Créer le contexte
const FactureContext = createContext<FactureContextType>(defaultContext);

// Hook pour utiliser le contexte
export const useFacture = () => {
  return useContext(FactureContext);
};

// Fonction utilitaire pour convertir une date Firestore
const convertDate = (date: any): Date => {
  if (!date) return new Date();

  if (date instanceof Date) {
    return date;
  }

  if (typeof date === 'string') {
    return new Date(date);
  }

  if (date && typeof date.toDate === 'function') {
    return date.toDate();
  }

  return new Date();
};

// Fournisseur de contexte
export const FactureProvider = ({ children }: { children: React.ReactNode }) => {
  const [factureData, setFactureData] = useState<{ [key: string]: Facture }>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Fonction pour charger une facture
  const loadFacture = async (factureId: string): Promise<Facture | null> => {
    // Si la facture est déjà en cache, la retourner
    if (factureData[factureId]) {
      console.log("[CACHE] Utilisation de la facture en cache:", factureId);
      return factureData[factureId];
    }

    // Si l'utilisateur n'est pas connecté, renvoyer null
    if (!user) {
      setError("Utilisateur non connecté");
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("[PROVIDER] Chargement de la facture:", factureId);

      const factureRef = doc(db, "factures", factureId);
      const factureDoc = await getDoc(factureRef);

      if (!factureDoc.exists()) {
        setError("Facture introuvable");
        setLoading(false);
        return null;
      }

      const data = factureDoc.data();

      // Vérifier que l'utilisateur est le propriétaire
      if (data.userId !== user.uid) {
        setError("Vous n'êtes pas autorisé à consulter cette facture");
        setLoading(false);
        return null;
      }

      // Convertir et normaliser les données
      let dateCreation = convertDate(data.dateCreation);

      // Normaliser le client
      const defaultClient = {
        id: "",
        nom: "Client sans nom",
        refClient: "",
        rue: "",
        codePostal: "",
        ville: "",
        email: "",
        emails: [],
        delaisPaiement: "30 jours" as DelaiPaiementType
      };

      const client = data.client ? {
        ...defaultClient,
        ...data.client,
        emails: Array.isArray(data.client.emails) ? data.client.emails : []
      } : defaultClient;

      // Normaliser les articles
      const articles = !data.articles || !Array.isArray(data.articles)
        ? []
        : data.articles.map((article: any, index: number) => {
          if (article.isComment) {
            return {
              id: article.id || Date.now() + index,
              description: article.description || "Commentaire",
              quantite: 0,
              prixUnitaireHT: 0,
              tva: 0,
              totalTTC: 0,
              isComment: true
            };
          }

          const prixUnitaireHT = typeof article.prixUnitaireHT === 'number' ? article.prixUnitaireHT : 0;
          const quantite = typeof article.quantite === 'number' ? article.quantite : 0;
          const tva = typeof article.tva === 'number' ? article.tva : 20;

          const totalHT = prixUnitaireHT * quantite;
          const totalTVA = (totalHT * tva) / 100;
          const totalTTC = totalHT + totalTVA;

          return {
            id: article.id || Date.now() + index,
            description: article.description || `Article ${index + 1}`,
            quantite: quantite,
            prixUnitaireHT: prixUnitaireHT,
            tva: tva,
            totalTTC: totalTTC,
            isComment: false
          };
        });

      // Calculer les totaux
      const totalHT = articles
        .filter((a: Article) => !a.isComment)
        .reduce((sum: number, article: Article) => sum + (article.prixUnitaireHT * article.quantite), 0);

      const totalTTC = articles
        .filter((a: Article) => !a.isComment)
        .reduce((sum: number, article: Article) => sum + article.totalTTC, 0);

      // Construire l'objet facture
      const facture: Facture = {
        id: factureDoc.id,
        userId: data.userId,
        numero: data.numero || "Facture sans numéro",
        statut: data.statut || "En attente",
        client,
        articles,
        totalHT: data.totalHT || totalHT,
        totalTTC: data.totalTTC || totalTTC,
        dateCreation,
        paiements: data.paiements ? data.paiements.map((p: any) => ({
          ...p,
          datePaiement: p.datePaiement?.toDate ? p.datePaiement.toDate() : new Date(p.datePaiement || Date.now())
        })) : [],
        montantPaye: data.montantPaye || 0,
        resteAPayer: data.resteAPayer || data.totalTTC || totalTTC
      };

      // Mettre à jour les montants calculés
      const factureAvecMontants = mettreAJourMontantsFacture(facture);

      // Mettre à jour le cache
      setFactureData(prev => ({
        ...prev,
        [factureId]: factureAvecMontants
      }));

      setLoading(false);
      return factureAvecMontants;
    } catch (error) {
      console.error("[PROVIDER] Erreur lors du chargement de la facture:", error);
      setError("Erreur lors du chargement de la facture");
      setLoading(false);
      return null;
    }
  };

  // Valeur du contexte
  const contextValue: FactureContextType = {
    factureData,
    loadFacture,
    loading,
    error
  };

  return (
    <FactureContext.Provider value={contextValue}>
      {children}
    </FactureContext.Provider>
  );
}; 