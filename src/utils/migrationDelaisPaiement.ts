// Script de migration pour les délais de paiement
import { db } from "@/lib/firebase";
import { collection, getDocs, updateDoc, doc, query, where } from "firebase/firestore";
import { DelaiPaiementType, isDelaiPaiementValide } from "@/services/delaisPaiementService";

interface ClientData {
  id: string;
  delaisPaiement: string;
  [key: string]: any;
}

/**
 * Migre les délais de paiement des clients existants vers le nouveau format
 * @param userId ID de l'utilisateur (optionnel, pour migrer tous les clients d'un utilisateur spécifique)
 */
export const migrerDelaisPaiementClients = async (userId?: string): Promise<{
  success: boolean;
  clientsMigres: number;
  erreurs: string[];
}> => {
  const erreurs: string[] = [];
  let clientsMigres = 0;

  try {
    console.log("Début de la migration des délais de paiement...");

    // Construire la requête
    let clientsQuery;
    if (userId) {
      clientsQuery = query(collection(db, "clients"), where("userId", "==", userId));
    } else {
      clientsQuery = collection(db, "clients");
    }

    const snapshot = await getDocs(clientsQuery);
    console.log(`${snapshot.docs.length} clients trouvés pour la migration`);

    for (const docSnapshot of snapshot.docs) {
      try {
        const clientData = { id: docSnapshot.id, ...docSnapshot.data() } as ClientData;

        // Vérifier si le délai de paiement est valide
        if (!clientData.delaisPaiement) {
          // Si pas de délai défini, utiliser "30 jours" par défaut
          await updateDoc(doc(db, "clients", clientData.id), {
            delaisPaiement: "30 jours" as DelaiPaiementType
          });
          clientsMigres++;
          console.log(`Client ${clientData.id}: délai par défaut ajouté`);
        } else if (!isDelaiPaiementValide(clientData.delaisPaiement)) {
          // Si le délai n'est pas valide, essayer de le mapper
          const delaiMigre = mapperAncienDelai(clientData.delaisPaiement);

          await updateDoc(doc(db, "clients", clientData.id), {
            delaisPaiement: delaiMigre
          });
          clientsMigres++;
          console.log(`Client ${clientData.id}: délai migré de "${clientData.delaisPaiement}" vers "${delaiMigre}"`);
        } else {
          console.log(`Client ${clientData.id}: délai déjà valide (${clientData.delaisPaiement})`);
        }
      } catch (error) {
        const errorMsg = `Erreur lors de la migration du client ${docSnapshot.id}: ${error}`;
        erreurs.push(errorMsg);
        console.error(errorMsg);
      }
    }

    console.log(`Migration terminée. ${clientsMigres} clients migrés.`);

    return {
      success: erreurs.length === 0,
      clientsMigres,
      erreurs
    };

  } catch (error) {
    const errorMsg = `Erreur générale lors de la migration: ${error}`;
    erreurs.push(errorMsg);
    console.error(errorMsg);

    return {
      success: false,
      clientsMigres,
      erreurs
    };
  }
};

/**
 * Mappe les anciens délais vers les nouveaux
 * @param ancienDelai Ancien format de délai
 * @returns Nouveau format de délai
 */
const mapperAncienDelai = (ancienDelai: string): DelaiPaiementType => {
  // Normaliser la chaîne (minuscules, espaces supprimés)
  const delaiNormalise = ancienDelai.toLowerCase().trim();

  // Mapping des anciens délais vers les nouveaux
  const mappings: Record<string, DelaiPaiementType> = {
    "a reception": "À réception",
    "à reception": "À réception",
    "reception": "À réception",
    "immediat": "À réception",
    "immédiat": "À réception",
    "8j": "8 jours",
    "8 j": "8 jours",
    "8jours": "8 jours",
    "30j": "30 jours",
    "30 j": "30 jours",
    "30jours": "30 jours",
    "60j": "60 jours",
    "60 j": "60 jours",
    "60jours": "60 jours",
    "net 30": "30 jours net",
    "30 net": "30 jours net",
    "45 fin de mois": "45 jours fin de mois",
    "45 fdm": "45 jours fin de mois"
  };

  // Chercher une correspondance exacte
  if (mappings[delaiNormalise]) {
    return mappings[delaiNormalise];
  }

  // Chercher des patterns
  if (delaiNormalise.includes("30") && delaiNormalise.includes("10")) {
    return "30 jours fin de mois le 10";
  }
  if (delaiNormalise.includes("60") && delaiNormalise.includes("10")) {
    return "60 jours fin de mois le 10";
  }
  if (delaiNormalise.includes("30") && delaiNormalise.includes("15")) {
    return "30 jours fin de mois le 15";
  }
  if (delaiNormalise.includes("60") && delaiNormalise.includes("15")) {
    return "60 jours fin de mois le 15";
  }

  // Par défaut, retourner 30 jours
  console.warn(`Délai non reconnu: "${ancienDelai}", utilisation de "30 jours" par défaut`);
  return "30 jours";
};

/**
 * Vérifie l'état des délais de paiement dans la base de données
 * @param userId ID de l'utilisateur (optionnel)
 */
export const verifierDelaisPaiementClients = async (userId?: string): Promise<{
  total: number;
  valides: number;
  invalides: number;
  details: Array<{ id: string; delai: string; valide: boolean }>;
}> => {
  try {
    let clientsQuery;
    if (userId) {
      clientsQuery = query(collection(db, "clients"), where("userId", "==", userId));
    } else {
      clientsQuery = collection(db, "clients");
    }

    const snapshot = await getDocs(clientsQuery);
    const details: Array<{ id: string; delai: string; valide: boolean }> = [];
    let valides = 0;
    let invalides = 0;

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const delai = data.delaisPaiement || "";
      const valide = isDelaiPaiementValide(delai);

      details.push({
        id: doc.id,
        delai,
        valide
      });

      if (valide) {
        valides++;
      } else {
        invalides++;
      }
    });

    return {
      total: snapshot.docs.length,
      valides,
      invalides,
      details
    };

  } catch (error) {
    console.error("Erreur lors de la vérification:", error);
    throw error;
  }
}; 