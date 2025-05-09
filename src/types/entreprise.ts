export interface RIB {
  iban: string;
  bic: string;
  banque: string;
}

export interface Entreprise {
  nom: string;
  rue: string;
  codePostal: string;
  ville: string;
  telephone: string;
  email: string;
  siret: string;
  tvaIntracommunautaire?: string;
  logo?: string;
  rib: {
    iban: string;
    bic: string;
    banque: string;
  };
  mentionsLegales?: string[];
}
