/**
 * Service d'export des données en CSV (compatible Excel)
 */

const CSV_SEPARATOR = ";";
const CSV_LINE_BREAK = "\r\n";

function escapeCsvValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Échapper les guillemets et entourer de guillemets si contient un séparateur
  if (str.includes(CSV_SEPARATOR) || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function createCsvRow(values: (string | number | null | undefined)[]): string {
  return values.map(escapeCsvValue).join(CSV_SEPARATOR);
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob(["\uFEFF" + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface FactureExport {
  id: string;
  numero: string;
  dateCreation: string;
  clientNom: string;
  clientEmail: string;
  statut: string;
  totalHT: number;
  totalTTC: number;
}

export interface ClientExport {
  id: string;
  refClient: string;
  nom: string;
  email: string;
  ville: string;
  codePostal: string;
}

export interface CAExport {
  mois: string;
  cetteAnnee: number;
  anneePrecedente: number;
  evolution: number;
}

/**
 * Exporte les factures en CSV
 */
export function exportFacturesCsv(factures: FactureExport[]): void {
  const headers = [
    "Numéro",
    "Date",
    "Client",
    "Email client",
    "Statut",
    "Total HT (€)",
    "Total TTC (€)",
  ];
  const rows = factures.map((f) =>
    createCsvRow([
      f.numero,
      f.dateCreation,
      f.clientNom,
      f.clientEmail,
      f.statut,
      f.totalHT.toFixed(2),
      f.totalTTC.toFixed(2),
    ])
  );
  const csv = [createCsvRow(headers), ...rows].join(CSV_LINE_BREAK);
  const date = new Date().toISOString().split("T")[0];
  downloadFile(csv, `factures_${date}.csv`, "text/csv;charset=utf-8");
}

/**
 * Exporte les clients en CSV
 */
export function exportClientsCsv(clients: ClientExport[]): void {
  const headers = ["Référence", "Nom", "Email", "Ville", "Code postal"];
  const rows = clients.map((c) =>
    createCsvRow([c.refClient, c.nom, c.email, c.ville, c.codePostal])
  );
  const csv = [createCsvRow(headers), ...rows].join(CSV_LINE_BREAK);
  const date = new Date().toISOString().split("T")[0];
  downloadFile(csv, `clients_${date}.csv`, "text/csv;charset=utf-8");
}

/**
 * Exporte le chiffre d'affaires en CSV
 */
export function exportChiffreAffairesCsv(data: CAExport[]): void {
  const headers = [
    "Mois",
    "Cette année (€)",
    "Année précédente (€)",
    "Évolution (%)",
  ];
  const rows = data.map((d) =>
    createCsvRow([
      d.mois,
      d.cetteAnnee.toFixed(2),
      d.anneePrecedente.toFixed(2),
      d.evolution.toFixed(2) + "%",
    ])
  );
  const csv = [createCsvRow(headers), ...rows].join(CSV_LINE_BREAK);
  const date = new Date().toISOString().split("T")[0];
  downloadFile(csv, `chiffre_affaires_${date}.csv`, "text/csv;charset=utf-8");
}
