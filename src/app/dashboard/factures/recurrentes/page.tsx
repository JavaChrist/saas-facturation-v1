"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FiArrowLeft,
  FiPlusCircle,
  FiEdit,
  FiTrash2,
  FiPlay,
} from "react-icons/fi";
import { useAuth } from "@/lib/authContext";
import {
  getFacturesRecurrentes,
  deleteFactureRecurrente,
  genererFactureDepuisRecurrente,
} from "@/services/factureRecurrenteService";
import { FactureRecurrente } from "@/types/modeleFacture";
import { getDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Client } from "@/types/facture";

export default function FacturesRecurrentesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [facturesRecurrentes, setFacturesRecurrentes] = useState<
    FactureRecurrente[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les factures récurrentes
  useEffect(() => {
    if (!user) return;

    const fetchFacturesRecurrentes = async () => {
      try {
        setLoading(true);
        console.log(
          "Tentative de récupération des factures récurrentes pour l'utilisateur:",
          user.uid
        );
        const factures = await getFacturesRecurrentes(user.uid);
        console.log("Factures récurrentes récupérées avec succès:", factures);
        setFacturesRecurrentes(factures);
      } catch (err) {
        console.error(
          "Erreur détaillée lors du chargement des factures récurrentes:",
          err
        );
        if (err instanceof Error) {
          setError(
            `Impossible de charger les factures récurrentes: ${err.message}. Veuillez réessayer.`
          );
        } else {
          setError(
            "Impossible de charger les factures récurrentes. Veuillez réessayer."
          );
        }
      } finally {
        setLoading(false);
      }
    };

    fetchFacturesRecurrentes();
  }, [user]);

  // Naviguer vers la création d'une nouvelle facture récurrente
  const handleCreateNew = () => {
    router.push("/dashboard/factures/recurrentes/creer");
  };

  // Naviguer vers l'édition d'une facture récurrente
  const handleEdit = (factureId: string) => {
    router.push(`/dashboard/factures/recurrentes/editer?id=${factureId}`);
  };

  // Supprimer une facture récurrente
  const handleDelete = async (factureId: string) => {
    if (
      confirm(
        "Êtes-vous sûr de vouloir supprimer cette facturation récurrente?"
      )
    ) {
      try {
        await deleteFactureRecurrente(factureId);
        setFacturesRecurrentes(
          facturesRecurrentes.filter((f) => f.id !== factureId)
        );
      } catch (err) {
        console.error("Erreur lors de la suppression:", err);
        alert(
          "Impossible de supprimer la facturation récurrente. Veuillez réessayer."
        );
      }
    }
  };

  // Générer manuellement une facture depuis une facturation récurrente
  const handleGenerate = async (factureRecurrente: FactureRecurrente) => {
    try {
      // Récupérer le client
      const clientDoc = await getDoc(
        doc(db, "clients", factureRecurrente.clientId)
      );
      if (!clientDoc.exists()) {
        alert("Client introuvable");
        return;
      }

      const client = { id: clientDoc.id, ...clientDoc.data() } as Client;

      // Générer la facture
      const factureId = await genererFactureDepuisRecurrente(
        factureRecurrente,
        client
      );

      // Rediriger vers la facture créée
      router.push(`/dashboard/factures?id=${factureId}`);
    } catch (err) {
      console.error("Erreur lors de la génération de la facture:", err);
      alert("Impossible de générer la facture. Veuillez réessayer.");
    }
  };

  // Formater la fréquence pour l'affichage
  const formatFrequence = (
    frequence: string,
    jourEmission: number,
    moisEmission?: number[]
  ) => {
    switch (frequence) {
      case "mensuelle":
        return `Mensuelle (le ${jourEmission} de chaque mois)`;
      case "trimestrielle":
        return `Trimestrielle (le ${jourEmission} du mois)`;
      case "semestrielle":
        return `Semestrielle (le ${jourEmission} du mois)`;
      case "annuelle":
        return `Annuelle (le ${jourEmission} du mois)`;
      default:
        return frequence;
    }
  };

  return (
    <div className="p-6 bg-background-light dark:bg-background-dark">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-semibold text-gray-800 dark:text-white">
          🔄 Facturations Récurrentes
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
            <FiPlusCircle size={18} className="mr-2" /> Nouvelle facturation
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
      ) : facturesRecurrentes.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-500 dark:text-gray-300 text-lg">
            Aucune facturation récurrente configurée
          </p>
          <button
            onClick={handleCreateNew}
            className="mt-4 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 flex items-center mx-auto"
          >
            <FiPlusCircle size={18} className="mr-2" /> Créer ma première
            facturation récurrente
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full bg-white dark:bg-gray-800 shadow-md rounded-lg">
            <thead className="bg-gray-800 text-white">
              <tr>
                <th className="py-3 px-4 text-left">Client</th>
                <th className="py-3 px-4 text-left">Fréquence</th>
                <th className="py-3 px-4 text-left">Montant TTC</th>
                <th className="py-3 px-4 text-left">Prochaine émission</th>
                <th className="py-3 px-4 text-left">Dernière émission</th>
                <th className="py-3 px-4 text-left">Statut</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {facturesRecurrentes.map((facture) => (
                <tr
                  key={facture.id}
                  className="border-b dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <td className="py-3 px-4 text-gray-800 dark:text-gray-200">
                    {facture.clientId}{" "}
                    {/* Idéalement, afficher le nom du client */}
                  </td>
                  <td className="py-3 px-4 text-gray-800 dark:text-gray-200">
                    {formatFrequence(
                      facture.frequence,
                      facture.jourEmission,
                      facture.moisEmission
                    )}
                  </td>
                  <td className="py-3 px-4 text-gray-800 dark:text-gray-200">
                    {facture.montantTTC.toFixed(2)} €
                  </td>
                  <td className="py-3 px-4 text-gray-800 dark:text-gray-200">
                    {facture.prochaineEmission.toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-gray-800 dark:text-gray-200">
                    {facture.derniereEmission
                      ? facture.derniereEmission.toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="py-3 px-4 text-gray-800 dark:text-gray-200">
                    <span
                      className={`py-1 px-3 rounded-full text-white text-sm ${
                        facture.actif ? "bg-green-500" : "bg-red-500"
                      }`}
                    >
                      {facture.actif ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex justify-center space-x-3">
                      <button
                        onClick={() => handleGenerate(facture)}
                        className="text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                        title="Générer maintenant"
                      >
                        <FiPlay size={18} />
                      </button>
                      <button
                        onClick={() => handleEdit(facture.id)}
                        className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        title="Modifier"
                      >
                        <FiEdit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(facture.id)}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        title="Supprimer"
                      >
                        <FiTrash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
