"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
  query,
  where,
} from "firebase/firestore";
import { FiArrowLeft, FiEdit, FiTrash2, FiFileText } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { Facture, Client, Article } from "@/types/facture";
import { generateInvoicePDF } from "@/services/pdfGenerator";
import { useAuth } from "@/lib/authContext";

export default function FacturesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [factures, setFactures] = useState<Facture[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newFacture, setNewFacture] = useState<Omit<Facture, "id">>({
    numero: "",
    client: {
      id: "",
      refClient: "",
      nom: "",
      rue: "",
      codePostal: "",
      ville: "",
      email: "",
      delaisPaiement: "Comptant",
    },
    statut: "En attente",
    articles: [],
    totalHT: 0,
    totalTTC: 0,
    userId: user?.uid || "",
    dateCreation: new Date(),
  });
  const [selectedFacture, setSelectedFacture] = useState<Facture | null>(null);

  // Charger les factures depuis Firestore
  useEffect(() => {
    if (!user) return;

    const facturesQuery = query(
      collection(db, "factures"),
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(facturesQuery, (snapshot) => {
      const facturesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        dateCreation: doc.data().dateCreation?.toDate(),
      })) as Facture[];
      setFactures(facturesData);
    });

    return () => unsubscribe();
  }, [user]);

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
    // Générer un nouveau numéro de facture
    const newNumero = `FCT-${new Date().getFullYear()}${String(
      factures.length + 1
    ).padStart(3, "0")}`;
    setNewFacture({
      ...newFacture,
      numero: newNumero,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (facture: Facture) => {
    setSelectedFacture(facture);
    setNewFacture({
      numero: facture.numero,
      client: facture.client,
      statut: facture.statut,
      articles: facture.articles,
      totalHT: facture.totalHT,
      totalTTC: facture.totalTTC,
      userId: facture.userId || user?.uid || "",
      dateCreation: facture.dateCreation
        ? new Date(facture.dateCreation)
        : new Date(),
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedFacture(null);
    setNewFacture({
      numero: "",
      client: {
        id: "",
        refClient: "",
        nom: "",
        rue: "",
        codePostal: "",
        ville: "",
        email: "",
        delaisPaiement: "Comptant",
      },
      statut: "En attente",
      articles: [],
      totalHT: 0,
      totalTTC: 0,
      userId: user?.uid || "",
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
          quantite: 1,
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
      alert("Vous devez être connecté pour effectuer cette action");
      return;
    }

    try {
      if (selectedFacture) {
        // Modification d'une facture existante
        await updateDoc(doc(db, "factures", selectedFacture.id), {
          numero: newFacture.numero,
          client: newFacture.client,
          statut: newFacture.statut,
          articles: newFacture.articles,
          totalHT: newFacture.totalHT,
          totalTTC: newFacture.totalTTC,
          dateCreation: newFacture.dateCreation,
          userId: user.uid,
        });
      } else {
        // Création d'une nouvelle facture
        await addDoc(collection(db, "factures"), {
          numero: newFacture.numero,
          client: newFacture.client,
          statut: newFacture.statut,
          articles: newFacture.articles,
          totalHT: newFacture.totalHT,
          totalTTC: newFacture.totalTTC,
          dateCreation: newFacture.dateCreation,
          userId: user.uid,
        });
      }
      closeModal();
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de la facture:", error);
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

  // Fonction pour générer le PDF de la facture
  const generatePDF = async (facture: Facture) => {
    try {
      await generateInvoicePDF(facture);
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      alert("Erreur lors de la génération du PDF");
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-semibold">📜 Factures</h1>
        <div className="flex space-x-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-800 flex items-center transform hover:scale-105 transition-transform duration-300"
          >
            <FiArrowLeft size={18} className="mr-2" /> Retour
          </button>
          <button
            onClick={openModal}
            className="bg-gray-800 text-white py-2 px-4 rounded-md hover:bg-gray-600 transform hover:scale-105 transition-transform duration-300"
          >
            Ajouter une facture
          </button>
        </div>
      </div>

      {/* Tableau des factures */}
      <div className="overflow-x-auto">
        <table className="w-full bg-white shadow-md rounded-lg">
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
                <tr key={facture.id} className="border-b hover:bg-gray-100">
                  <td className="py-3 px-4">{facture.numero}</td>
                  <td className="py-3 px-4">{facture.client.nom}</td>
                  <td className="py-3 px-4">
                    {facture.dateCreation instanceof Date
                      ? facture.dateCreation.toLocaleDateString("fr-FR")
                      : facture.dateCreation
                      ? new Date(facture.dateCreation).toLocaleDateString(
                          "fr-FR"
                        )
                      : "-"}
                  </td>
                  <td className="py-3 px-4">{facture.totalTTC.toFixed(2)} €</td>
                  <td className="py-3 px-4">
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
                  <td className="py-3 px-4 text-center flex justify-center space-x-2">
                    <button
                      onClick={() => generatePDF(facture)}
                      className="text-gray-600 hover:text-gray-800"
                      title="Générer PDF"
                    >
                      <FiFileText size={18} />
                    </button>
                    <button
                      onClick={() => openEditModal(facture)}
                      className="text-blue-500 hover:text-blue-700"
                      title="Modifier"
                    >
                      <FiEdit size={18} />
                    </button>
                    <button
                      onClick={() => deleteFacture(facture.id)}
                      className="text-red-500 hover:text-red-700"
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
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-lg w-[1200px] relative">
            <button
              onClick={closeModal}
              className="absolute top-3 right-3 bg-gray-300 text-gray-800 px-3 py-1 rounded-full hover:bg-gray-400 transform hover:scale-105 transition-transform duration-300"
            >
              ❌
            </button>
            <h2 className="text-xl font-semibold mb-4">
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
                  className="w-full p-2 border"
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
                  className="w-full p-2 border"
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
                    className="text-sm text-gray-600 mb-1"
                  >
                    Date de la facture
                  </label>
                  <input
                    type="date"
                    id="date-facture"
                    value={
                      newFacture.dateCreation
                        ? new Date(newFacture.dateCreation)
                            .toISOString()
                            .split("T")[0]
                        : ""
                    }
                    onChange={(e) => {
                      const date = e.target.value
                        ? new Date(e.target.value)
                        : new Date();
                      date.setHours(12, 0, 0, 0); // Midi pour éviter les problèmes de fuseau horaire
                      setNewFacture({
                        ...newFacture,
                        dateCreation: date,
                      });
                    }}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div></div>
              </div>

              <select
                value={newFacture.client.id}
                onChange={(e) => handleClientChange(e.target.value)}
                className="w-full p-2 border"
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
                <div className="bg-gray-100 p-4 rounded-md">
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

              <h3 className="font-semibold">Articles</h3>
              {newFacture.articles.map((article, index) => (
                <div key={article.id} className="flex space-x-2">
                  <input
                    type="text"
                    placeholder={
                      article.isComment ? "Commentaire" : "Description"
                    }
                    value={article.description}
                    onChange={(e) =>
                      handleArticleChange(index, "description", e.target.value)
                    }
                    className={`flex-1 p-2 border ${
                      article.isComment ? "bg-gray-50" : ""
                    }`}
                  />
                  {!article.isComment && (
                    <>
                      <input
                        type="number"
                        placeholder="Qté"
                        value={article.quantite}
                        onChange={(e) =>
                          handleArticleChange(
                            index,
                            "quantite",
                            Number(e.target.value)
                          )
                        }
                        className="w-16 p-2 border"
                      />
                      <input
                        type="number"
                        placeholder="Prix HT"
                        value={article.prixUnitaireHT}
                        onChange={(e) =>
                          handleArticleChange(
                            index,
                            "prixUnitaireHT",
                            Number(e.target.value)
                          )
                        }
                        className="w-24 p-2 border"
                      />
                      <input
                        type="number"
                        placeholder="TVA %"
                        value={article.tva}
                        onChange={(e) =>
                          handleArticleChange(
                            index,
                            "tva",
                            Number(e.target.value)
                          )
                        }
                        className="w-16 p-2 border"
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
    </div>
  );
}
