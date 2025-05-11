export interface StyleModele {
  couleurPrimaire: string; // Couleur principale (#RRGGBB)
  couleurSecondaire: string; // Couleur secondaire (#RRGGBB)
  police: string; // Police de caractères (helvetica, times, courier, arial, georgia, verdana, roboto, montserrat, lato, openSans)
  avecEnTete: boolean; // Utiliser du papier à en-tête
  avecSignature: boolean; // Inclure une signature
  logoPosition: "haut" | "droite" | "aucun"; // Position du logo
}

export interface ChampPersonnalise {
  id: string;
  nom: string;
  valeur: string;
  type: "texte" | "date" | "nombre" | "devise";
}

export interface ModeleFacture {
  id: string;
  nom: string;
  description: string;
  style: StyleModele;
  champsPersonnalises: ChampPersonnalise[];
  mentionsSpeciales: string[]; // Mentions spéciales à ajouter à la facture
  piedDePage: string; // Texte personnalisé pour le pied de page
  actif: boolean; // Indique si le modèle est actif
  dateCreation: Date;
  userId: string;
}

export interface FactureRecurrente {
  id: string;
  modeleId: string; // ID du modèle à utiliser
  clientId: string; // ID du client
  articles: any[]; // Articles à facturer (même structure que dans Facture)
  frequence: "mensuelle" | "trimestrielle" | "semestrielle" | "annuelle";
  montantHT: number;
  montantTTC: number;
  jourEmission: number; // Jour du mois pour émettre la facture (1-31)
  moisEmission?: number[]; // Mois d'émission pour fréquences non mensuelles
  prochaineEmission: Date; // Date de la prochaine émission
  derniereEmission?: Date; // Date de la dernière émission
  actif: boolean; // Indique si la facturation récurrente est active
  nombreRepetitions?: number; // Nombre de fois que la facture sera répétée, null/undefined = illimité
  repetitionsEffectuees?: number; // Nombre de factures déjà générées
  dateCreation: Date;
  userId: string;
}
