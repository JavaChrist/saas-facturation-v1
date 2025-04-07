"use client";
import React, { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/authContext";

// Enregistrement des composants nécessaires pour Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface RevenueData {
  labels: string[];
  thisYear: number[];
  lastYear: number[];
  monthlyVariation: number[];
  total: {
    thisYear: number;
    lastYear: number;
    variation: number;
  };
}

const RevenueChart: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<RevenueData>({
    labels: [],
    thisYear: [],
    lastYear: [],
    monthlyVariation: [],
    total: {
      thisYear: 0,
      lastYear: 0,
      variation: 0,
    },
  });
  const [debugData, setDebugData] = useState<any[]>([]);

  useEffect(() => {
    const fetchRevenueData = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // Déterminer les dates pour cette année et l'année dernière
        const today = new Date();
        const currentYear = today.getFullYear();
        const lastYear = currentYear - 1;

        console.log(
          `Année actuelle: ${currentYear}, Année précédente: ${lastYear}`
        );

        // Créer les labels pour les 12 mois
        const months = [
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
        ];

        // Récupérer toutes les factures de l'utilisateur
        const facturesRef = collection(db, "factures");
        const userFacturesQuery = query(
          facturesRef,
          where("userId", "==", user.uid)
        );
        const querySnapshot = await getDocs(userFacturesQuery);

        console.log(`Nombre de factures récupérées: ${querySnapshot.size}`);

        // Initialiser les tableaux de données
        const thisYearData = Array(12).fill(0);
        const lastYearData = Array(12).fill(0);
        const debugFactures: any[] = [];

        // Calculer le chiffre d'affaires par mois
        querySnapshot.forEach((doc) => {
          const facture = doc.data();

          // Journalisation pour le débogage
          debugFactures.push({
            id: doc.id,
            dateCreation: facture.dateCreation,
            totalTTC: facture.totalTTC,
            userId: facture.userId,
          });

          if (facture.dateCreation && facture.totalTTC) {
            // Gérer différents formats de date potentiels
            let date;
            try {
              if (typeof facture.dateCreation === "string") {
                date = new Date(facture.dateCreation);
              } else if (facture.dateCreation instanceof Date) {
                date = facture.dateCreation;
              } else if (
                facture.dateCreation.toDate &&
                typeof facture.dateCreation.toDate === "function"
              ) {
                // Gérer les Timestamps Firestore
                date = facture.dateCreation.toDate();
              } else if (
                facture.dateCreation.seconds &&
                typeof facture.dateCreation.seconds === "number"
              ) {
                // Gérer les timestamps Firestore sous forme d'objet { seconds, nanoseconds }
                date = new Date(facture.dateCreation.seconds * 1000);
              } else {
                console.warn(
                  `Format de date non reconnu pour la facture ${doc.id}:`,
                  facture.dateCreation
                );
                return; // Passer à la facture suivante
              }
            } catch (e) {
              console.error(
                `Erreur de conversion de date pour la facture ${doc.id}:`,
                e
              );
              return; // Passer à la facture suivante
            }

            if (isNaN(date.getTime())) {
              console.error(
                `Date invalide pour la facture ${doc.id}:`,
                facture.dateCreation
              );
              return; // Passer à la facture suivante
            }

            const factureYear = date.getFullYear();
            const factureMonth = date.getMonth();

            // S'assurer que totalTTC est un nombre
            let amount = 0;
            try {
              amount = parseFloat(facture.totalTTC);
              if (isNaN(amount)) {
                console.warn(
                  `Montant TTC invalide pour la facture ${doc.id}:`,
                  facture.totalTTC
                );
                return; // Passer à la facture suivante
              }
            } catch (e) {
              console.error(
                `Erreur de conversion du montant pour la facture ${doc.id}:`,
                e
              );
              return; // Passer à la facture suivante
            }

            console.log(
              `Facture ${
                doc.id
              }: Date=${date.toLocaleDateString()}, Année=${factureYear}, Mois=${factureMonth} (${
                months[factureMonth]
              }), Montant=${amount.toFixed(2)}€`
            );

            if (factureYear === currentYear) {
              thisYearData[factureMonth] += amount;
              console.log(
                `Ajouté à l'année en cours (${
                  months[factureMonth]
                } ${currentYear}): +${amount.toFixed(
                  2
                )}€, Nouveau total: ${thisYearData[factureMonth].toFixed(2)}€`
              );
            } else if (factureYear === lastYear) {
              lastYearData[factureMonth] += amount;
              console.log(
                `Ajouté à l'année précédente (${
                  months[factureMonth]
                } ${lastYear}): +${amount.toFixed(
                  2
                )}€, Nouveau total: ${lastYearData[factureMonth].toFixed(2)}€`
              );
            }
          } else {
            console.warn(
              `Facture ${doc.id} ignorée: dateCreation=${
                facture.dateCreation ? "présent" : "absent"
              }, totalTTC=${facture.totalTTC ? facture.totalTTC : "absent"}`
            );
          }
        });

        // Afficher les totaux par mois pour le débogage
        console.log(
          "Données par mois - Année en cours:",
          thisYearData.map((v) => v.toFixed(2))
        );
        console.log(
          "Données par mois - Année précédente:",
          lastYearData.map((v) => v.toFixed(2))
        );

        // Calculer les variations mensuelles
        const monthlyVariation = thisYearData.map((thisYearValue, index) => {
          const lastYearValue = lastYearData[index];
          if (lastYearValue > 0) {
            return ((thisYearValue - lastYearValue) / lastYearValue) * 100;
          }
          return thisYearValue > 0 ? 100 : 0; // Si pas de valeur l'année dernière, 100% de progression ou 0
        });

        console.log(
          "Variations mensuelles (%):",
          monthlyVariation.map((v) => v.toFixed(2))
        );

        // Calculer les totaux
        const totalThisYear = thisYearData.reduce((sum, val) => sum + val, 0);
        const totalLastYear = lastYearData.reduce((sum, val) => sum + val, 0);

        // Calculer la variation en pourcentage
        let variation = 0;
        if (totalLastYear > 0) {
          variation = ((totalThisYear - totalLastYear) / totalLastYear) * 100;
        } else if (totalThisYear > 0) {
          variation = 100; // Si pas de chiffre l'année dernière, 100% de progression
        }

        console.log(
          `Total année en cours: ${totalThisYear.toFixed(
            2
          )}€, Total année précédente: ${totalLastYear.toFixed(
            2
          )}€, Variation: ${variation.toFixed(2)}%`
        );

        setRevenueData({
          labels: months,
          thisYear: thisYearData,
          lastYear: lastYearData,
          monthlyVariation: monthlyVariation,
          total: {
            thisYear: totalThisYear,
            lastYear: totalLastYear,
            variation: variation,
          },
        });

        // Sauvegarder les données de débogage
        setDebugData(debugFactures);
      } catch (error) {
        console.error("Erreur lors de la récupération des données:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRevenueData();
  }, [user]);

  const chartData = {
    labels: revenueData.labels,
    datasets: [
      {
        label: `Chiffre d'affaires ${new Date().getFullYear()}`,
        data: revenueData.thisYear,
        borderColor: "rgb(53, 162, 235)",
        backgroundColor: "rgba(53, 162, 235, 0.5)",
        tension: 0.3,
      },
      {
        label: `Chiffre d'affaires ${new Date().getFullYear() - 1}`,
        data: revenueData.lastYear,
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, 0.5)",
        tension: 0.3,
      },
    ],
  };

  // Ajouter un jeu de données pour la variation mensuelle
  const variationChartData = {
    labels: revenueData.labels,
    datasets: [
      {
        label: `Évolution mensuelle (%)`,
        data: revenueData.monthlyVariation,
        borderColor: "rgb(75, 192, 192)",
        backgroundColor: "rgba(75, 192, 192, 0.5)",
        tension: 0.3,
        yAxisID: "y1",
      },
    ],
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Évolution du chiffre d'affaires",
        font: {
          size: 16,
        },
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            return `${context.dataset.label}: ${context.raw} €`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value) {
            return value + " €";
          },
        },
      },
    },
  };

  const variationOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Évolution mensuelle (%)",
        font: {
          size: 16,
        },
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const value = Number(context.raw);
            return `${context.dataset.label}: ${
              value > 0 ? "+" : ""
            }${value.toFixed(2)}%`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: function (value) {
            return value + " %";
          },
        },
      },
    },
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">
        Chiffre d'affaires sur 2 ans
      </h2>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Cette année</p>
              <p className="text-2xl font-bold">
                {revenueData.total.thisYear.toFixed(2)} €
              </p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Année précédente</p>
              <p className="text-2xl font-bold">
                {revenueData.total.lastYear.toFixed(2)} €
              </p>
            </div>
            <div
              className={`p-4 rounded-lg ${
                revenueData.total.variation >= 0 ? "bg-green-50" : "bg-red-50"
              }`}
            >
              <p className="text-sm text-gray-600">Évolution</p>
              <p
                className={`text-2xl font-bold ${
                  revenueData.total.variation >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {revenueData.total.variation > 0 ? "+" : ""}
                {revenueData.total.variation.toFixed(2)} %
              </p>
            </div>
          </div>

          <div className="h-80 mb-8">
            <Line data={chartData} options={options} />
          </div>

          <div className="h-80">
            <Line data={variationChartData} options={variationOptions} />
          </div>

          {/* Tableau des évolutions mensuelles */}
          <div className="mt-8 overflow-x-auto">
            <table className="min-w-full bg-white rounded-lg overflow-hidden shadow-md">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 border-b">Mois</th>
                  <th className="px-4 py-2 border-b text-right">
                    Cette année (€)
                  </th>
                  <th className="px-4 py-2 border-b text-right">
                    Année préc. (€)
                  </th>
                  <th className="px-4 py-2 border-b text-right">
                    Évolution (%)
                  </th>
                </tr>
              </thead>
              <tbody>
                {revenueData.labels.map((month, index) => (
                  <tr
                    key={index}
                    className={index % 2 === 0 ? "bg-gray-50" : ""}
                  >
                    <td className="px-4 py-2 border-b">{month}</td>
                    <td className="px-4 py-2 border-b text-right">
                      {revenueData.thisYear[index].toFixed(2)} €
                    </td>
                    <td className="px-4 py-2 border-b text-right">
                      {revenueData.lastYear[index].toFixed(2)} €
                    </td>
                    <td
                      className={`px-4 py-2 border-b text-right ${
                        revenueData.monthlyVariation[index] >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {revenueData.monthlyVariation[index] > 0 ? "+" : ""}
                      {revenueData.monthlyVariation[index].toFixed(2)} %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section de débogage - Activer seulement pour le développement */}
          {debugData.length > 0 && (
            <div className="mt-6 border-t pt-4">
              <details>
                <summary className="cursor-pointer text-sm text-gray-500">
                  Informations de débogage (Développement uniquement)
                </summary>
                <div className="mt-2 overflow-x-auto">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr>
                        <th className="border p-1">ID</th>
                        <th className="border p-1">Date</th>
                        <th className="border p-1">Montant</th>
                        <th className="border p-1">UserId</th>
                      </tr>
                    </thead>
                    <tbody>
                      {debugData.map((facture, index) => (
                        <tr
                          key={index}
                          className={index % 2 === 0 ? "bg-gray-50" : ""}
                        >
                          <td className="border p-1">{facture.id}</td>
                          <td className="border p-1">
                            {facture.dateCreation?.toString()}
                          </td>
                          <td className="border p-1">{facture.totalTTC}</td>
                          <td className="border p-1">{facture.userId}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RevenueChart;
