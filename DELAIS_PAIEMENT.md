# Délais de Paiement - Documentation

## Vue d'ensemble

Le système de délais de paiement a été étendu pour supporter des délais plus complexes, notamment les délais "fin de mois" couramment utilisés dans le commerce B2B.

## Types de délais disponibles

### Délais simples

- **À réception** : Paiement immédiat
- **8 jours** : 8 jours après émission
- **30 jours** : 30 jours après émission
- **30 jours net** : 30 jours calendaires après émission
- **60 jours** : 60 jours après émission

### Délais complexes

- **45 jours fin de mois** : 45 jours puis fin de mois
- **30 jours fin de mois le 10** : 30 jours puis fin de mois puis le 10 du mois suivant
- **60 jours fin de mois le 10** : 60 jours puis fin de mois puis le 10 du mois suivant
- **30 jours fin de mois le 15** : 30 jours puis fin de mois puis le 15 du mois suivant
- **60 jours fin de mois le 15** : 60 jours puis fin de mois puis le 15 du mois suivant

## Exemples de calculs

### Délai "30 jours fin de mois le 10"

**Principe :**

1. Ajouter 30 jours à la date de création
2. Aller à la fin du mois de cette nouvelle date
3. Ajouter 10 jours (donc le 10 du mois suivant)

**Exemples :**

- Facture du 15/01/2024 → 15/01 + 30j = 14/02 → fin février = 29/02 → +10j = 10/03/2024
- Facture du 31/01/2024 → 31/01 + 30j = 02/03 → fin mars = 31/03 → +10j = 10/04/2024

### Délai "45 jours fin de mois"

**Principe :**

1. Ajouter 45 jours à la date de création
2. Aller à la fin du mois de cette nouvelle date

**Exemples :**

- Facture du 15/01/2024 → 15/01 + 45j = 01/03 → fin mars = 31/03/2024
- Facture du 10/02/2024 → 10/02 + 45j = 26/03 → fin mars = 31/03/2024

## Implémentation technique

### Service principal

Le service `delaisPaiementService.ts` contient :

- `DelaiPaiementType` : Type TypeScript pour tous les délais
- `calculerDateEcheance()` : Fonction principale de calcul
- `DELAIS_PAIEMENT_OPTIONS` : Liste des options disponibles

### Composant UI

Le composant `DelaiPaiementSelector` fournit :

- Sélecteur avec toutes les options
- Descriptions des délais
- Exemples de calcul en temps réel

### Migration

Le script `migrationDelaisPaiement.ts` permet :

- Migration automatique des anciens délais
- Vérification de la cohérence des données
- Mapping des formats non standard

## Utilisation

### Dans un composant React

```typescript
import { DelaiPaiementSelector } from "@/components/DelaiPaiementSelector";
import { DelaiPaiementType } from "@/services/delaisPaiementService";

const [delai, setDelai] = useState<DelaiPaiementType>(
  "30 jours fin de mois le 10"
);

<DelaiPaiementSelector
  value={delai}
  onChange={setDelai}
  showDescription={true}
  showExample={true}
/>;
```

### Calcul d'échéance

```typescript
import { calculerDateEcheance } from "@/services/delaisPaiementService";

const dateCreation = new Date("2024-01-15");
const delai = "30 jours fin de mois le 10";
const dateEcheance = calculerDateEcheance(dateCreation, delai);
// Résultat : 10/03/2024
```

## Gestion des cas particuliers

### Jours inexistants

Si le jour demandé n'existe pas dans le mois (ex: 31 février), le système utilise le dernier jour du mois.

### Années bissextiles

Le calcul prend en compte automatiquement les années bissextiles.

### Fuseaux horaires

Toutes les dates sont normalisées à minuit (00:00:00) pour éviter les problèmes de fuseau horaire.

## Tests

Une page de test est disponible à `/dashboard/test-delais` pour :

- Tester interactivement les calculs
- Voir des exemples concrets
- Vérifier le comportement avec différentes dates

## Migration des données existantes

Pour migrer les clients existants :

```typescript
import { migrerDelaisPaiementClients } from "@/utils/migrationDelaisPaiement";

// Migrer tous les clients d'un utilisateur
const resultat = await migrerDelaisPaiementClients(userId);

// Vérifier l'état des délais
const verification = await verifierDelaisPaiementClients(userId);
```

## Compatibilité

Le système est rétrocompatible avec les anciens délais :

- Les délais existants continuent de fonctionner
- La migration se fait automatiquement lors de la première utilisation
- Aucune perte de données

## Support

Les nouveaux délais sont supportés dans :

- ✅ Gestion des clients
- ✅ Création de factures
- ✅ Calcul des notifications de retard
- ✅ API de notifications
- ✅ Génération PDF (affichage du délai)
- ✅ Factures récurrentes
