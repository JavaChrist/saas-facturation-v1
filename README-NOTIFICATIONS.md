# Système de Notifications pour Factures en Retard

## 🔴 Problème Actuel: Missing or insufficient permissions

Le système de notifications pour les factures en retard affiche actuellement des erreurs de permission dans la console:

```
FirebaseError: Missing or insufficient permissions.
```

Ces erreurs se produisent car les règles de sécurité Firestore n'autorisent pas la lecture et l'écriture dans la collection `notifications`.

## ✅ Solution 1: Configurer les règles de sécurité Firestore

1. Allez sur la [Console Firebase](https://console.firebase.google.com/)
2. Sélectionnez votre projet "facturation-saas"
3. Dans le menu de gauche, cliquez sur "Firestore Database"
4. Cliquez sur l'onglet "Règles"
5. Ajoutez les règles suivantes pour la collection notifications:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Vos règles existantes pour les autres collections...

    // Règles pour la collection notifications
    match /notifications/{notificationId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

## ✅ Solution 2: Désactiver temporairement le système de notifications

Si vous n'avez pas accès aux règles Firestore, nous avons temporairement désactivé les fonctionnalités qui causent des erreurs:

1. Les notifications ne sont pas créées pour le moment
2. Aucune erreur ne s'affiche dans l'interface utilisateur
3. L'application fonctionne normalement sans les notifications

## 🔄 Pour réactiver les notifications

Quand vous aurez configuré les règles de sécurité Firestore, modifiez le fichier `src/services/notificationService.ts` pour:

1. Décommenter le code permettant de récupérer les notifications
2. Décommenter le code permettant de vérifier les factures en retard
3. Supprimer les lignes qui retournent des tableaux vides

## 🧪 Tester si les règles fonctionnent

1. Après avoir configuré les règles Firestore, allez à `/dashboard/debug`
2. Cliquez sur le bouton "Tester les permissions"
3. Si le test réussit, vous pouvez réactiver les notifications

## 📊 Structure des Données

Les notifications sont stockées dans Firestore avec cette structure:

```typescript
interface Notification {
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
```
