import { DelaiPaiementType } from "@/services/delaisPaiementService";

export interface EmailContact {
  email: string;
  isDefault: boolean;
}

export interface Client {
  id: string;
  refClient: string;
  nom: string;
  rue: string;
  codePostal: string;
  ville: string;
  emails: EmailContact[];
  email: string;
  delaisPaiement: DelaiPaiementType;
}

export interface Article {
  id: number;
  description: string;
  quantite: number;
  prixUnitaireHT: number;
  tva: number;
  totalTTC: number;
  isComment?: boolean;
}

// Interface pour représenter un paiement
export interface Paiement {
  id: string;
  montant: number;
  datePaiement: Date;
  methodePaiement: "Virement" | "Chèque" | "Espèces" | "Carte bancaire" | "Prélèvement" | "Autre";
  reference?: string; // Numéro de chèque, référence virement, etc.
  commentaire?: string;
}

// Interface pour représenter le timestamp Firestore
export interface FirestoreTimestamp {
  toDate: () => Date;
  seconds: number;
  nanoseconds: number;
}

export interface Facture {
  id: string;
  userId: string;
  numero: string;
  client: Client;
  statut: "En attente" | "Envoyée" | "Payée" | "Partiellement payée" | "À relancer";
  articles: Article[];
  totalHT: number;
  totalTTC: number;
  dateCreation?: Date | string | FirestoreTimestamp;
  paiements?: Paiement[]; // Liste des paiements reçus
  montantPaye?: number; // Montant total payé (calculé)
  resteAPayer?: number; // Reste à payer (calculé)
}
