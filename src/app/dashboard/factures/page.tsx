"use client";
import React, { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
  query,
  where,
  getDoc,
  Timestamp,
  getDocs,
  limit,
  startAfter,
  orderBy,
} from "firebase/firestore";
import {
  FiArrowLeft,
  FiEdit,
  FiTrash2,
  FiFileText,
  FiX,
  FiEye,
  FiRefreshCw,
  FiMail,
  FiMenu,
} from "react-icons/fi";
import { useRouter } from "next/navigation";
import { Facture, Client } from "@/types/facture";
import {
  generateInvoicePDF,
  generateInvoicePDFWithSelectedTemplate,
} from "@/services/pdfGenerator";
import { useAuth } from "@/lib/authContext";
import { FirestoreTimestamp } from "@/types/facture";
import { ModeleFacture } from "@/types/modeleFacture";
import { getModelesFacture } from "@/services/modeleFactureService";
import { getUserPlan, checkPlanLimit } from "@/services/subscriptionService";
import { convertToDate } from "@/services/factureService";
import { DelaiPaiementType, calculerDateEcheance } from "@/services/delaisPaiementService";
import { getCouleurStatut, mettreAJourMontantsFacture, formaterMontant, getTexteCourtStatut, getCouleurStatutInline } from "@/services/paiementService";
import GestionPaiements from "@/components/GestionPaiements";
import { useFacture } from "@/lib/factureProvider";
import { useModal } from "@/hooks/useModal";
import ModalManager from "@/components/ui/ModalManager";

// Classes Tailwind pour les statuts - à conserver pour le build
// bg-green-500 bg-amber-500 bg-orange-500 bg-yellow-500 bg-blue-500 bg-red-500 bg-gray-500

// Fonction pour générer un nouveau numéro de facture
const generateNewInvoiceNumber = (factures: Facture[] = []): string => {
  // Obtenir l'année courante
  const currentYear = new Date().getFullYear();

  // Trouver le numéro de séquence le plus élevé en analysant tous les formats existants
  let maxSequence = 0;

  // Regex pour les deux formats possibles :
  // Format 1: FCT-YYYYXXX (ex: FCT-2025005)
  // Format 2: YYYYXXX (ex: 2025005)
  const regexWithPrefix = new RegExp(`^FCT-${currentYear}(\\d{3})$`);
  const regexWithoutPrefix = new RegExp(`^${currentYear}(\\d{3})$`);

  factures.forEach(facture => {
    let sequence = 0;

    // Vérifier le format avec préfixe FCT-
    const matchWithPrefix = facture.numero.match(regexWithPrefix);
    if (matchWithPrefix) {
      sequence = parseInt(matchWithPrefix[1]);
    } else {
      // Vérifier le format sans préfixe
      const matchWithoutPrefix = facture.numero.match(regexWithoutPrefix);
      if (matchWithoutPrefix) {
        sequence = parseInt(matchWithoutPrefix[1]);
      }
    }

    if (sequence > maxSequence) {
      maxSequence = sequence;
    }
  });

  // Incrémenter le numéro de séquence
  const nextSequence = maxSequence + 1;

  // Formater avec des zéros initiaux pour avoir 3 chiffres
  const sequenceStr = String(nextSequence).padStart(3, '0');

  // Retourner le nouveau numéro au format FCT-YYYYXXX (format unifié)
  return `FCT-${currentYear}${sequenceStr}`;
};

// Fonction utilitaire pour formater une date
const formatDate = (date: any): string => {
  try {
    const dateObj = convertToDate(date);
    return dateObj.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  } catch (e) {
    console.error("Erreur de formatage de date:", e);
    return "-";
  }
};

// 🔧 NOUVELLE fonction utilitaire pour convertir une date en format input date (YYYY-MM-DD)
const formatDateForInput = (date: any): string => {
  try {
    const dateObj = convertToDate(date);
    // Utiliser toISOString().split('T')[0] pour avoir le format YYYY-MM-DD
    return dateObj.toISOString().split('T')[0];
  } catch (e) {
    console.error("Erreur de formatage de date pour input:", e);
    // Date d'aujourd'hui par défaut
    return new Date().toISOString().split('T')[0];
  }
};

// 🔧 NOUVELLE fonction utilitaire pour créer une date depuis un input date
const createDateFromInput = (inputValue: string): Date => {
  if (!inputValue) return new Date();

  // Créer la date en spécifiant explicitement le fuseau horaire local
  const date = new Date(inputValue + 'T12:00:00');
  return date;
};

// Nouvelle fonction utilitaire pour tronquer à 2 décimales et formater
const truncateAndFormat = (num: number | null | undefined): string => {
  if (num === null || num === undefined || isNaN(num)) {
    return (0).toFixed(2); // Gérer null, undefined, et NaN
  }
  const truncatedNum = Math.trunc(num * 100) / 100;
  return truncatedNum.toFixed(2);
};

export default function FacturesPage() {
  const router = useRouter();
  const { user } = useAuth();

  // Hook pour les modales
  const modal = useModal();

  const [factures, setFactures] = useState<Facture[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newFacture, setNewFacture] = useState<Omit<Facture, "id">>({
    userId: user?.uid || "",
    numero: "",
    client: {
      id: "",
      refClient: "",
      nom: "",
      rue: "",
      codePostal: "",
      ville: "",
      email: "",
      emails: [],
      delaisPaiement: "30 jours" as DelaiPaiementType,
    },
    statut: "En attente",
    articles: [],
    totalHT: 0,
    totalTTC: 0,
    dateCreation: new Date(),
  });
  const [selectedFacture, setSelectedFacture] = useState<Facture | null>(null);
  const [searchParams, setSearchParams] = useState<{ id?: string }>({});
  const [limitReached, setLimitReached] = useState(false);
  const [planInfo, setPlanInfo] = useState<{
    planId: string;
    maxFactures: number;
    currentFactures: number;
  }>({ planId: "", maxFactures: 0, currentFactures: 0 });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [showActionsMobile, setShowActionsMobile] = useState(false);

  // État pour le modal de sélection de modèle
  const [isModeleSelectorOpen, setIsModeleSelectorOpen] = useState(false);
  const [modeles, setModeles] = useState<ModeleFacture[]>([]);
  const [selectedModeleId, setSelectedModeleId] = useState<string | null>(null);
  const [factureForPDF, setFactureForPDF] = useState<Facture | null>(null);
  const [loadingModeles, setLoadingModeles] = useState(false);

  // États pour l'envoi d'emails
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [factureForEmail, setFactureForEmail] = useState<Facture | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailType, setEmailType] = useState<'invoice' | 'reminder' | 'overdue'>('invoice');
  const [customMessage, setCustomMessage] = useState('');
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);

  const { updateCachedFacture } = useFacture();

  // Récupérer les paramètres de l'URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const factureId = urlParams.get("id");

      if (factureId) {
        setSearchParams({ id: factureId });
      }
    }
  }, []);

  // Charger les factures depuis Firestore
  useEffect(() => {
    if (!user) {
      console.log("[DEBUG] Utilisateur non connecté, redirection vers /login");
      router.push("/login");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    console.log("[DEBUG] Utilisateur connecté:", {
      uid: user.uid,
      email: user.email,
      isAnonymous: user.isAnonymous
    });

    // Approche progressive: d'abord charger l'utilisateur et sa configuration
    const MAX_BATCH_SIZE = 10; // Charger les factures par groupes de 10
    let totalFactures: Facture[] = [];
    let loadingError = false;

    // Fonction pour récupérer les informations utilisateur
    const getUserInfo = async () => {
      try {
        console.log("[DEBUG] Récupération du plan utilisateur");
        const userPlan = await getUserPlan(user.uid);
        console.log("[DEBUG] Plan utilisateur récupéré:", userPlan);

        setPlanInfo({
          planId: userPlan.planId,
          maxFactures: userPlan.limites.factures === -1 ? Infinity : userPlan.limites.factures,
          currentFactures: 0, // Sera mis à jour après chargement des factures
        });

        return true;
      } catch (err) {
        console.error("[DEBUG] Erreur lors de la récupération du plan:", err);
        setErrorMessage("Impossible de récupérer votre plan d'abonnement. Veuillez réessayer ultérieurement.");
        setIsLoading(false);
        return false;
      }
    };

    // Fonction pour charger les factures de manière simple, sans tri complexe
    const loadFactures = async () => {
      try {
        console.log("[DEBUG] Chargement des factures");

        // Requête simplifiée sans orderBy pour éviter les problèmes d'index
        const facturesQuery = query(
          collection(db, "factures"),
          where("userId", "==", user.uid),
          limit(100) // Limiter à 100 factures maximum pour la version actuelle
        );

        const snapshot = await getDocs(facturesQuery);

        console.log(`[DEBUG] ${snapshot.docs.length} factures récupérées`);

        const facturesData = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            dateCreation: data.dateCreation ? convertToDate(data.dateCreation) : new Date(),
          };
        }) as Facture[];

        // Trier côté client pour éviter les problèmes d'index Firestore
        facturesData.sort((a, b) => {
          // S'assurer que les dates existent, sinon utiliser Date.now()
          const dateA = a.dateCreation instanceof Date ? a.dateCreation : new Date();
          const dateB = b.dateCreation instanceof Date ? b.dateCreation : new Date();

          // Comparer les dates (des plus récentes aux plus anciennes)
          return dateB.getTime() - dateA.getTime();
        });

        setFactures(facturesData);
        setPlanInfo(prev => ({
          ...prev,
          currentFactures: facturesData.length
        }));

        // Vérifier si nous avons atteint la limite du plan
        const isLimitReached = await checkPlanLimit(
          user.uid,
          "factures",
          facturesData.length
        );
        setLimitReached(isLimitReached);

        // Générer un numéro de facture
        setNewFacture(prev => {
          if (!prev.numero) {
            return {
              ...prev,
              numero: generateNewInvoiceNumber(facturesData)
            };
          }
          return prev;
        });

        setIsLoading(false);

      } catch (error) {
        console.error("[DEBUG] Erreur lors du chargement des factures:", error);
        setErrorMessage("Impossible de charger vos factures. Veuillez réessayer plus tard.");
        setIsLoading(false);
      }
    };

    // Séquence de chargement
    const loadData = async () => {
      const userInfoLoaded = await getUserInfo();
      if (userInfoLoaded) {
        await loadFactures();
      }
    };

    loadData();

    // Chargement des clients avec gestion d'erreur
    let clientsUnsubscribe = () => { };

    try {
      console.log("[DEBUG] Chargement des clients...");
      const clientsQuery = query(
        collection(db, "clients"),
        where("userId", "==", user.uid)
      );

      clientsUnsubscribe = onSnapshot(clientsQuery, (snapshot) => {
        const clientsData = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        })) as Client[];
        console.log(`[DEBUG] ${clientsData.length} clients chargés`);
        setClients(clientsData);
      }, (error) => {
        console.error("[DEBUG] Erreur d'écoute des clients:", error);
        setErrorMessage("Impossible de charger vos clients en temps réel. Les données peuvent ne pas être à jour.");
      });
    } catch (error) {
      console.error("[DEBUG] Erreur lors de l'initialisation de l'écoute des clients:", error);
      setErrorMessage("Impossible d'initialiser le chargement des clients. Veuillez actualiser la page.");
    }

    return () => {
      // Nettoyer l'écouteur des clients
      clientsUnsubscribe();
    };
  }, [user, router, retryCount]);

  // Fonction pour retenter le chargement
  const handleRetryLoading = () => {
    setRetryCount(prev => prev + 1);
  };

  // Utiliser useCallback pour la fonction openEditModal
  const openEditModal = useCallback(
    async (facture: Facture) => {
      setSelectedFacture(facture);

      // Gestion de la date de création en prenant en compte les différents types possibles
      let dateCreation: Date;
      if (facture.dateCreation instanceof Date) {
        dateCreation = facture.dateCreation;
      } else if (typeof facture.dateCreation === "string") {
        dateCreation = new Date(facture.dateCreation);
      } else if (
        facture.dateCreation &&
        typeof (facture.dateCreation as FirestoreTimestamp).toDate === "function"
      ) {
        dateCreation = (facture.dateCreation as FirestoreTimestamp).toDate();
      } else {
        dateCreation = new Date();
      }

      // S'assurer que la date est valide
      if (isNaN(dateCreation.getTime())) {
        dateCreation = new Date();
      }

      // 🔄 NOUVEAU : Récupérer les informations fraîches du client depuis la base de données
      let clientFrais = facture.client;
      if (facture.client.id && user) {
        try {
          const clientDoc = await getDoc(doc(db, "clients", facture.client.id));
          if (clientDoc.exists()) {
            const clientData = clientDoc.data();
            clientFrais = {
              ...clientData,
              id: facture.client.id,
              emails: clientData.emails || []
            } as typeof facture.client;
            console.log('📊 [DEBUG] Client mis à jour depuis Firebase:', clientFrais);
          }
        } catch (error) {
          console.warn('⚠️ Impossible de récupérer les infos fraîches du client:', error);
          // On garde les infos de la facture en cas d'erreur
        }
      }

      setNewFacture({
        userId: facture.userId || user?.uid || "",
        numero: facture.numero,
        client: clientFrais, // Utiliser les infos fraîches
        statut: facture.statut,
        articles: facture.articles || [], // S'assurer qu'on a toujours un tableau
        totalHT: facture.totalHT || 0,
        totalTTC: facture.totalTTC || 0,
        dateCreation: dateCreation,
      });
      setIsModalOpen(true);
    },
    [user]
  );

  // Ouvrir la facture si un ID est spécifié dans l'URL
  useEffect(() => {
    if (searchParams.id && factures.length > 0) {
      const factureToOpen = factures.find((f) => f.id === searchParams.id);
      if (factureToOpen) {
        openEditModal(factureToOpen);
        // Réinitialiser l'ID pour éviter de rouvrir la facture à chaque rafraîchissement
        setSearchParams({});
      }
    }
  }, [searchParams.id, factures, openEditModal]);

  // Charger les clients depuis Firestore
  useEffect(() => {
    if (!user) return;

    const clientsQuery = query(
      collection(db, "clients"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(clientsQuery, (snapshot) => {
      const clientsData = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as Client[];
      setClients(clientsData);
    });

    return () => unsubscribe();
  }, [user]);

  const openModal = () => {
    // Vérifier si l'utilisateur a atteint sa limite de factures
    if (limitReached) {
      modal.showWarning(
        `Vous avez atteint la limite de ${planInfo.currentFactures} facture(s) pour votre plan ${planInfo.planId}. Veuillez passer à un forfait supérieur pour ajouter plus de factures.`,
        'Limite atteinte'
      );
      return;
    }

    setSelectedFacture(null);
    setNewFacture({
      userId: user?.uid || "",
      numero: generateNewInvoiceNumber(factures),
      statut: "En attente",
      client: {
        id: "",
        refClient: "",
        nom: "",
        rue: "",
        codePostal: "",
        ville: "",
        email: "",
        emails: [],
        delaisPaiement: "30 jours" as DelaiPaiementType,
      },
      articles: [],
      totalHT: 0,
      totalTTC: 0,
      dateCreation: new Date(),
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedFacture(null);
    setNewFacture({
      userId: user?.uid || "",
      numero: "",
      client: {
        id: "",
        refClient: "",
        nom: "",
        rue: "",
        codePostal: "",
        ville: "",
        email: "",
        emails: [],
        delaisPaiement: "30 jours" as DelaiPaiementType,
      },
      statut: "En attente",
      articles: [],
      totalHT: 0,
      totalTTC: 0,
      dateCreation: new Date(),
    });
    setIsModalOpen(false);
  };

  // Ajout d'un article à la facture
  const addArticle = () => {
    setNewFacture({
      ...newFacture,
      articles: [
        ...(newFacture.articles || []), // S'assurer qu'on a un tableau
        {
          id: Date.now(),
          description: "",
          quantite: 0,
          prixUnitaireHT: 0,
          tva: 20,
          totalTTC: 0,
          isComment: false,
        },
      ],
    });
  };

  // Ajout d'un commentaire à la facture
  const addComment = () => {
    setNewFacture({
      ...newFacture,
      articles: [
        ...(newFacture.articles || []), // S'assurer qu'on a un tableau
        {
          id: Date.now(),
          description: "",
          quantite: 0,
          prixUnitaireHT: 0,
          tva: 0,
          totalTTC: 0,
          isComment: true,
        },
      ],
    });
  };

  // Mise à jour d'un article
  const handleArticleChange = (index: number, field: string, value: any) => {
    const updatedArticles = [...(newFacture.articles || [])]; // S'assurer qu'on a un tableau
    updatedArticles[index] = { ...updatedArticles[index], [field]: value };

    // Ne pas calculer les totaux pour les lignes de commentaire
    if (!updatedArticles[index].isComment) {
      // Calcul du total TTC pour cet article
      const prixHT =
        updatedArticles[index].prixUnitaireHT * updatedArticles[index].quantite;
      const tvaAmount = (prixHT * updatedArticles[index].tva) / 100;
      updatedArticles[index].totalTTC = prixHT + tvaAmount;
    }

    // Mise à jour des totaux de la facture (en excluant les commentaires)
    const totalHT = updatedArticles
      .filter((article) => !article.isComment)
      .reduce(
        (sum, article) => sum + article.prixUnitaireHT * article.quantite,
        0
      );
    const totalTTC = updatedArticles
      .filter((article) => !article.isComment)
      .reduce((sum, article) => sum + article.totalTTC, 0);

    setNewFacture({
      ...newFacture,
      articles: updatedArticles,
      totalHT,
      totalTTC,
    });
  };

  // Suppression d'un article
  const removeArticle = (id: number) => {
    const updatedArticles = (newFacture.articles || []).filter( // S'assurer qu'on a un tableau
      (article) => article.id !== id
    );
    const totalHT = updatedArticles.reduce(
      (sum, article) => sum + article.prixUnitaireHT * article.quantite,
      0
    );
    const totalTTC = updatedArticles.reduce(
      (sum, article) => sum + article.totalTTC,
      0
    );
    setNewFacture({
      ...newFacture,
      articles: updatedArticles,
      totalHT,
      totalTTC,
    });
  };

  // Mise à jour du client sélectionné
  const handleClientChange = (clientId: string) => {
    console.log("[DEBUG] 👤 Changement de client:", clientId);

    if (clientId === "") {
      console.log("[DEBUG] 🚫 Aucun client sélectionné, reset du client");
      setNewFacture(prev => ({
        ...prev,
        client: {
          id: "",
          refClient: "",
          nom: "",
          rue: "",
          codePostal: "",
          ville: "",
          email: "",
          emails: [],
          delaisPaiement: "30 jours" as DelaiPaiementType,
        },
      }));
      return;
    }

    const selectedClient = clients.find((client) => client.id === clientId);
    if (selectedClient) {
      console.log("[DEBUG] ✅ Client trouvé:", {
        id: selectedClient.id,
        nom: selectedClient.nom,
        email: selectedClient.email,
        emailsCount: selectedClient.emails?.length || 0,
        delaisPaiement: selectedClient.delaisPaiement
      });

      setNewFacture(prev => ({
        ...prev,
        client: {
          ...selectedClient,
          emails: selectedClient.emails || []
        },
      }));
    } else {
      console.warn("[DEBUG] ⚠️ Client non trouvé avec l'ID:", clientId);
    }
  };

  // Validation du formulaire avec sauvegarde Firebase
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Vérifier que l'utilisateur est connecté
    if (!user) {
      router.push("/login");
      return;
    }

    try {
      console.log("[DEBUG] 🔄 Début de la création/modification de facture");
      console.log("[DEBUG] 📊 État newFacture:", {
        numero: newFacture.numero,
        clientId: newFacture.client.id,
        clientNom: newFacture.client.nom,
        dateCreation: newFacture.dateCreation,
        statut: newFacture.statut,
        articlesCount: newFacture.articles?.length || 0,
        totalHT: newFacture.totalHT,
        totalTTC: newFacture.totalTTC
      });

      const factureData = {
        userId: user.uid,
        numero: newFacture.numero,
        client: newFacture.client,
        statut: newFacture.statut,
        articles: newFacture.articles || [],
        totalHT: newFacture.totalHT,
        totalTTC: newFacture.totalTTC,
        dateCreation: Timestamp.fromDate(
          newFacture.dateCreation instanceof Date
            ? newFacture.dateCreation
            : new Date()
        ),
      };

      console.log("[DEBUG] 💾 Données de la facture à sauvegarder:", {
        ...factureData,
        dateCreation: factureData.dateCreation.toDate().toISOString()
      });

      if (selectedFacture && selectedFacture.id) {
        // Modification d'une facture existante
        console.log("[DEBUG] ✏️ Modification de la facture existante:", selectedFacture.id);
        const factureRef = doc(db, "factures", selectedFacture.id);

        await updateDoc(factureRef, factureData);
        console.log("[DEBUG] ✅ Facture modifiée avec succès dans Firestore");

        // Mettre à jour la facture dans la liste locale
        setFactures(prev => prev.map(f =>
          f.id === selectedFacture.id
            ? { ...factureData, id: selectedFacture.id, dateCreation: factureData.dateCreation.toDate() } as Facture
            : f
        ));

        // Mettre à jour le cache si nécessaire
        if (updateCachedFacture) {
          updateCachedFacture(
            selectedFacture.id,
            { ...factureData, dateCreation: factureData.dateCreation.toDate() } as Partial<Facture>
          );
        }

      } else {
        // Vérifier à nouveau les limites avant la création
        const isLimitReached = await checkPlanLimit(
          user.uid,
          "factures",
          factures.length
        );

        if (isLimitReached) {
          console.log("[DEBUG] ⚠️ Limite de factures atteinte");
          modal.showWarning(
            `Vous avez atteint la limite de ${planInfo.currentFactures} facture(s) pour votre plan ${planInfo.planId}. Veuillez passer à un forfait supérieur pour ajouter plus de factures.`,
            'Limite atteinte'
          );
          return;
        }

        // Création d'une nouvelle facture
        console.log("[DEBUG] ➕ Création d'une nouvelle facture");
        const factureRef = collection(db, "factures");
        const newFactureDoc = await addDoc(factureRef, factureData);
        console.log("[DEBUG] ✅ Nouvelle facture créée avec succès:", newFactureDoc.id);

        // Ajouter la nouvelle facture directement à la liste en mémoire
        const factureWithId = {
          ...factureData,
          id: newFactureDoc.id,
          dateCreation: factureData.dateCreation.toDate()
        } as Facture;

        setFactures(prev => [factureWithId, ...prev]);

        console.log("[DEBUG] 📝 Nouvelle facture ajoutée à la liste:", {
          id: newFactureDoc.id,
          numero: factureData.numero
        });
      }

      // Fermer le modal et réinitialiser les états
      closeModal();

      // Afficher un message de succès
      modal.showSuccess(
        selectedFacture ? 'Facture modifiée avec succès !' : 'Facture créée avec succès !'
      );

      console.log("[DEBUG] 🎉 Opération de sauvegarde terminée avec succès");

    } catch (error) {
      console.error("[DEBUG] ❌ Erreur lors de la sauvegarde de la facture:", error);
      console.error("[DEBUG] 🔍 Détails de l'erreur:", {
        errorType: typeof error,
        errorMessage: error instanceof Error ? error.message : 'Erreur inconnue',
        errorStack: error instanceof Error ? error.stack : 'Pas de stack trace'
      });

      modal.showError(
        "Une erreur est survenue lors de la sauvegarde de la facture. Veuillez réessayer."
      );
    }
  };

  // Suppression d'une facture
  const deleteFacture = async (id: string) => {
    const factureToDelete = factures.find(f => f.id === id);
    if (!factureToDelete) {
      modal.showError("Cette facture n'existe pas ou a déjà été supprimée.");
      return;
    }

    modal.showDeleteConfirmation(
      `la facture ${factureToDelete.numero}`,
      async () => {
        try {
          console.log("[DEBUG] Tentative de suppression de la facture:", id);
          console.log("[DEBUG] Utilisateur actuel:", {
            uid: user?.uid,
            email: user?.email,
            isAnonymous: user?.isAnonymous
          });

          // Vérifier d'abord si la facture existe et appartient à l'utilisateur
          const factureRef = doc(db, "factures", id);
          const factureDoc = await getDoc(factureRef);

          if (!factureDoc.exists()) {
            console.error("[DEBUG] Facture introuvable:", id);
            modal.showError("Cette facture n'existe pas ou a déjà été supprimée.");
            return;
          }

          const factureData = factureDoc.data();
          console.log("[DEBUG] Données de la facture:", {
            factureId: id,
            factureUserId: factureData.userId,
            currentUserId: user?.uid,
            factureData: factureData
          });

          // Vérification de propriété avec logs détaillés
          if (factureData.userId !== user?.uid) {
            console.error("[DEBUG] Tentative non autorisée de suppression d'une facture:", {
              factureId: id,
              factureUserId: factureData.userId,
              currentUserId: user?.uid,
              userIdType: typeof factureData.userId,
              currentUserIdType: typeof user?.uid,
              areEqual: factureData.userId === user?.uid,
              strictEqual: factureData.userId === user?.uid
            });
            modal.showError("Vous n'êtes pas autorisé à supprimer cette facture.");
            return;
          }

          console.log("[DEBUG] Tentative de suppression Firestore pour la facture:", id);
          await deleteDoc(doc(db, "factures", id));
          console.log("[DEBUG] Facture supprimée avec succès:", id);

          // Afficher un message de succès
          modal.showSuccess("Facture supprimée avec succès");

          // Recharger les factures après suppression
          setRetryCount(prev => prev + 1);
        } catch (error) {
          console.error("[DEBUG] Erreur lors de la suppression de la facture:", error);
          console.error("[DEBUG] Type d'erreur:", typeof error);
          console.error("[DEBUG] Erreur complète:", JSON.stringify(error, null, 2));

          // Afficher un message d'erreur plus spécifique
          if (error instanceof Error) {
            console.error("[DEBUG] Message d'erreur:", error.message);
            console.error("[DEBUG] Stack trace:", error.stack);

            if (error.message.includes("permission") || error.message.includes("Permission") || error.message.includes("PERMISSION")) {
              modal.showError("Vous n'avez pas les droits nécessaires pour supprimer cette facture. Veuillez contacter l'administrateur.");
            } else if (error.message.includes("Missing or insufficient permissions")) {
              modal.showError("Permissions insuffisantes. Vérifiez vos règles de sécurité Firestore.");
            } else {
              modal.showError(`Erreur lors de la suppression de la facture: ${error.message}`);
            }
          } else {
            modal.showError("Une erreur inattendue s'est produite lors de la suppression.");
          }
        }
      }
    );
  };

  // Fonction pour charger les modèles de facture
  const loadModeles = async () => {
    if (!user) return;

    try {
      setLoadingModeles(true);
      const modelesData = await getModelesFacture(user.uid);
      setModeles(modelesData);
    } catch (error) {
      console.error("Erreur lors du chargement des modèles:", error);
    } finally {
      setLoadingModeles(false);
    }
  };

  // Fonction pour ouvrir le sélecteur de modèle
  const openModelSelector = (facture: Facture) => {
    setFactureForPDF(facture);
    setSelectedModeleId(null);
    loadModeles();
    setIsModeleSelectorOpen(true);
  };

  // Fonction pour fermer le sélecteur de modèle
  const closeModelSelector = () => {
    setIsModeleSelectorOpen(false);
    setFactureForPDF(null);
  };

  // Fonction pour générer le PDF de la facture (utilisation directe)
  const generatePDF = async (facture: Facture) => {
    try {
      console.log("Début de la génération du PDF pour la facture:", facture.numero);
      await generateInvoicePDF(facture);
      console.log("Génération du PDF réussie");
      modal.showSuccess("PDF généré avec succès");
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      let errorMessage = "Erreur lors de la génération du PDF";
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
      }
      modal.showError(errorMessage);
    }
  };

  // Fonction pour générer le PDF avec un modèle spécifique ou par défaut
  const generatePDFWithSelectedTemplate = async () => {
    if (!factureForPDF) {
      modal.showError("Aucune facture sélectionnée");
      return;
    }

    try {
      console.log("Début de la génération du PDF avec modèle spécifique");
      console.log("Facture:", factureForPDF.numero);
      console.log("Modèle sélectionné:", selectedModeleId || "par défaut");

      if (selectedModeleId) {
        await generateInvoicePDFWithSelectedTemplate(
          factureForPDF,
          selectedModeleId
        );
      } else {
        await generateInvoicePDF(factureForPDF);
      }

      console.log("Génération du PDF réussie");
      modal.showSuccess("PDF généré avec succès");
      closeModelSelector();
    } catch (error) {
      console.error("Erreur détaillée lors de la génération du PDF:", error);
      let errorMessage = "Erreur lors de la génération du PDF";
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
      }
      modal.showError(errorMessage);
    }
  };

  // Fonction pour ouvrir le modal d'envoi d'email
  const openEmailModal = async (facture: Facture) => {
    // 🔄 NOUVEAU : Récupérer les informations fraîches du client depuis la base de données
    let factureAvecClientFrais = facture;
    if (facture.client.id && user) {
      try {
        const clientDoc = await getDoc(doc(db, "clients", facture.client.id));
        if (clientDoc.exists()) {
          const clientData = clientDoc.data();
          const clientFrais = {
            ...clientData,
            id: facture.client.id,
            emails: clientData.emails || []
          } as typeof facture.client;

          factureAvecClientFrais = {
            ...facture,
            client: clientFrais
          };

          console.log('📧 [DEBUG] Client mis à jour pour l\'email depuis Firebase:', clientFrais);
        }
      } catch (error) {
        console.warn('⚠️ Impossible de récupérer les infos fraîches du client pour l\'email:', error);
        // On garde les infos de la facture en cas d'erreur
      }
    }

    // Vérifier que le client a au moins un email
    const hasEmail = (factureAvecClientFrais.client.emails && factureAvecClientFrais.client.emails.length > 0) ||
      factureAvecClientFrais.client.email;

    if (!hasEmail) {
      modal.showWarning(
        'Veuillez d\'abord ajouter un email dans les informations du client.',
        'Aucun email configuré'
      );
      return;
    }

    // Récupérer tous les emails disponibles avec les infos fraîches
    const allEmails: { email: string; isDefault?: boolean; label?: string }[] = [];

    // Ajouter les emails de la nouvelle structure
    if (factureAvecClientFrais.client.emails && factureAvecClientFrais.client.emails.length > 0) {
      factureAvecClientFrais.client.emails.forEach(e => {
        if (e.email && e.email.trim()) {
          allEmails.push({
            email: e.email.trim(),
            isDefault: e.isDefault,
            label: 'Contact'
          });
        }
      });
    }

    // Ajouter l'email de l'ancienne structure si il n'est pas déjà présent
    if (factureAvecClientFrais.client.email && factureAvecClientFrais.client.email.trim() &&
      !allEmails.some(e => e.email === factureAvecClientFrais.client.email?.trim())) {
      allEmails.push({
        email: factureAvecClientFrais.client.email.trim(),
        label: 'Principal'
      });
    }

    // Sélectionner tous les emails par défaut
    setSelectedEmails(allEmails.map(e => e.email));

    setFactureForEmail(factureAvecClientFrais); // Utiliser la facture avec client frais
    setEmailType('invoice');
    setCustomMessage('');
    setIsEmailModalOpen(true);
  };

  // Fonction pour fermer le modal d'envoi d'email
  const closeEmailModal = () => {
    setIsEmailModalOpen(false);
    setFactureForEmail(null);
    setEmailType('invoice');
    setCustomMessage('');
    setSelectedEmails([]); // Réinitialiser la sélection d'emails
  };

  // Fonction pour envoyer l'email
  const sendInvoiceEmail = async () => {
    if (!factureForEmail || !user) {
      modal.showError('Facture ou utilisateur non trouvé');
      return;
    }

    // Vérifier qu'au moins un email est sélectionné
    if (selectedEmails.length === 0) {
      modal.showWarning('Veuillez sélectionner au moins un email pour l\'envoi.');
      return;
    }

    setEmailLoading(true);

    try {
      console.log(`[EMAIL] 🚀 Début envoi facture ${factureForEmail.numero}`);
      console.log(`[EMAIL] 📧 Emails sélectionnés:`, selectedEmails);
      console.log(`[EMAIL] 👤 Client:`, factureForEmail.client.nom);

      // 🔧 NOUVEAU : Récupérer la signature utilisateur depuis Firebase CÔTÉ CLIENT
      let userSignature = null;
      try {
        console.log(`[EMAIL] 🔍 Récupération de la signature utilisateur côté client`);
        const userDoc = await getDoc(doc(db, "users", user.uid));

        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.signature) {
            userSignature = userData.signature;
            console.log(`[EMAIL] ✅ Signature utilisateur récupérée côté client:`, {
              nom: userSignature.nom || 'Non défini',
              fonction: userSignature.fonction || 'Non définie',
              hasAvatar: !!userSignature.avatar
            });
          } else {
            console.log(`[EMAIL] ⚠️ Pas de signature trouvée pour l'utilisateur`);
          }
        } else {
          console.log(`[EMAIL] ⚠️ Document utilisateur non trouvé`);
        }
      } catch (signatureError) {
        console.warn(`[EMAIL] ⚠️ Erreur lors de la récupération de la signature:`, signatureError);
        // Continuer sans signature personnalisée
      }

      // Créer une facture temporaire avec seulement les emails sélectionnés
      const factureWithSelectedEmails = {
        ...factureForEmail,
        client: {
          ...factureForEmail.client,
          // 🔧 CORRECTION : Mettre le premier email sélectionné comme email principal
          email: selectedEmails[0] || '', // Premier email sélectionné devient le principal
          // Créer une nouvelle structure emails[] avec seulement les emails sélectionnés
          emails: selectedEmails.map((email, index) => ({
            email: email,
            label: index === 0 ? 'Principal (sélectionné)' : 'Sélectionné',
            isDefault: index === 0 // Le premier email sélectionné devient le principal
          }))
        }
      };

      // Log pour débogage
      console.log('[EMAIL] 📦 Structure envoyée au serveur:', {
        emails: factureWithSelectedEmails.client.emails,
        emailPrincipal: factureWithSelectedEmails.client.email,
        selectedEmails: selectedEmails,
        nombreEmails: selectedEmails.length,
        hasUserSignature: !!userSignature
      });

      const response = await fetch('/api/send-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          facture: factureWithSelectedEmails,
          emailType,
          customMessage: customMessage.trim() || undefined,
          userSignature: userSignature, // 🔧 NOUVEAU : Passer la signature depuis le client
          userId: user.uid, // Garder pour compatibilité
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        modal.showSuccess(`Email envoyé avec succès à ${selectedEmails.join(', ')}`);

        // Mettre à jour le statut de la facture côté client
        try {
          const factureRef = doc(db, 'factures', factureForEmail.id);
          const updateData: any = {
            lastEmailSent: new Date(),
            emailSentCount: ((factureForEmail as any).emailSentCount || 0) + 1,
          };

          // Si c'est le premier envoi, changer le statut
          if (factureForEmail.statut === 'En attente') {
            updateData.statut = 'Envoyée';
          }

          await updateDoc(factureRef, updateData);
          console.log('[EMAIL] Statut de la facture mis à jour');
        } catch (updateError) {
          console.error('[EMAIL] Erreur lors de la mise à jour du statut:', updateError);
          // Ne pas bloquer l'utilisateur pour cette erreur
        }

        // Recharger les factures pour mettre à jour les statuts
        rechargerFactures();

        closeEmailModal();
      } else {
        throw new Error(result.error || result.details || 'Erreur lors de l\'envoi de l\'email');
      }
    } catch (error) {
      console.error('[EMAIL] Erreur lors de l\'envoi:', error);
      modal.showError(`Erreur lors de l'envoi de l'email: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setEmailLoading(false);
    }
  };

  // Fonction pour recharger les données de factures
  const rechargerFactures = useCallback(async () => {
    if (!user) return;

    try {
      console.log("[DEBUG] Rechargement des factures après paiement");

      // Requête pour récupérer les factures mises à jour
      const facturesQuery = query(
        collection(db, "factures"),
        where("userId", "==", user.uid),
        limit(100)
      );

      const snapshot = await getDocs(facturesQuery);
      const facturesData = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          dateCreation: data.dateCreation ? convertToDate(data.dateCreation) : new Date(),
        };
      }) as Facture[];

      // Trier côté client
      facturesData.sort((a, b) => {
        const dateA = a.dateCreation instanceof Date ? a.dateCreation : new Date();
        const dateB = b.dateCreation instanceof Date ? b.dateCreation : new Date();
        return dateB.getTime() - dateA.getTime();
      });

      setFactures(facturesData);

      // Mettre à jour la facture sélectionnée si elle existe
      if (selectedFacture) {
        const factureUpdated = facturesData.find(f => f.id === selectedFacture.id);
        if (factureUpdated) {
          setSelectedFacture(factureUpdated);
          // Mettre à jour aussi newFacture pour la cohérence
          setNewFacture({
            userId: factureUpdated.userId || user.uid,
            numero: factureUpdated.numero,
            client: factureUpdated.client,
            statut: factureUpdated.statut,
            articles: factureUpdated.articles,
            totalHT: factureUpdated.totalHT,
            totalTTC: factureUpdated.totalTTC,
            dateCreation: factureUpdated.dateCreation instanceof Date ? factureUpdated.dateCreation : new Date(),
          });
        }
      }

      console.log("[DEBUG] Factures rechargées avec succès");
    } catch (error) {
      console.error("[DEBUG] Erreur lors du rechargement des factures:", error);
    }
  }, [user, selectedFacture]);

  return (
    <div className="p-6 bg-background-light dark:bg-background-dark">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center">
            <button
              onClick={() => setShowActionsMobile(v => !v)}
              className="sm:hidden mr-3 p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label="Ouvrir le menu d'actions"
            >
              <FiMenu size={22} />
            </button>
            <h1 className="text-3xl sm:text-4xl font-semibold text-text-light dark:text-text-dark">
              📜 Factures
            </h1>
          </div>
        </div>
        <div className="hidden sm:flex space-x-2 sm:space-x-4 mt-4 sm:mt-0">
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-800 flex items-center"
          >
            <FiArrowLeft size={18} className="mr-2" /> Retour
          </button>
          <button
            onClick={() => router.push("/dashboard/factures/modeles")}
            className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 flex items-center"
          >
            📝 Modèles
          </button>
          <button
            onClick={() => router.push("/dashboard/factures/recurrentes")}
            className="bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 flex items-center"
          >
            🔄 Récurrentes
          </button>
          <button
            onClick={openModal}
            disabled={limitReached}
            className={`${limitReached
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700"
              } text-white py-2 px-4 rounded-md`}
          >
            Ajouter une facture
          </button>
        </div>
        {showActionsMobile && (
          <div className="sm:hidden mt-3 grid grid-cols-1 gap-2">
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-800 flex items-center justify-center"
            >
              <FiArrowLeft size={18} className="mr-2" /> Retour
            </button>
            <button
              onClick={() => router.push("/dashboard/factures/modeles")}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 flex items-center justify-center"
            >
              📝 Modèles
            </button>
            <button
              onClick={() => router.push("/dashboard/factures/recurrentes")}
              className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 flex items-center justify-center"
            >
              🔄 Récurrentes
            </button>
            <button
              onClick={openModal}
              disabled={limitReached}
              className={`w-full ${limitReached ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"} text-white py-2 px-4 rounded-md`}
            >
              Ajouter une facture
            </button>
          </div>
        )}
      </div>

      {/* Affichage des erreurs */}
      {errorMessage && (
        <div className="mb-6 bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md flex justify-between items-center">
          <div>
            <p className="font-medium">Erreur</p>
            <p>{errorMessage}</p>
          </div>
          <button
            onClick={handleRetryLoading}
            className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 flex items-center"
          >
            <FiRefreshCw size={18} className="mr-2" /> Réessayer
          </button>
        </div>
      )}

      {/* Indicateur de chargement */}
      {isLoading && (
        <div className="flex justify-center items-center p-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100"></div>
          <p className="ml-4 text-text-light dark:text-text-dark">Chargement de vos factures...</p>
        </div>
      )}

      {/* Information sur les limites du plan */}
      {!isLoading && (
        <div className="mb-6 bg-white dark:bg-card-dark p-4 rounded-lg shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium text-text-light dark:text-text-dark">
                Factures
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {planInfo.maxFactures === -1
                  ? `Vous utilisez ${planInfo.currentFactures} facture(s) (illimité avec le plan ${planInfo.planId})`
                  : `Vous utilisez ${planInfo.currentFactures} facture(s) sur ${planInfo.maxFactures} disponible(s) avec votre plan ${planInfo.planId}`}
              </p>
            </div>
            {limitReached && planInfo.maxFactures !== -1 && (
              <div className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 px-3 py-1 rounded-full text-sm">
                Limite atteinte
              </div>
            )}
          </div>
          {limitReached && planInfo.maxFactures !== -1 && (
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              <a
                href="/dashboard/abonnement"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Passez à un plan supérieur
              </a>{" "}
              pour créer plus de factures.
            </div>
          )}
        </div>
      )}

      {/* Tableau des factures */}
      {!isLoading && factures.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full bg-card-light dark:bg-card-dark shadow-md rounded-lg">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="py-3 px-4 text-left">N° Facture</th>
                <th className="py-3 px-4 text-left">Client</th>
                <th className="py-3 px-4 text-left">Date de facture</th>
                <th className="py-3 px-4 text-left">Total TTC</th>
                <th className="py-3 px-4 text-left">Statut</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {factures
                .filter((facture) => facture && facture.id)
                .map((facture) => (
                  <tr
                    key={facture.id}
                    className="border-b dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800/70"
                  >
                    <td className="py-3 px-4 text-text-light dark:text-text-dark">
                      <span className="font-medium">
                        {facture.numero}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-text-light dark:text-text-dark">
                      {facture.client.nom}
                    </td>
                    <td className="py-3 px-4 text-text-light dark:text-text-dark">
                      {formatDate(facture.dateCreation)}
                    </td>
                    <td className="py-3 px-4 text-text-light dark:text-text-dark">
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {formaterMontant(facture.totalTTC)}
                        </span>
                        {facture.montantPaye && facture.montantPaye > 0 && (
                          <div className="text-xs text-gray-500">
                            <span className="text-green-600">Payé: {formaterMontant(facture.montantPaye)}</span>
                            {facture.resteAPayer && facture.resteAPayer > 0 && (
                              <span className="text-red-600 ml-2">Reste: {formaterMontant(facture.resteAPayer)}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-text-light dark:text-text-dark">
                      <div className="flex items-center">
                        <span
                          className={`inline-block w-3.5 h-3.5 md:w-4 md:h-4 rounded-full ${getCouleurStatut(facture.statut)}`}
                          style={getCouleurStatutInline(facture.statut)}
                          aria-hidden="true"
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => openModelSelector(facture)}
                        className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white mx-1"
                        title="Générer PDF"
                      >
                        <FiFileText size={18} />
                      </button>
                      <button
                        onClick={() => openEmailModal(facture)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 mx-1"
                        title="Envoyer par email"
                      >
                        <FiMail size={18} />
                      </button>
                      <button
                        onClick={() => openEditModal(facture)}
                        className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mx-1"
                        title="Modifier"
                      >
                        <FiEdit size={18} />
                      </button>
                      <button
                        onClick={() => deleteFacture(facture.id)}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 mx-1"
                        title="Supprimer"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {/* Légende des statuts */}
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full bg-red-500" />
                <span>À relancer</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full bg-green-500" />
                <span>Payée</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full bg-blue-500" />
                <span>Envoyée</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full bg-orange-500" />
                <span>En attente</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message si aucune facture */}
      {!isLoading && factures.length === 0 && !errorMessage && (
        <div className="text-center py-10">
          <p className="text-gray-600 dark:text-gray-400 mb-4">Vous n'avez pas encore de factures.</p>
          <button
            onClick={openModal}
            disabled={limitReached}
            className={`${limitReached
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gray-800 hover:bg-gray-600"
              } text-white py-2 px-4 rounded-md transition-colors duration-300`}
          >
            Créer votre première facture
          </button>
        </div>
      )}

      {/* Modal amélioré */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-[1200px] relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={closeModal}
              className="absolute top-3 right-3 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-1 rounded-full hover:bg-gray-400 dark:hover:bg-gray-600 transform hover:scale-105 transition-transform duration-300"
            >
              ❌
            </button>
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
              {selectedFacture ? "Modifier la facture" : "Ajouter une facture"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="block font-semibold text-gray-800 dark:text-white mb-2">
                    Numéro de facture
                  </label>
                  <input
                    type="text"
                    value={newFacture.numero}
                    onChange={(e) => {
                      console.log("[DEBUG] Changement numéro facture:", e.target.value);
                      setNewFacture(prev => ({
                        ...prev,
                        numero: e.target.value,
                      }));
                    }}
                    className="w-full p-2 border rounded bg-white text-gray-800"
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <label className="block font-semibold text-gray-800 dark:text-white mb-2">
                    Statut
                  </label>
                  <select
                    value={newFacture.statut}
                    onChange={(e) => {
                      console.log("[DEBUG] Changement statut:", e.target.value);
                      setNewFacture(prev => ({
                        ...prev,
                        statut: e.target.value as Facture["statut"],
                      }));
                    }}
                    className="w-full p-2 border rounded bg-white text-gray-800"
                    required
                  >
                    <option value="En attente">En attente</option>
                    <option value="Envoyée">Envoyée</option>
                    <option value="Payée">Payée</option>
                    <option value="En retard">En retard</option>
                    <option value="Annulée">Annulée</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="block font-semibold text-gray-800 dark:text-white mb-2">
                    Date de facturation
                  </label>
                  <input
                    type="date"
                    id="date-facture"
                    value={formatDateForInput(newFacture.dateCreation)}
                    onChange={(e) => {
                      console.log("[DEBUG] Changement de date:", e.target.value);
                      const newDate = createDateFromInput(e.target.value);
                      console.log("[DEBUG] Nouvelle date créée:", newDate);
                      setNewFacture(prev => ({
                        ...prev,
                        dateCreation: newDate,
                      }));
                    }}
                    className="w-full p-2 border rounded bg-white text-gray-800"
                    required
                  />
                </div>
                <div className="flex flex-col">
                  <label className="block font-semibold text-gray-800 dark:text-white mb-2">
                    Date d'échéance
                  </label>
                  <div className="w-full p-2 border rounded bg-gray-50 text-gray-700 flex items-center min-h-[40px]">
                    {newFacture.client.id && newFacture.client.delaisPaiement ? (
                      <span className="font-medium">
                        {calculerDateEcheance(
                          convertToDate(newFacture.dateCreation as any),
                          newFacture.client.delaisPaiement
                        ).toLocaleDateString('fr-FR')}
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">
                        Sélectionnez un client
                      </span>
                    )}
                  </div>
                  {newFacture.client.id && newFacture.client.delaisPaiement && (
                    <p className="text-xs text-gray-500 mt-1">
                      Délai : {newFacture.client.delaisPaiement}
                    </p>
                  )}
                </div>
              </div>

              <select
                value={newFacture.client.id}
                onChange={(e) => handleClientChange(e.target.value)}
                className="w-full p-2 border bg-white text-gray-800"
                required
              >
                <option value="">Sélectionnez un client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.refClient} - {client.nom}
                  </option>
                ))}
              </select>

              {newFacture.client.id && (
                <div className="bg-gray-100 p-4 rounded-md text-gray-800">
                  <h4 className="font-semibold mb-2">Informations client</h4>
                  <p>
                    <span className="font-medium">Adresse:</span>{" "}
                    {newFacture.client.rue}
                  </p>
                  <p>
                    <span className="font-medium">CP/Ville:</span>{" "}
                    {newFacture.client.codePostal} {newFacture.client.ville}
                  </p>
                  <p>
                    <span className="font-medium">Email:</span>{" "}
                    {newFacture.client.email}
                  </p>
                  <p>
                    <span className="font-medium">Délai de paiement:</span>{" "}
                    {newFacture.client.delaisPaiement}
                  </p>
                </div>
              )}

              <h3 className="font-semibold text-gray-800 dark:text-white mt-4 mb-2">
                Articles
              </h3>
              {(newFacture.articles || []).map((article, index) => (
                <div
                  key={article.id}
                  className="flex space-x-2 mb-2 items-center"
                >
                  <input
                    type="text"
                    placeholder={
                      article.isComment ? "Commentaire" : "Description"
                    }
                    value={article.description}
                    onChange={(e) =>
                      handleArticleChange(index, "description", e.target.value)
                    }
                    className={`flex-1 p-2 border text-gray-800 ${article.isComment ? "bg-gray-50" : "bg-white"
                      }`}
                  />
                  {!article.isComment && (
                    <>
                      <input
                        type="number"
                        placeholder="Qté"
                        value={article.quantite === 0 ? "" : article.quantite}
                        onChange={(e) =>
                          handleArticleChange(
                            index,
                            "quantite",
                            e.target.value === "" ? 0 : Number(e.target.value)
                          )
                        }
                        className="w-16 p-2 border bg-white text-gray-800"
                      />
                      <input
                        type="number"
                        placeholder="Prix HT"
                        value={
                          article.prixUnitaireHT === 0
                            ? ""
                            : article.prixUnitaireHT
                        }
                        onChange={(e) =>
                          handleArticleChange(
                            index,
                            "prixUnitaireHT",
                            e.target.value === "" ? 0 : Number(e.target.value)
                          )
                        }
                        className="w-24 p-2 border bg-white text-gray-800"
                      />
                      <input
                        type="number"
                        placeholder="TVA %"
                        value={article.tva === 0 ? "" : article.tva}
                        onChange={(e) =>
                          handleArticleChange(
                            index,
                            "tva",
                            e.target.value === "" ? 0 : Number(e.target.value)
                          )
                        }
                        className="w-16 p-2 border bg-white text-gray-800"
                      />
                      <p className="w-24 text-center font-semibold">
                        {article.totalTTC.toFixed(2)} €
                      </p>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => removeArticle(article.id)}
                    className="text-red-500"
                  >
                    ❌
                  </button>
                </div>
              ))}

              <div className="flex justify-between">
                <div className="space-x-2">
                  <button
                    type="button"
                    onClick={addArticle}
                    className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-800 transform hover:scale-105 transition-transform duration-300"
                  >
                    Ajouter un article
                  </button>
                  <button
                    type="button"
                    onClick={addComment}
                    className="bg-gray-400 text-white px-4 py-2 rounded-md hover:bg-gray-600 transform hover:scale-105 transition-transform duration-300"
                  >
                    Ajouter un commentaire
                  </button>
                </div>
                <button
                  type="submit"
                  className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-500 transform hover:scale-105 transition-transform duration-300"
                >
                  {selectedFacture
                    ? "Modifier la facture"
                    : "Ajouter la facture"}
                </button>
              </div>
            </form>

            {/* Section Paiements - uniquement en mode édition */}
            {selectedFacture && (
              <div className="mt-6">
                <GestionPaiements
                  facture={selectedFacture}
                  onPaiementChange={rechargerFactures}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de sélection de modèle */}
      {isModeleSelectorOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-[600px] relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={closeModelSelector}
              className="absolute top-3 right-3 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-1 rounded-full hover:bg-gray-400 dark:hover:bg-gray-600 transform hover:scale-105 transition-transform duration-300"
            >
              <FiX size={16} />
            </button>
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
              Choisir un modèle de facture
            </h2>

            {loadingModeles ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${selectedModeleId === null
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                      : "hover:border-gray-400"
                      }`}
                    onClick={() => setSelectedModeleId(null)}
                  >
                    <div className="font-semibold">Modèle par défaut</div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Utiliser le modèle standard pour votre papier à en-tête
                    </p>
                  </div>

                  {modeles.map((modele) => (
                    <div
                      key={modele.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${selectedModeleId === modele.id
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                        : "hover:border-gray-400"
                        }`}
                      onClick={() => setSelectedModeleId(modele.id)}
                    >
                      <div className="font-semibold">{modele.nom}</div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {modele.description}
                      </p>
                      <div className="flex items-center mt-2">
                        <div
                          className="w-4 h-4 rounded-full mr-2"
                          style={{
                            backgroundColor: modele.style.couleurPrimaire,
                          }}
                        ></div>
                        <div
                          className="w-4 h-4 rounded-full mr-2"
                          style={{
                            backgroundColor: modele.style.couleurSecondaire,
                          }}
                        ></div>
                        <span className="text-xs text-gray-500">
                          {modele.style.police}
                        </span>
                        {modele.actif && (
                          <span className="ml-auto text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            Par défaut
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={closeModelSelector}
                    className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 mr-2"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={generatePDFWithSelectedTemplate}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    Générer PDF
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal d'envoi d'email */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-[600px] relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={closeEmailModal}
              className="absolute top-3 right-3 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-1 rounded-full hover:bg-gray-400 dark:hover:bg-gray-600 transform hover:scale-105 transition-transform duration-300"
            >
              <FiX size={16} />
            </button>
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
              Envoyer l'email - Facture {factureForEmail?.numero}
            </h2>

            {factureForEmail && (
              <>
                <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    <strong>Client:</strong> {factureForEmail.client.nom}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    <strong>Montant:</strong> {formaterMontant(factureForEmail.totalTTC)}
                  </p>
                </div>

                {/* Section de sélection des emails */}
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                  <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-3 flex items-center">
                    <FiMail className="mr-2" />
                    Sélectionner les destinataires
                  </h3>

                  {(() => {
                    // Récupérer tous les emails disponibles
                    const allEmails: { email: string; isDefault?: boolean; label?: string }[] = [];

                    // Ajouter les emails de la nouvelle structure
                    if (factureForEmail.client.emails && factureForEmail.client.emails.length > 0) {
                      factureForEmail.client.emails.forEach(e => {
                        if (e.email && e.email.trim()) {
                          allEmails.push({
                            email: e.email.trim(),
                            isDefault: e.isDefault,
                            label: 'Contact'
                          });
                        }
                      });
                    }

                    // Ajouter l'email de l'ancienne structure si il n'est pas déjà présent
                    if (factureForEmail.client.email && factureForEmail.client.email.trim() &&
                      !allEmails.some(e => e.email === factureForEmail.client.email?.trim())) {
                      allEmails.push({
                        email: factureForEmail.client.email.trim(),
                        label: 'Principal'
                      });
                    }

                    return allEmails.length > 0 ? (
                      <div className="space-y-2">
                        {allEmails.map((emailObj, index) => (
                          <label key={index} className="flex items-center space-x-3 p-2 hover:bg-blue-100 dark:hover:bg-blue-800/50 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedEmails.includes(emailObj.email)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedEmails([...selectedEmails, emailObj.email]);
                                } else {
                                  setSelectedEmails(selectedEmails.filter(email => email !== emailObj.email));
                                }
                              }}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                            />
                            <div className="flex-1">
                              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                {emailObj.email}
                              </span>
                              <div className="flex items-center space-x-2">
                                {emailObj.label && (
                                  <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                                    {emailObj.label}
                                  </span>
                                )}
                                {emailObj.isDefault && (
                                  <span className="text-xs bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                                    Principal
                                  </span>
                                )}
                              </div>
                            </div>
                          </label>
                        ))}

                        <div className="mt-3 pt-2 border-t border-blue-200 dark:border-blue-700">
                          <div className="flex justify-between text-xs">
                            <button
                              type="button"
                              onClick={() => setSelectedEmails(allEmails.map(e => e.email))}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            >
                              Tout sélectionner
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedEmails([])}
                              className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
                            >
                              Tout désélectionner
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {selectedEmails.length} email(s) sélectionné(s)
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Aucun email disponible pour ce client
                      </p>
                    );
                  })()}
                </div>
              </>
            )}

            <div className="space-y-4">
              <div className="flex flex-col">
                <label
                  htmlFor="email-type"
                  className="block font-semibold text-gray-800 dark:text-white mb-2"
                >
                  Type d'email
                </label>
                <select
                  value={emailType}
                  onChange={(e) => setEmailType(e.target.value as 'invoice' | 'reminder' | 'overdue')}
                  className="w-full p-2 border rounded bg-white text-gray-800"
                  required
                >
                  <option value="invoice">Facture (envoi initial)</option>
                  <option value="reminder">Rappel (échéance proche)</option>
                  <option value="overdue">Retard de paiement</option>
                </select>
              </div>

              <div className="flex flex-col">
                <label
                  htmlFor="custom-message"
                  className="block font-semibold text-gray-800 dark:text-white mb-2"
                >
                  Message personnalisé (optionnel)
                </label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="w-full p-2 border rounded bg-white text-gray-800"
                  placeholder="Laissez vide pour utiliser le message par défaut"
                  rows={4}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  onClick={closeEmailModal}
                  className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
                  disabled={emailLoading}
                >
                  Annuler
                </button>
                <button
                  onClick={sendInvoiceEmail}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
                  disabled={emailLoading}
                >
                  {emailLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Envoi...
                    </>
                  ) : (
                    <>
                      <FiMail className="mr-2" />
                      Envoyer l'email
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gestionnaire de modales */}
      <ModalManager
        isOpen={modal.isOpen}
        onClose={modal.closeModal}
        onConfirm={modal.handleConfirm}
        modalType={modal.modalType}
        modalData={modal.modalData}
        isLoading={modal.isLoading}
      />
    </div>
  );
}
