export interface UserSignature {
  nom: string;
  fonction?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  siteWeb?: string;
  avatar?: string;
  reseauxSociaux?: {
    nom: string;
    url: string;
  }[];
}

export interface UserProfile {
  id: string;
  nom: string;
  email: string;
  signature?: UserSignature;
  dateCreation: Date;
  planId: string;
} 