# Corriger l'erreur IAM "Failed to set invoker"

Les fonctions **ont été créées** mais Firebase n'a pas pu définir les permissions d'invocation. Voici comment corriger.

---

## Option 1 : Via Google Cloud Console (recommandé)

1. Va sur [Google Cloud Console](https://console.cloud.google.com)
2. Sélectionne le projet **facturation-saas**
3. **IAM et administration** → **IAM**
4. Trouve ton compte (contact@javachrist.fr)
5. Clique sur l'icône crayon (modifier)
6. Clique sur **+ Ajouter un autre rôle**
7. Ajoute le rôle **Administrateur de Cloud Functions** (`Cloud Functions Admin`)
8. Enregistre

Puis redéploie :
```bash
firebase deploy --only functions
```

---

## Option 2 : Via gcloud (ligne de commande)

Si tu as `gcloud` installé et configuré :

```bash
# Donner le rôle Cloud Functions Admin à ton compte
gcloud projects add-iam-policy-binding facturation-saas \
  --member="user:contact@javachrist.fr" \
  --role="roles/cloudfunctions.admin"
```

Puis redéploie :
```bash
firebase deploy --only functions
```

---

## Option 3 : Définir manuellement l'invoker (si Option 1/2 impossible)

Si tu ne peux pas obtenir le rôle Admin, un propriétaire du projet peut exécuter :

```bash
# Rendre les fonctions invocables (Firebase gère l'auth dans le code)
gcloud functions add-invoker-policy-binding sendInvoiceByEmail --region=europe-west1 --member="allUsers"
gcloud functions add-invoker-policy-binding sendContactRequest --region=europe-west1 --member="allUsers"
gcloud functions add-invoker-policy-binding sendUserInvitation --region=europe-west1 --member="allUsers"
```

---

## Bonne nouvelle

**sendDailyPaymentReminders** est déployée et fonctionne. Les rappels automatiques à 9h (Europe/Paris) sont actifs.

Les 3 autres fonctions (invitations, factures, contact) existent mais ne sont pas encore invocables tant que l'IAM n'est pas corrigé.
