"use client";
import React, { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/authContext";
import { DateRange } from "./DateFilter";
import {
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiSend,
} from "react-icons/fi";

// Enregistrement des composants nécessaires pour Chart.js
ChartJS.register(ArcElement, Title, Tooltip, Legend);

interface InvoiceStatusChartProps {
  dateRange?: DateRange;
}

interface InvoiceStatusData {
  statusCount: {
    pending: number;
    sent: number;
    paid: number;
    overdue: number;
  };
  totalAmount: {
    pending: number;
    sent: number;
    paid: number;
    overdue: number;
  };
  upcomingPayments: Array<{
    id: string;
    number: string;
    client: string;
    amount: number;
    status: string;
    dueDate?: Date;
  }>;
}

const InvoiceStatusChart: React.FC<InvoiceStatusChartProps> = ({
  dateRange,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [statusData, setStatusData] = useState<InvoiceStatusData>({
    statusCount: {
      pending: 0,
      sent: 0,
      paid: 0,
      overdue: 0,
    },
    totalAmount: {
      pending: 0,
      sent: 0,
      paid: 0,
      overdue: 0,
    },
    upcomingPayments: [],
  });

  useEffect(() => {
    const fetchInvoiceStatusData = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // Date de début et de fin filtrées
        const filteredStartDate = dateRange
          ? new Date(dateRange.startDate)
          : new Date(new Date().getFullYear(), 0, 1); // Début de l'année en cours
        const filteredEndDate = dateRange
          ? new Date(dateRange.endDate)
          : new Date();

        // Récupérer toutes les factures de l'utilisateur
        const facturesRef = collection(db, "factures");
        const userFacturesQuery = query(
          facturesRef,
          where("userId", "==", user.uid)
        );
        const querySnapshot = await getDocs(userFacturesQuery);

        const statusCount = {
          pending: 0,
          sent: 0,
          paid: 0,
          overdue: 0,
        };

        const totalAmount = {
          pending: 0,
          sent: 0,
          paid: 0,
          overdue: 0,
        };

        const upcomingPayments: Array<{
          id: string;
          number: string;
          client: string;
          amount: number;
          status: string;
          dueDate?: Date;
        }> = [];

        // Calculer les statuts des factures
        querySnapshot.forEach((doc) => {
          const facture = doc.data();
          const factureId = doc.id;

          let factureDate: Date | null = null;

          // Convertir la date de facture en objet Date
          try {
            if (facture.dateCreation) {
              if (typeof facture.dateCreation === "string") {
                factureDate = new Date(facture.dateCreation);
              } else if (facture.dateCreation instanceof Date) {
                factureDate = facture.dateCreation;
              } else if (
                facture.dateCreation.toDate &&
                typeof facture.dateCreation.toDate === "function"
              ) {
                factureDate = facture.dateCreation.toDate();
              } else if (
                facture.dateCreation.seconds &&
                typeof facture.dateCreation.seconds === "number"
              ) {
                factureDate = new Date(facture.dateCreation.seconds * 1000);
              }
            }
          } catch (error) {
            console.error("Erreur lors de la conversion de date:", error);
          }

          // Vérifier si la facture est dans la plage de dates
          if (
            !factureDate ||
            (factureDate >= filteredStartDate && factureDate <= filteredEndDate)
          ) {
            const status = facture.statut;

            // S'assurer que totalTTC est correctement converti en nombre
            const amount =
              typeof facture.totalTTC === "number"
                ? facture.totalTTC
                : typeof facture.totalTTC === "string"
                ? parseFloat(facture.totalTTC) || 0
                : 0;

            // Calculer la date d'échéance (si client a un délai de paiement)
            let dueDate: Date | undefined = undefined;
            if (
              factureDate &&
              facture.client &&
              facture.client.delaisPaiement
            ) {
              dueDate = new Date(factureDate);
              const paymentTerms = facture.client.delaisPaiement;
              if (paymentTerms === "30 jours") {
                dueDate.setDate(dueDate.getDate() + 30);
              } else if (paymentTerms === "60 jours") {
                dueDate.setDate(dueDate.getDate() + 60);
              } else if (paymentTerms === "90 jours") {
                dueDate.setDate(dueDate.getDate() + 90);
              }
              // Pour "Comptant", pas de modification de date
            }

            // Déterminer si la facture est en retard
            const isOverdue =
              status !== "Payée" &&
              dueDate &&
              dueDate < new Date() &&
              (status === "Envoyée" || status === "En attente");

            // Mettre à jour les compteurs en fonction du statut
            if (isOverdue) {
              statusCount.overdue++;
              totalAmount.overdue += amount;
            } else if (status === "En attente") {
              statusCount.pending++;
              totalAmount.pending += amount;
            } else if (status === "Envoyée") {
              statusCount.sent++;
              totalAmount.sent += amount;
            } else if (status === "Payée") {
              statusCount.paid++;
              totalAmount.paid += amount;
            }

            // Ajouter aux paiements à venir si pas payée et pas en retard
            if (
              (status === "Envoyée" || status === "En attente") &&
              !isOverdue &&
              dueDate
            ) {
              upcomingPayments.push({
                id: factureId,
                number: facture.numero,
                client: facture.client.nom,
                amount: amount,
                status: status,
                dueDate: dueDate,
              });
            }
          }
        });

        // Trier les paiements à venir par date d'échéance
        upcomingPayments.sort((a, b) => {
          if (a.dueDate && b.dueDate) {
            return a.dueDate.getTime() - b.dueDate.getTime();
          }
          return 0;
        });

        setStatusData({
          statusCount,
          totalAmount,
          upcomingPayments: upcomingPayments.slice(0, 5), // Limiter à 5 éléments
        });
      } catch (error) {
        console.error("Erreur lors de la récupération des données:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoiceStatusData();
  }, [user, dateRange]);

  const doughnutData = {
    labels: ["En attente", "Envoyées", "Payées", "En retard"],
    datasets: [
      {
        data: [
          statusData.statusCount.pending,
          statusData.statusCount.sent,
          statusData.statusCount.paid,
          statusData.statusCount.overdue,
        ],
        backgroundColor: [
          "rgba(255, 206, 86, 0.6)", // Jaune pour "En attente"
          "rgba(54, 162, 235, 0.6)", // Bleu pour "Envoyées"
          "rgba(75, 192, 192, 0.6)", // Vert pour "Payées"
          "rgba(255, 99, 132, 0.6)", // Rouge pour "En retard"
        ],
        borderColor: [
          "rgba(255, 206, 86, 1)",
          "rgba(54, 162, 235, 1)",
          "rgba(75, 192, 192, 1)",
          "rgba(255, 99, 132, 1)",
        ],
        borderWidth: 1,
      },
    ],
  };

  const doughnutOptions: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right" as const,
      },
      title: {
        display: true,
        text: "Statut des factures",
        font: {
          size: 16,
        },
      },
    },
  };

  // Fonction pour formater les montants
  const formatAmount = (amount: number) => {
    return amount.toLocaleString("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Statut des factures</h2>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center">
                <FiClock className="text-yellow-500 mr-2" size={20} />
                <p className="text-sm text-gray-600">En attente</p>
              </div>
              <p className="text-xl font-bold mt-1">
                {formatAmount(statusData.totalAmount.pending)}
              </p>
              <p className="text-sm text-gray-500">
                {statusData.statusCount.pending} facture(s)
              </p>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center">
                <FiSend className="text-blue-500 mr-2" size={20} />
                <p className="text-sm text-gray-600">Envoyées</p>
              </div>
              <p className="text-xl font-bold mt-1">
                {formatAmount(statusData.totalAmount.sent)}
              </p>
              <p className="text-sm text-gray-500">
                {statusData.statusCount.sent} facture(s)
              </p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center">
                <FiCheckCircle className="text-green-500 mr-2" size={20} />
                <p className="text-sm text-gray-600">Payées</p>
              </div>
              <p className="text-xl font-bold mt-1">
                {formatAmount(statusData.totalAmount.paid)}
              </p>
              <p className="text-sm text-gray-500">
                {statusData.statusCount.paid} facture(s)
              </p>
            </div>

            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center">
                <FiAlertTriangle className="text-red-500 mr-2" size={20} />
                <p className="text-sm text-gray-600">En retard</p>
              </div>
              <p className="text-xl font-bold mt-1 text-red-600">
                {formatAmount(statusData.totalAmount.overdue)}
              </p>
              <p className="text-sm text-gray-500">
                {statusData.statusCount.overdue} facture(s)
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row">
            <div className="w-full md:w-1/2 h-64 mb-6 md:mb-0">
              <Doughnut data={doughnutData} options={doughnutOptions} />
            </div>

            <div className="w-full md:w-1/2 md:pl-6">
              <h3 className="text-lg font-semibold mb-2">
                Prochains paiements
              </h3>
              {statusData.upcomingPayments.length > 0 ? (
                <div className="overflow-auto max-h-60">
                  <table className="min-w-full">
                    <thead>
                      <tr className="text-left text-gray-600 text-sm">
                        <th className="pb-2">Facture</th>
                        <th className="pb-2">Client</th>
                        <th className="pb-2">Montant</th>
                        <th className="pb-2">Échéance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statusData.upcomingPayments.map((payment) => (
                        <tr key={payment.id} className="border-t">
                          <td className="py-2 text-sm">{payment.number}</td>
                          <td className="py-2 text-sm">{payment.client}</td>
                          <td className="py-2 text-sm">
                            {payment.amount.toFixed(2)} €
                          </td>
                          <td className="py-2 text-sm">
                            {payment.dueDate
                              ? payment.dueDate.toLocaleDateString("fr-FR")
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 italic">
                  Aucun paiement en attente
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default InvoiceStatusChart;
