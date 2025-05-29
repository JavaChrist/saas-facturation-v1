"use client";
import React, { useEffect, useState } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User } from "firebase/auth";
import { DateRange } from "./DateFilter";
import { TbCash, TbUsers, TbFileInvoice } from "react-icons/tb";

interface Facture {
  id: string;
  dateCreation: any; // Accepte différents formats de date
  totalTTC: number;
  totalHT: number; // Ajout du montant HT
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
  totalMontantFacturesHT: number; // Ajout du total HT
  totalClients: number;
  facturesEnAttente: number;
  moyenneFacture: number;
  moyenneFactureHT: number; // Ajout de la moyenne HT
  caTotal: number;
  caTotalHT: number; // Ajout du CA HT
  clientCount: number;
  invoiceCount: number;
  caTotalVariation: number | null;
  caTotalHTVariation: number | null; // Ajout de la variation HT
  clientCountVariation: number | null;
  invoiceCountVariation: number | null;
}

interface DashboardStatsProps {
  user: User;
  dateRange: DateRange;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ user, dateRange }) => {
  const [stats, setStats] = useState<Stats>({
    totalMontantFactures: 0,
    totalMontantFacturesHT: 0,
    totalClients: 0,
    facturesEnAttente: 0,
    moyenneFacture: 0,
    moyenneFactureHT: 0,
    caTotal: 0,
    caTotalHT: 0,
    clientCount: 0,
    invoiceCount: 0,
    caTotalVariation: null,
    caTotalHTVariation: null,
    clientCountVariation: null,
    invoiceCountVariation: null,
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
        let totalMontantHT = 0;

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

            // S'assurer que totalTTC est correctement converti en nombre
            const montant =
              typeof facture.totalTTC === "number"
                ? facture.totalTTC
                : typeof facture.totalTTC === "string"
                  ? parseFloat(facture.totalTTC) || 0
                  : 0;

            totalMontant += montant;

            // Calculer le montant HT
            const montantHT =
              typeof facture.totalHT === "number"
                ? facture.totalHT
                : typeof facture.totalHT === "string"
                  ? parseFloat(facture.totalHT) || 0
                  : 0;

            totalMontantHT += montantHT;
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

        // Calculer la moyenne par facture HT
        const moyenneFactureHT =
          facturesInRange.length > 0
            ? totalMontantHT / facturesInRange.length
            : 0;

        // Mettre à jour les statistiques
        setStats({
          totalMontantFactures: totalMontant,
          totalMontantFacturesHT: totalMontantHT,
          totalClients: clientsInRange.length,
          facturesEnAttente: facturesEnAttente,
          moyenneFacture: moyenneFacture,
          moyenneFactureHT: moyenneFactureHT,
          caTotal: totalMontant,
          caTotalHT: totalMontantHT,
          clientCount: clientsInRange.length,
          invoiceCount: facturesInRange.length,
          caTotalVariation: null,
          caTotalHTVariation: null,
          clientCountVariation: null,
          invoiceCountVariation: null,
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
      <h2 className="text-xl font-semibold mb-4 text-text-light dark:text-text-dark">
        Statistiques
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* CA total TTC */}
        <div className="bg-card-light dark:bg-card-dark p-6 rounded-lg shadow-md flex items-center">
          <div className="bg-green-100 dark:bg-green-900 p-4 rounded-lg mr-4">
            <TbCash className="text-green-500 dark:text-green-400 text-2xl" />
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">
              CA Total TTC
            </p>
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              {loading ? "Chargement..." : `${stats.caTotal.toFixed(2)} €`}
            </p>
            {stats.caTotalVariation !== null && (
              <p
                className={`text-sm ${stats.caTotalVariation >= 0
                    ? "text-green-500"
                    : "text-red-500"
                  }`}
              >
                {stats.caTotalVariation > 0 ? "+" : ""}
                {stats.caTotalVariation.toFixed(2)}% vs période précédente
              </p>
            )}
          </div>
        </div>

        {/* CA total HT */}
        <div className="bg-card-light dark:bg-card-dark p-6 rounded-lg shadow-md flex items-center">
          <div className="bg-emerald-100 dark:bg-emerald-900 p-4 rounded-lg mr-4">
            <TbCash className="text-emerald-500 dark:text-emerald-400 text-2xl" />
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">
              CA Total HT
            </p>
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              {loading ? "Chargement..." : `${stats.caTotalHT.toFixed(2)} €`}
            </p>
            {stats.caTotalHTVariation !== null && (
              <p
                className={`text-sm ${stats.caTotalHTVariation >= 0
                    ? "text-green-500"
                    : "text-red-500"
                  }`}
              >
                {stats.caTotalHTVariation > 0 ? "+" : ""}
                {stats.caTotalHTVariation.toFixed(2)}% vs période précédente
              </p>
            )}
          </div>
        </div>

        {/* Nombre clients */}
        <div className="bg-card-light dark:bg-card-dark p-6 rounded-lg shadow-md flex items-center">
          <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-lg mr-4">
            <TbUsers className="text-blue-500 dark:text-blue-400 text-2xl" />
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">
              Nombre de clients
            </p>
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              {loading ? "Chargement..." : stats.clientCount}
            </p>
            {stats.clientCountVariation !== null && (
              <p
                className={`text-sm ${stats.clientCountVariation >= 0
                    ? "text-green-500"
                    : "text-red-500"
                  }`}
              >
                {stats.clientCountVariation > 0 ? "+" : ""}
                {stats.clientCountVariation.toFixed(2)}% vs période précédente
              </p>
            )}
          </div>
        </div>

        {/* Nombre factures */}
        <div className="bg-card-light dark:bg-card-dark p-6 rounded-lg shadow-md flex items-center">
          <div className="bg-purple-100 dark:bg-purple-900 p-4 rounded-lg mr-4">
            <TbFileInvoice className="text-purple-500 dark:text-purple-400 text-2xl" />
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">
              Nombre de factures
            </p>
            <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              {loading ? "Chargement..." : stats.invoiceCount}
            </p>
            {stats.invoiceCountVariation !== null && (
              <p
                className={`text-sm ${stats.invoiceCountVariation >= 0
                    ? "text-green-500"
                    : "text-red-500"
                  }`}
              >
                {stats.invoiceCountVariation > 0 ? "+" : ""}
                {stats.invoiceCountVariation.toFixed(2)}% vs période précédente
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;
