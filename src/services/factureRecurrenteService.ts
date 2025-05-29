import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { FactureRecurrente } from "@/types/modeleFacture";
import { Facture, Client } from "@/types/facture";
import { getModeleFacture } from "./modeleFactureService";
import { checkPlanLimit } from "@/services/subscriptionService";

// Récupérer toutes les factures récurrentes de l'utilisateur
export const getFacturesRecurrentes = async (
  userId: string
): Promise<FactureRecurrente[]> => {
  try {
    console.log(
      "Récupération des factures récurrentes pour l'utilisateur:",
      userId
    );
    const facturesQuery = query(
      collection(db, "facturesRecurrentes"),
      where("userId", "==", userId)
    );

    const snapshot = await getDocs(facturesQuery);
    console.log(
      "Nombre de factures récurrentes trouvées:",
      snapshot.docs.length
    );

    const factures = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      dateCreation: doc.data().dateCreation?.toDate
        ? doc.data().dateCreation.toDate()
        : new Date(doc.data().dateCreation || Date.now()),
      prochaineEmission: doc.data().prochaineEmission?.toDate
        ? doc.data().prochaineEmission.toDate()
        : new Date(doc.data().prochaineEmission || Date.now()),
      derniereEmission: doc.data().derniereEmission?.toDate
        ? doc.data().derniereEmission.toDate()
        : doc.data().derniereEmission
        ? new Date(doc.data().derniereEmission)
        : undefined,
    })) as FactureRecurrente[];

    return factures;
  } catch (error) {
    console.error(
      "Erreur lors de la récupération des factures récurrentes:",
      error
    );
    throw error;
  }
};

// Récupérer une facture récurrente spécifique
export const getFactureRecurrente = async (
  factureId: string
): Promise<FactureRecurrente | null> => {
  try {
    const docRef = doc(db, "facturesRecurrentes", factureId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        dateCreation: data.dateCreation?.toDate
          ? data.dateCreation.toDate()
          : new Date(data.dateCreation || Date.now()),
        prochaineEmission: data.prochaineEmission?.toDate
          ? data.prochaineEmission.toDate()
          : new Date(data.prochaineEmission || Date.now()),
        derniereEmission: data.derniereEmission?.toDate
          ? data.derniereEmission.toDate()
          : data.derniereEmission
          ? new Date(data.derniereEmission)
          : undefined,
      } as FactureRecurrente;
    }
    return null;
  } catch (error) {
    console.error(
      `Erreur lors de la récupération de la facture récurrente ${factureId}:`,
      error
    );
    throw error;
  }
};

// Créer une nouvelle facture récurrente
export const createFactureRecurrente = async (
  factureRecurrente: Omit<FactureRecurrente, "id">
): Promise<string> => {
  try {
    // Vérifier si l'utilisateur a atteint sa limite de factures
    // Récupérer toutes les factures existantes pour compter
    const facturesQuery = query(
      collection(db, "factures"),
      where("userId", "==", factureRecurrente.userId)
    );
    const facturesSnapshot = await getDocs(facturesQuery);
    const factureCount = facturesSnapshot.size;

    // Les factures récurrentes comptent aussi comme des factures
    const facRecQuery = query(
      collection(db, "facturesRecurrentes"),
      where("userId", "==", factureRecurrente.userId)
    );
    const facRecSnapshot = await getDocs(facRecQuery);
    const facRecCount = facRecSnapshot.size;

    // Vérifier la limite avec le total
    const totalCount = factureCount + facRecCount;
    const isLimitReached = await checkPlanLimit(
      factureRecurrente.userId,
      "factures",
      totalCount
    );

    if (isLimitReached) {
      throw new Error(
        "Limite de factures atteinte pour votre plan. Veuillez passer à un plan supérieur pour créer plus de factures."
      );
    }

    // Préparer les données pour Firestore
    // Firestore n'accepte pas les valeurs undefined
    const firebaseData = {
      ...factureRecurrente,
      nombreRepetitions: factureRecurrente.nombreRepetitions === undefined ? null : factureRecurrente.nombreRepetitions,
      repetitionsEffectuees: factureRecurrente.repetitionsEffectuees || 0,
      dateCreation: new Date(),
      derniereEmission: factureRecurrente.derniereEmission || null
    };

    const docRef = await addDoc(collection(db, "facturesRecurrentes"), firebaseData);
    return docRef.id;
  } catch (error) {
    console.error(
      "Erreur lors de la création de la facture récurrente:",
      error
    );
    throw error;
  }
};

// Mettre à jour une facture récurrente existante
export const updateFactureRecurrente = async (
  factureId: string,
  updates: Partial<FactureRecurrente>
): Promise<void> => {
  try {
    // Préparer les données pour Firestore (convertir undefined en null)
    // On doit utiliser une approche qui évite les conflits de types
    const firebaseUpdates: Record<string, any> = {};
    
    // Copier toutes les propriétés en convertissant undefined en null si nécessaire
    Object.entries(updates).forEach(([key, value]) => {
      firebaseUpdates[key] = value === undefined ? null : value;
    });
    
    await updateDoc(doc(db, "facturesRecurrentes", factureId), firebaseUpdates);
  } catch (error) {
    console.error(
      `Erreur lors de la mise à jour de la facture récurrente ${factureId}:`,
      error
    );
    throw error;
  }
};

// Supprimer une facture récurrente
export const deleteFactureRecurrente = async (
  factureId: string
): Promise<void> => {
  try {
    await deleteDoc(doc(db, "facturesRecurrentes", factureId));
  } catch (error) {
    console.error(
      `Erreur lors de la suppression de la facture récurrente ${factureId}:`,
      error
    );
    throw error;
  }
};

// Calculer la prochaine date d'émission
export const calculerProchaineEmission = (
  frequence: FactureRecurrente["frequence"],
  jour: number,
  moisEmission?: number[],
  dateDeReference?: Date
): Date => {
  const date = dateDeReference ? new Date(dateDeReference) : new Date();
  const jourCourant = date.getDate();
  const moisCourant = date.getMonth();
  const anneeCourante = date.getFullYear();

  let prochaineMission = new Date(date);

  switch (frequence) {
    case "mensuelle":
      // Si on a déjà dépassé le jour d'émission ce mois-ci, on passe au mois suivant
      if (jourCourant >= jour) {
        prochaineMission.setMonth(moisCourant + 1);
      }
      prochaineMission.setDate(jour);
      break;

    case "trimestrielle":
      if (!moisEmission || moisEmission.length === 0) {
        moisEmission = [0, 3, 6, 9]; // Jan, Avr, Juil, Oct par défaut
      }

      // Trouver le prochain mois d'émission
      let prochainMois = moisEmission.find((m) => m > moisCourant);
      if (!prochainMois) {
        prochainMois = moisEmission[0];
        prochaineMission.setFullYear(anneeCourante + 1);
      }

      prochaineMission.setMonth(prochainMois);
      prochaineMission.setDate(jour);
      break;

    case "semestrielle":
      if (!moisEmission || moisEmission.length === 0) {
        moisEmission = [0, 6]; // Jan, Juil par défaut
      }

      // Trouver le prochain mois d'émission
      let prochainMoisSem = moisEmission.find((m) => m > moisCourant);
      if (!prochainMoisSem) {
        prochainMoisSem = moisEmission[0];
        prochaineMission.setFullYear(anneeCourante + 1);
      }

      prochaineMission.setMonth(prochainMoisSem);
      prochaineMission.setDate(jour);
      break;

    case "annuelle":
      if (!moisEmission || moisEmission.length === 0) {
        moisEmission = [0]; // Janvier par défaut
      }

      // Trouver le prochain mois d'émission
      let prochainMoisAn = moisEmission.find((m) => m > moisCourant);
      if (!prochainMoisAn) {
        prochainMoisAn = moisEmission[0];
        prochaineMission.setFullYear(anneeCourante + 1);
      } else {
        prochaineMission.setFullYear(anneeCourante);
      }

      prochaineMission.setMonth(prochainMoisAn);
      prochaineMission.setDate(jour);
      break;
  }

  // S'assurer que la date est valide (ex: si on demande le 31 février)
  const moisApresAjustement = prochaineMission.getMonth();
  const moisDemande =
    moisEmission && moisEmission.length > 0
      ? prochaineMission.getFullYear() === anneeCourante
        ? moisEmission.find((m) => m > moisCourant) || moisEmission[0]
        : moisEmission[0]
      : moisCourant + 1;

  // Si le mois a été ajusté automatiquement (ex: 31 février -> 3 mars)
  if (moisApresAjustement !== moisDemande) {
    // On recule au dernier jour du mois voulu
    prochaineMission = new Date(prochaineMission.getFullYear(), moisDemande, 0);
  }

  return prochaineMission;
};

// Générer une facture à partir d'une facture récurrente
export const genererFactureDepuisRecurrente = async (
  factureRecurrente: FactureRecurrente,
  client: Client
): Promise<string> => {
  try {
    // Récupérer le modèle associé
    const modele = await getModeleFacture(factureRecurrente.modeleId);

    // Récupérer toutes les factures pour générer un numéro séquentiel
    const facturesQuery = query(
      collection(db, "factures"),
      where("userId", "==", factureRecurrente.userId)
    );
    
    const facturesSnapshot = await getDocs(facturesQuery);
    const factures = facturesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        numero: data.numero
      };
    });
    
    // Générer un numéro de facture au format FCT-YYYYXXX
    const currentYear = new Date().getFullYear();
    
    // Trouver le numéro de séquence le plus élevé
    let maxSequence = 4; // Commencer à 4 pour que la prochaine facture soit FCT-2025005
    
    // Utiliser le même format que dans la page des factures
    const regex = new RegExp(`^FCT-${currentYear}(\\d{3})$`);
    const oldRegex = new RegExp(`^${currentYear}(\\d{3})$`);
    
    factures.forEach(facture => {
      const match = facture.numero.match(regex);
      if (match) {
        const sequence = parseInt(match[1]);
        if (sequence > maxSequence) {
          maxSequence = sequence;
        }
      } else {
        const oldMatch = facture.numero.match(oldRegex);
        if (oldMatch) {
          const sequence = parseInt(oldMatch[1]);
          if (sequence > maxSequence) {
            maxSequence = sequence;
          }
        }
      }
    });
    
    // Incrémenter le numéro de séquence
    const nextSequence = maxSequence + 1;
    
    // Formater avec des zéros initiaux pour avoir 3 chiffres
    const sequenceStr = String(nextSequence).padStart(3, '0');
    
    // Générer le numéro au format FCT-YYYYXXX
    const numeroFacture = `FCT-${currentYear}${sequenceStr}`;

    console.log(`Génération d'une facture récurrente avec numéro: ${numeroFacture}`);
    
    // Créer la facture - garder exactement le montant TTC de la facture récurrente sans arrondi
    const nouvelleFacture: Omit<Facture, "id"> = {
      numero: numeroFacture,
      client: client,
      statut: "En attente",
      articles: factureRecurrente.articles,
      totalHT: factureRecurrente.montantHT,
      totalTTC: factureRecurrente.montantTTC, // Conserver le montant exact sans arrondi
      userId: factureRecurrente.userId,
      dateCreation: new Date(),
    };

    // Enregistrer la facture dans Firestore
    const factureRef = await addDoc(
      collection(db, "factures"),
      nouvelleFacture
    );

    // Mettre à jour la facture récurrente avec la nouvelle date d'émission
    const prochaineEmission = calculerProchaineEmission(
      factureRecurrente.frequence,
      factureRecurrente.jourEmission,
      factureRecurrente.moisEmission,
      new Date()
    );

    // Mettre à jour le compteur de répétitions
    const repetitionsEffectuees =
      (factureRecurrente.repetitionsEffectuees || 0) + 1;

    const updateData: Partial<FactureRecurrente> = {
      derniereEmission: new Date(),
      prochaineEmission: prochaineEmission,
      repetitionsEffectuees,
    };

    // Si le nombre de répétitions est défini et atteint, désactiver la facture récurrente
    if (
      factureRecurrente.nombreRepetitions !== undefined &&
      repetitionsEffectuees >= factureRecurrente.nombreRepetitions
    ) {
      updateData.actif = false;
    }

    await updateDoc(
      doc(db, "facturesRecurrentes", factureRecurrente.id),
      updateData
    );

    return factureRef.id;
  } catch (error) {
    console.error(
      "Erreur lors de la génération de la facture récurrente:",
      error
    );
    throw error;
  }
};

// Vérifier et générer les factures récurrentes dues
export const verifierFacturesRecurrentes = async (
  userId: string
): Promise<string[]> => {
  try {
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);

    // Récupérer les factures récurrentes actives dont la date d'émission est passée
    const facturesQuery = query(
      collection(db, "facturesRecurrentes"),
      where("userId", "==", userId),
      where("actif", "==", true),
      where("prochaineEmission", "<=", Timestamp.fromDate(aujourdhui))
    );

    const snapshot = await getDocs(facturesQuery);
    const facturesGenerees: string[] = [];

    // Pour chaque facture récurrente, générer la facture correspondante
    for (const docSnapshot of snapshot.docs) {
      const factureRecurrente = {
        id: docSnapshot.id,
        ...docSnapshot.data(),
        dateCreation: docSnapshot.data().dateCreation?.toDate
          ? docSnapshot.data().dateCreation.toDate()
          : new Date(docSnapshot.data().dateCreation || Date.now()),
        prochaineEmission: docSnapshot.data().prochaineEmission?.toDate
          ? docSnapshot.data().prochaineEmission.toDate()
          : new Date(docSnapshot.data().prochaineEmission || Date.now()),
        derniereEmission: docSnapshot.data().derniereEmission?.toDate
          ? docSnapshot.data().derniereEmission.toDate()
          : docSnapshot.data().derniereEmission
          ? new Date(docSnapshot.data().derniereEmission)
          : undefined,
      } as FactureRecurrente;

      // Récupérer le client
      const clientDoc = await getDoc(
        doc(db, "clients", factureRecurrente.clientId)
      );
      if (clientDoc.exists()) {
        const client = { id: clientDoc.id, ...clientDoc.data() } as Client;

        // Générer la facture
        const factureId = await genererFactureDepuisRecurrente(
          factureRecurrente,
          client
        );
        facturesGenerees.push(factureId);
      }
    }

    return facturesGenerees;
  } catch (error) {
    console.error(
      "Erreur lors de la vérification des factures récurrentes:",
      error
    );
    throw error;
  }
};
