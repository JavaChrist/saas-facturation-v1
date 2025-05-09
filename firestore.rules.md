# Configuration des règles de sécurité Firestore

Pour résoudre les problèmes de permission "Missing or insufficient permissions", vous devez mettre à jour les règles de sécurité de votre base de données Firestore.

## Comment mettre à jour les règles

1. Allez sur la [Console Firebase](https://console.firebase.google.com/)
2. Sélectionnez votre projet "facturation-saas"
3. Dans le menu de gauche, cliquez sur "Firestore Database"
4. Cliquez sur l'onglet "Règles"
5. Remplacez les règles existantes par celles ci-dessous
6. Cliquez sur "Publier"

## Règles de sécurité recommandées

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Règle générale - par défaut tout est refusé
    match /{document=**} {
      allow read, write: if false;
    }

    // Règles pour la collection factures
    match /factures/{factureId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }

    // Règles pour la collection clients
    match /clients/{clientId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }

    // Règles pour la collection notifications
    // IMPORTANT: C'est cette règle qui manque et cause les erreurs
    match /notifications/{notificationId} {
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create, update, delete: if request.auth != null &&
                                     (request.resource.data.userId == request.auth.uid ||
                                      resource.data.userId == request.auth.uid);
    }

    // Autres collections si nécessaire...
  }
}
```

## Alternative temporaire

En attendant de mettre à jour les règles Firestore, nous avons mis en place un contournement temporaire dans le code avec `db._config.experimentalForceLongPolling = true` dans le fichier `src/lib/firebase.ts`.

Cette solution n'est pas idéale pour la production, alors assurez-vous de configurer correctement les règles de sécurité dès que possible.

## Comment vérifier si les règles fonctionnent

1. Ouvrez votre application
2. Allez à la page de débogage `/dashboard/debug`
3. Cliquez sur "Forcer la vérification"
4. Vérifiez dans la console du navigateur si les erreurs de permission ont disparu
