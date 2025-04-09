export interface Notification {
  id: string;
  userId: string;
  factureId: string;
  factureNumero: string;
  clientNom: string;
  message: string;
  type: "paiement_retard" | "paiement_proche" | "info";
  dateCreation: Date;
  lue: boolean;
  montant: number;
}
