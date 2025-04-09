"use client";
import React, { useEffect, useState } from "react";
import { FiUsers, FiFileText, FiClock, FiTrendingUp } from "react-icons/fi";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User } from "firebase/auth";
import { DateRange } from "./DateFilter";

interface Facture {
  id: string;
  dateCreation: any; // Accepte différents formats de date
  totalTTC: number;
  statut: string;
  userId: string;
}

interface Client {
  id: string;
  dateCreation: any;
  userId: string;
}

interface Stats {
  totalMontantFactures: number;
  totalClients: number;
  facturesEnAttente: number;
  moyenneFacture: number;
}

interface DashboardStatsProps {
  user: User;
  dateRange: DateRange;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ user, dateRange }) => {
  const [stats, setStats] = useState<Stats>({
    totalMontantFactures: 0,
    totalClients: 0,
    facturesEnAttente: 0,
    moyenneFacture: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatsForDateRange = async () => {
      if (!user) return;

      setLoading(true);

      try {
        // Récupérer toutes les factures de l'utilisateur
        const facturesRef = collection(db, "factures");
        const userFacturesQuery = query(
          facturesRef,
          where("userId", "==", user.uid)
        );
        const facturesSnapshot = await getDocs(userFacturesQuery);

        // Filtrer les factures par date
        const facturesInRange: Facture[] = [];
        let facturesEnAttente = 0;
        let totalMontant = 0;

        facturesSnapshot.forEach((doc) => {
          const facture = doc.data() as Facture;
          facture.id = doc.id;

          let factureDate: Date | null = null;

          // Convertir la date de facture en objet Date
          try {
            if (typeof facture.dateCreation === "string") {
              factureDate = new Date(facture.dateCreation);
            } else if (facture.dateCreation instanceof Date) {
              factureDate = facture.dateCreation;
            } else if (
              facture.dateCreation &&
              facture.dateCreation.toDate &&
              typeof facture.dateCreation.toDate === "function"
            ) {
              factureDate = facture.dateCreation.toDate();
            } else if (
              facture.dateCreation &&
              facture.dateCreation.seconds &&
              typeof facture.dateCreation.seconds === "number"
            ) {
              factureDate = new Date(facture.dateCreation.seconds * 1000);
            }
          } catch (error) {
            console.error("Erreur lors de la conversion de date:", error);
          }

          // Vérifier si la facture est dans la plage de dates
          if (
            factureDate &&
            factureDate >= dateRange.startDate &&
            factureDate <= dateRange.endDate
          ) {
            facturesInRange.push(facture);

            if (facture.statut === "En attente") {
              facturesEnAttente++;
            }

            totalMontant += parseFloat(facture.totalTTC) || 0;
          }
        });

        // Récupérer les clients de l'utilisateur
        const clientsRef = collection(db, "clients");
        const userClientsQuery = query(
          clientsRef,
          where("userId", "==", user.uid)
        );
        const clientsSnapshot = await getDocs(userClientsQuery);

        // Filtrer les clients par date
        const clientsInRange: Client[] = [];

        clientsSnapshot.forEach((doc) => {
          const client = doc.data() as Client;
          client.id = doc.id;

          let clientDate: Date | null = null;

          // Convertir la date du client en objet Date
          try {
            if (client.dateCreation) {
              if (typeof client.dateCreation === "string") {
                clientDate = new Date(client.dateCreation);
              } else if (client.dateCreation instanceof Date) {
                clientDate = client.dateCreation;
              } else if (
                client.dateCreation.toDate &&
                typeof client.dateCreation.toDate === "function"
              ) {
                clientDate = client.dateCreation.toDate();
              } else if (
                client.dateCreation.seconds &&
                typeof client.dateCreation.seconds === "number"
              ) {
                clientDate = new Date(client.dateCreation.seconds * 1000);
              }
            }
          } catch (error) {
            console.error("Erreur lors de la conversion de date:", error);
          }

          // Vérifier si le client est dans la plage de dates
          if (
            !client.dateCreation || // Inclure tous les clients si pas de date
            (clientDate &&
              clientDate >= dateRange.startDate &&
              clientDate <= dateRange.endDate)
          ) {
            clientsInRange.push(client);
          }
        });

        // Calculer la moyenne par facture
        const moyenneFacture =
          facturesInRange.length > 0
            ? totalMontant / facturesInRange.length
            : 0;

        // Mettre à jour les statistiques
        setStats({
          totalMontantFactures: totalMontant,
          totalClients: clientsInRange.length,
          facturesEnAttente: facturesEnAttente,
          moyenneFacture: moyenneFacture,
        });
      } catch (error) {
        console.error(
          "Erreur lors de la récupération des statistiques:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStatsForDateRange();
  }, [user, dateRange]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Vue d'ensemble</h2>
        <span className="text-sm text-gray-500">{dateRange.label}</span>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md transform hover:scale-105 transition-transform duration-300">
            <div className="flex items-center justify-between w-full">
              <div>
                <p className="text-gray-500 mb-2">Total Factures</p>
                <h2 className="text-3xl font-bold">
                  {stats.totalMontantFactures.toLocaleString("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </h2>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <FiFileText className="text-blue-500 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md transform hover:scale-105 transition-transform duration-300">
            <div className="flex items-center justify-between w-full">
              <div>
                <p className="text-gray-500 mb-2">Montant moyen</p>
                <h2 className="text-3xl font-bold">
                  {stats.moyenneFacture.toLocaleString("fr-FR", {
                    style: "currency",
                    currency: "EUR",
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </h2>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <FiTrendingUp className="text-purple-500 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md transform hover:scale-105 transition-transform duration-300">
            <div className="flex items-center justify-between w-full">
              <div>
                <p className="text-gray-500 mb-2">Clients</p>
                <h2 className="text-3xl font-bold">{stats.totalClients}</h2>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <FiUsers className="text-green-500 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md transform hover:scale-105 transition-transform duration-300">
            <div className="flex items-center justify-between w-full">
              <div>
                <p className="text-gray-500 mb-2">Factures en attente</p>
                <h2 className="text-3xl font-bold">
                  {stats.facturesEnAttente}
                </h2>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full">
                <FiClock className="text-yellow-500 text-xl" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardStats;
