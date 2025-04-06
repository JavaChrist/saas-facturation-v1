export interface Client {
  id: string;
  refClient: string;
  nom: string;
  rue: string;
  codePostal: string;
  ville: string;
  email: string;
  delaisPaiement: "Comptant" | "8 jours" | "30 jours" | "60 jours";
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

export interface Facture {
  id: string;
  numero: string;
  client: Client;
  statut: "En attente" | "Envoyée" | "Payée" | "À relancer";
  articles: Article[];
  totalHT: number;
  totalTTC: number;
  dateCreation?: Date;
}
