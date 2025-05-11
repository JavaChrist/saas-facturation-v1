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
  delaisPaiement: "À réception" | "8 jours" | "30 jours" | "60 jours";
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
  statut: "En attente" | "Envoyée" | "Payée" | "À relancer";
  articles: Article[];
  totalHT: number;
  totalTTC: number;
  dateCreation?: Date | string | FirestoreTimestamp;
}
