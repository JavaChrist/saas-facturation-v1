// Service pour gérer les délais de paiement complexes

export type DelaiPaiementType =
  | "À réception"
  | "8 jours"
  | "30 jours"
  | "60 jours"
  | "30 jours fin de mois le 10"
  | "60 jours fin de mois le 10"
  | "30 jours fin de mois le 15"
  | "60 jours fin de mois le 15"
  | "45 jours fin de mois"
  | "30 jours net";

export interface DelaiPaiementOption {
  value: DelaiPaiementType;
  label: string;
  description?: string;
}

// Options de délais de paiement disponibles
export const DELAIS_PAIEMENT_OPTIONS: DelaiPaiementOption[] = [
  {
    value: "À réception",
    label: "À réception",
    description: "Paiement immédiat"
  },
  {
    value: "8 jours",
    label: "8 jours",
    description: "8 jours après émission"
  },
  {
    value: "30 jours",
    label: "30 jours",
    description: "30 jours après émission"
  },
  {
    value: "30 jours net",
    label: "30 jours net",
    description: "30 jours calendaires après émission"
  },
  {
    value: "60 jours",
    label: "60 jours",
    description: "60 jours après émission"
  },
  {
    value: "45 jours fin de mois",
    label: "45 jours fin de mois",
    description: "45 jours puis fin de mois"
  },
  {
    value: "30 jours fin de mois le 10",
    label: "30 jours fin de mois le 10",
    description: "30 jours puis fin de mois puis le 10 du mois suivant"
  },
  {
    value: "60 jours fin de mois le 10",
    label: "60 jours fin de mois le 10",
    description: "60 jours puis fin de mois puis le 10 du mois suivant"
  },
  {
    value: "30 jours fin de mois le 15",
    label: "30 jours fin de mois le 15",
    description: "30 jours puis fin de mois puis le 15 du mois suivant"
  },
  {
    value: "60 jours fin de mois le 15",
    label: "60 jours fin de mois le 15",
    description: "60 jours puis fin de mois puis le 15 du mois suivant"
  }
];

/**
 * Calcule la date d'échéance selon le délai de paiement spécifié
 * @param dateCreation Date de création de la facture
 * @param delaisPaiement Type de délai de paiement
 * @returns Date d'échéance calculée
 */
export const calculerDateEcheance = (
  dateCreation: Date,
  delaisPaiement: DelaiPaiementType
): Date => {
  const date = new Date(dateCreation);
  date.setHours(0, 0, 0, 0); // Normaliser à minuit

  switch (delaisPaiement) {
    case "À réception":
      return new Date(date);

    case "8 jours":
      date.setDate(date.getDate() + 8);
      return date;

    case "30 jours":
    case "30 jours net":
      date.setDate(date.getDate() + 30);
      return date;

    case "60 jours":
      date.setDate(date.getDate() + 60);
      return date;

    case "45 jours fin de mois":
      // Ajouter 45 jours puis aller à la fin du mois
      date.setDate(date.getDate() + 45);
      return allerFinDuMois(date);

    case "30 jours fin de mois le 10":
      // Ajouter 30 jours, aller à la fin du mois, puis le 10 du mois suivant
      date.setDate(date.getDate() + 30);
      const finMois30 = allerFinDuMois(date);
      return allerJourSuivantDuMoisSuivant(finMois30, 10);

    case "60 jours fin de mois le 10":
      // Ajouter 60 jours, aller à la fin du mois, puis le 10 du mois suivant
      date.setDate(date.getDate() + 60);
      const finMois60 = allerFinDuMois(date);
      return allerJourSuivantDuMoisSuivant(finMois60, 10);

    case "30 jours fin de mois le 15":
      // Ajouter 30 jours, aller à la fin du mois, puis le 15 du mois suivant
      date.setDate(date.getDate() + 30);
      const finMois30_15 = allerFinDuMois(date);
      return allerJourSuivantDuMoisSuivant(finMois30_15, 15);

    case "60 jours fin de mois le 15":
      // Ajouter 60 jours, aller à la fin du mois, puis le 15 du mois suivant
      date.setDate(date.getDate() + 60);
      const finMois60_15 = allerFinDuMois(date);
      return allerJourSuivantDuMoisSuivant(finMois60_15, 15);

    default:
      // Par défaut, 30 jours
      date.setDate(date.getDate() + 30);
      return date;
  }
};

/**
 * Déplace une date à la fin du mois
 * @param date Date de référence
 * @returns Date correspondant au dernier jour du mois
 */
const allerFinDuMois = (date: Date): Date => {
  const finMois = new Date(date);
  finMois.setMonth(finMois.getMonth() + 1, 0); // Dernier jour du mois
  return finMois;
};

/**
 * Déplace une date au jour spécifié du mois suivant
 * @param date Date de référence
 * @param jour Jour du mois (1-31)
 * @returns Date correspondant au jour spécifié du mois suivant
 */
const allerJourSuivantDuMoisSuivant = (date: Date, jour: number): Date => {
  const nouvellDate = new Date(date);
  nouvellDate.setMonth(nouvellDate.getMonth() + 1, jour);

  // Vérifier si le jour existe dans ce mois (ex: 31 février n'existe pas)
  if (nouvellDate.getDate() !== jour) {
    // Si le jour n'existe pas, prendre le dernier jour du mois
    nouvellDate.setDate(0);
  }

  return nouvellDate;
};

/**
 * Obtient le libellé d'un délai de paiement
 * @param delaisPaiement Type de délai de paiement
 * @returns Libellé du délai
 */
export const getDelaiPaiementLabel = (delaisPaiement: DelaiPaiementType): string => {
  const option = DELAIS_PAIEMENT_OPTIONS.find(opt => opt.value === delaisPaiement);
  return option?.label || delaisPaiement;
};

/**
 * Obtient la description d'un délai de paiement
 * @param delaisPaiement Type de délai de paiement
 * @returns Description du délai
 */
export const getDelaiPaiementDescription = (delaisPaiement: DelaiPaiementType): string => {
  const option = DELAIS_PAIEMENT_OPTIONS.find(opt => opt.value === delaisPaiement);
  return option?.description || "";
};

/**
 * Vérifie si un délai de paiement est valide
 * @param delaisPaiement Délai à vérifier
 * @returns true si le délai est valide
 */
export const isDelaiPaiementValide = (delaisPaiement: string): delaisPaiement is DelaiPaiementType => {
  return DELAIS_PAIEMENT_OPTIONS.some(opt => opt.value === delaisPaiement);
}; 