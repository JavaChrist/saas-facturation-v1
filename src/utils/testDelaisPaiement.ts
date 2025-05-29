// Script de test pour les délais de paiement
import { calculerDateEcheance, DelaiPaiementType } from "@/services/delaisPaiementService";

export const testDelaisPaiement = () => {
  console.log("=== Test des délais de paiement ===");

  // Date de test : 15 janvier 2024
  const dateTest = new Date(2024, 0, 15); // 15 janvier 2024

  const delaisATest: DelaiPaiementType[] = [
    "À réception",
    "8 jours",
    "30 jours",
    "60 jours",
    "30 jours fin de mois le 10",
    "60 jours fin de mois le 10",
    "30 jours fin de mois le 15",
    "45 jours fin de mois"
  ];

  delaisATest.forEach(delai => {
    const dateEcheance = calculerDateEcheance(dateTest, delai);
    console.log(`${delai}: ${dateTest.toLocaleDateString('fr-FR')} → ${dateEcheance.toLocaleDateString('fr-FR')}`);
  });

  console.log("\n=== Test avec date de fin de mois ===");
  // Date de test : 31 janvier 2024
  const dateFinMois = new Date(2024, 0, 31); // 31 janvier 2024

  const delaisFinMois: DelaiPaiementType[] = [
    "30 jours fin de mois le 10",
    "60 jours fin de mois le 10"
  ];

  delaisFinMois.forEach(delai => {
    const dateEcheance = calculerDateEcheance(dateFinMois, delai);
    console.log(`${delai}: ${dateFinMois.toLocaleDateString('fr-FR')} → ${dateEcheance.toLocaleDateString('fr-FR')}`);
  });
};

// Fonction pour tester un délai spécifique
export const testDelaiSpecifique = (dateCreation: Date, delai: DelaiPaiementType) => {
  const dateEcheance = calculerDateEcheance(dateCreation, delai);
  return {
    dateCreation: dateCreation.toLocaleDateString('fr-FR'),
    delai,
    dateEcheance: dateEcheance.toLocaleDateString('fr-FR'),
    joursEcart: Math.floor((dateEcheance.getTime() - dateCreation.getTime()) / (1000 * 60 * 60 * 24))
  };
}; 