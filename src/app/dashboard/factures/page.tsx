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
} from "firebase/firestore";
import {
  FiArrowLeft,
  FiEdit,
  FiTrash2,
  FiFileText,
  FiX,
  FiEye,
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

// Fonction pour générer un nouveau numéro de facture
const generateNewInvoiceNumber = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `FCT-${year}${month}-${random}`;
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

export default function FacturesPage() {
  const router = useRouter();
  const { user } = useAuth();
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
      delaisPaiement: "30 jours",
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

  // État pour le modal de sélection de modèle
  const [isModeleSelectorOpen, setIsModeleSelectorOpen] = useState(false);
  const [modeles, setModeles] = useState<ModeleFacture[]>([]);
  const [selectedModeleId, setSelectedModeleId] = useState<string | null>(null);
  const [factureForPDF, setFactureForPDF] = useState<Facture | null>(null);
  const [loadingModeles, setLoadingModeles] = useState(false);

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

    console.log("[DEBUG] Utilisateur connecté:", {
      uid: user.uid,
      email: user.email,
      isAnonymous: user.isAnonymous
    });

    // Test de connexion à Firestore
    const testFirestoreConnection = async () => {
      try {
        const testDoc = doc(db, "test", "connection");
        await getDoc(testDoc);
        console.log("[DEBUG] Connexion à Firestore réussie");
      } catch (error) {
        console.error("[DEBUG] Erreur de connexion à Firestore:", error);
      }
    };

    testFirestoreConnection();

    const facturesQuery = query(
      collection(db, "factures"),
      where("userId", "==", user.uid)
    );

    console.log("[DEBUG] Requête Firestore:", {
      collection: "factures",
      userId: user.uid
    });

    const unsubscribe = onSnapshot(facturesQuery, async (snapshot) => {
      try {
        console.log("[DEBUG] Récupération des factures...");
        const facturesData = snapshot.docs.map((doc) => {
          const data = doc.data();
          console.log("[DEBUG] Facture brute:", {
            id: doc.id,
            userId: data.userId,
            data: data
          });
          return {
            id: doc.id,
            ...data,
            dateCreation: data.dateCreation ? convertToDate(data.dateCreation) : new Date(),
          };
        }) as Facture[];
        console.log("[DEBUG] Factures formatées:", facturesData);
        setFactures(facturesData);

        // Vérifier les limites du plan
        try {
          const userPlan = await getUserPlan(user.uid);
          console.log("[DEBUG] Plan utilisateur:", userPlan);
          const isLimitReached = await checkPlanLimit(
            user.uid,
            "factures",
            facturesData.length
          );
          setLimitReached(isLimitReached);

          setPlanInfo({
            planId: userPlan.planId,
            maxFactures:
              userPlan.limites.factures === -1
                ? Infinity
                : userPlan.limites.factures,
            currentFactures: facturesData.length,
          });
        } catch (err) {
          console.error("[DEBUG] Erreur lors de la vérification des limites:", err);
        }
      } catch (error) {
        console.error("[DEBUG] Erreur lors de la récupération des factures:", error);
      }
    }, (error) => {
      console.error("[DEBUG] Erreur de souscription aux factures:", error);
    });

    // Récupérer les clients depuis Firestore
    const clientsQuery = query(
      collection(db, "clients"),
      where("userId", "==", user.uid)
    );

    const clientsUnsubscribe = onSnapshot(clientsQuery, (snapshot) => {
      const clientsData = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      })) as Client[];
      setClients(clientsData);
    });

    return () => {
      unsubscribe();
      clientsUnsubscribe();
    };
  }, [user, router]);

  // Utiliser useCallback pour la fonction openEditModal
  const openEditModal = useCallback(
    (facture: Facture) => {
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

      setNewFacture({
        userId: facture.userId || user?.uid || "",
        numero: facture.numero,
        client: facture.client,
        statut: facture.statut,
        articles: facture.articles,
        totalHT: facture.totalHT,
        totalTTC: facture.totalTTC,
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
      alert(
        `Vous avez atteint la limite de ${planInfo.currentFactures} facture(s) pour votre plan ${planInfo.planId}. Veuillez passer à un forfait supérieur pour ajouter plus de factures.`
      );
      return;
    }

    setSelectedFacture(null);
    setNewFacture({
      userId: user?.uid || "",
      numero: generateNewInvoiceNumber(),
      statut: "En attente",
      client: {
        id: "",
        refClient: "",
        nom: "",
        rue: "",
        codePostal: "",
        ville: "",
        email: "",
        delaisPaiement: "30 jours",
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
        delaisPaiement: "30 jours",
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
        ...newFacture.articles,
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
        ...newFacture.articles,
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
    const updatedArticles = [...newFacture.articles];
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
    const updatedArticles = newFacture.articles.filter(
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
    const selectedClient = clients.find((c) => c.id === clientId);
    if (selectedClient) {
      setNewFacture({
        ...newFacture,
        client: selectedClient,
      });
    }
  };

  // Validation du formulaire avec sauvegarde Firebase
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!user) {
      console.log("[DEBUG] Tentative de création de facture sans utilisateur");
      alert("Vous devez être connecté pour effectuer cette action");
      return;
    }

    try {
      console.log("[DEBUG] Début de la création/modification de facture");
      const factureData = {
        userId: user.uid,
        numero: newFacture.numero,
        client: newFacture.client,
        statut: newFacture.statut,
        articles: newFacture.articles,
        totalHT: newFacture.totalHT,
        totalTTC: newFacture.totalTTC,
        dateCreation: Timestamp.fromDate(
          newFacture.dateCreation instanceof Date 
            ? newFacture.dateCreation 
            : new Date()
        ),
      };
      console.log("[DEBUG] Données de la facture à sauvegarder:", factureData);

      if (selectedFacture && selectedFacture.id) {
        // Modification d'une facture existante
        console.log("[DEBUG] Modification de la facture existante:", selectedFacture.id);
        const factureRef = doc(db, "factures", selectedFacture.id);
        await updateDoc(factureRef, factureData);
      } else {
        // Vérifier à nouveau les limites avant la création
        const isLimitReached = await checkPlanLimit(
          user.uid,
          "factures",
          factures.length
        );

        if (isLimitReached) {
          console.log("[DEBUG] Limite de factures atteinte");
          alert(
            `Vous avez atteint la limite de ${planInfo.currentFactures} facture(s) pour votre plan ${planInfo.planId}. Veuillez passer à un forfait supérieur pour ajouter plus de factures.`
          );
          return;
        }

        // Création d'une nouvelle facture
        console.log("[DEBUG] Création d'une nouvelle facture");
        await addDoc(collection(db, "factures"), factureData);
      }
      closeModal();
    } catch (error) {
      console.error("[DEBUG] Erreur lors de la sauvegarde de la facture:", error);
      alert("Erreur lors de la sauvegarde de la facture");
    }
  };

  // Suppression d'une facture
  const deleteFacture = async (id: string) => {
    try {
      await deleteDoc(doc(db, "factures", id));
    } catch (error) {
      console.error("Erreur lors de la suppression de la facture:", error);
      alert("Erreur lors de la suppression de la facture");
    }
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

  // Fonction pour générer le PDF avec un modèle spécifique ou par défaut
  const generatePDFWithSelectedTemplate = async () => {
    if (!factureForPDF) return;

    try {
      if (selectedModeleId) {
        await generateInvoicePDFWithSelectedTemplate(
          factureForPDF,
          selectedModeleId
        );
      } else {
        await generateInvoicePDF(factureForPDF);
      }
      closeModelSelector();
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      alert("Erreur lors de la génération du PDF");
    }
  };

  // Fonction pour générer le PDF de la facture (utilisation directe)
  const generatePDF = async (facture: Facture) => {
    try {
      await generateInvoicePDF(facture);
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      alert("Erreur lors de la génération du PDF");
    }
  };

  return (
    <div className="p-6 bg-background-light dark:bg-background-dark">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-semibold text-text-light dark:text-text-dark">
          📜 Factures
        </h1>
        <div className="flex space-x-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-800 flex items-center transform hover:scale-105 transition-transform duration-300"
          >
            <FiArrowLeft size={18} className="mr-2" /> Retour
          </button>
          <button
            onClick={() => router.push("/dashboard/factures/modeles")}
            className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 flex items-center transform hover:scale-105 transition-transform duration-300"
          >
            📝 Modèles
          </button>
          <button
            onClick={() => router.push("/dashboard/factures/recurrentes")}
            className="bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 flex items-center transform hover:scale-105 transition-transform duration-300"
          >
            🔄 Récurrentes
          </button>
          <button
            onClick={openModal}
            disabled={limitReached}
            className={`${
              limitReached
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gray-800 hover:bg-gray-600 transform hover:scale-105"
            } text-white py-2 px-4 rounded-md transition-transform duration-300`}
          >
            Ajouter une facture
          </button>
        </div>
      </div>

      {/* Information sur les limites du plan */}
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

      {/* Tableau des factures */}
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
                    <a
                      href={`/dashboard/factures/${facture.id}`}
                      className="hover:text-blue-500 hover:underline cursor-pointer font-medium"
                    >
                      {facture.numero}
                    </a>
                  </td>
                  <td className="py-3 px-4 text-text-light dark:text-text-dark">
                    {facture.client.nom}
                  </td>
                  <td className="py-3 px-4 text-text-light dark:text-text-dark">
                    {formatDate(facture.dateCreation)}
                  </td>
                  <td className="py-3 px-4 text-text-light dark:text-text-dark">
                    {facture.totalTTC.toFixed(2)} €
                  </td>
                  <td className="py-3 px-4 text-text-light dark:text-text-dark">
                    <span
                      className={`py-1 px-3 rounded-full text-white text-sm ${
                        facture.statut === "Payée"
                          ? "bg-green-500"
                          : facture.statut === "En attente"
                          ? "bg-yellow-500"
                          : facture.statut === "Envoyée"
                          ? "bg-blue-500"
                          : "bg-red-500"
                      }`}
                    >
                      {facture.statut}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() =>
                        router.push(`/dashboard/factures/${facture.id}`)
                      }
                      className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white mx-1"
                      title="Voir détails"
                    >
                      <FiEye size={18} />
                    </button>
                    <button
                      onClick={() => openModelSelector(facture)}
                      className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white mx-1"
                      title="Générer PDF"
                    >
                      <FiFileText size={18} />
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
      </div>

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
                <input
                  type="text"
                  placeholder="Numéro de facture"
                  value={newFacture.numero}
                  onChange={(e) =>
                    setNewFacture({
                      ...newFacture,
                      numero: e.target.value.toUpperCase(),
                    })
                  }
                  className="w-full p-2 border bg-white text-gray-800"
                  required
                />
                <select
                  value={newFacture.statut}
                  onChange={(e) =>
                    setNewFacture({
                      ...newFacture,
                      statut: e.target.value as Facture["statut"],
                    })
                  }
                  className="w-full p-2 border bg-white text-gray-800"
                  required
                >
                  <option value="En attente">En attente</option>
                  <option value="Envoyée">Envoyée</option>
                  <option value="Payée">Payée</option>
                  <option value="À relancer">À relancer</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label
                    htmlFor="date-facture"
                    className="block font-semibold text-gray-800 dark:text-white mb-2"
                  >
                    Date de la facture
                  </label>
                  <input
                    type="date"
                    id="date-facture"
                    value={formatDate(newFacture.dateCreation).split('/').reverse().join('-')}
                    onChange={(e) => {
                      const date = e.target.value ? new Date(e.target.value) : new Date();
                      date.setHours(12, 0, 0, 0); // Midi pour éviter les problèmes de fuseau horaire
                      setNewFacture({
                        ...newFacture,
                        dateCreation: date,
                      });
                    }}
                    className="w-full p-2 border rounded bg-white text-gray-800"
                    required
                  />
                </div>
                <div></div>
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
              {newFacture.articles.map((article, index) => (
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
                    className={`flex-1 p-2 border text-gray-800 ${
                      article.isComment ? "bg-gray-50" : "bg-white"
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
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      selectedModeleId === null
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
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        selectedModeleId === modele.id
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
    </div>
  );
}
