# Tester les Cloud Functions

## 1. Rappels automatiques (sendDailyPaymentReminders)

Cette fonction s'exécute automatiquement à **9h (Europe/Paris)** chaque jour. Pour la tester sans attendre :

### Déclencher manuellement

```bash
gcloud functions call sendDailyPaymentReminders --region=europe-west1 --data='{}'
```

### Vérifier les logs

Dans la [Console Firebase](https://console.firebase.google.com) :
1. **facturation-saas** → **Functions** → **sendDailyPaymentReminders** → **Logs**

Ou [Google Cloud Logging](https://console.cloud.google.com/logs) → filtrer par `sendDailyPaymentReminders`

Les messages utiles :
- "Démarrage des rappels automatiques..."
- "X facture(s) à relancer trouvée(s)"
- "EMAIL_USER ou EMAIL_PASSWORD manquant" (si config incorrecte)
- "Erreur envoi email..." (si IONOS refuse)

Tu devrais voir :
- "Démarrage des rappels automatiques pour factures en retard"
- Le nombre d'emails envoyés (ou 0 si aucune facture "À relancer")

### Prérequis pour recevoir un email

1. Avoir au moins une facture avec le statut **"À relancer"**
2. La facture doit avoir un client avec un email valide

---

## 2. sendContactRequest (formulaire de contact)

Si la fonction est invocable (IAM corrigé) :

1. Va sur ta page d'abonnement : `https://facturation.javachrist.eu/dashboard/abonnement` (ou la page avec le formulaire de contact)
2. Remplis et envoie le formulaire de demande commerciale
3. Vérifie que tu reçois l'email de confirmation

---

## 3. sendInvoiceByEmail et sendUserInvitation

Ces fonctions sont appelées depuis l'application. Si l'IAM bloque encore :

- **Factures** : ton app utilise déjà `/api/send-invoice` (Resend) pour envoyer les factures → ça fonctionne sans Cloud Functions
- **Invitations** : vérifie si l'app utilise la Cloud Function ou une API route

---

## 4. Vérifier l'état des fonctions

```bash
# Lister les fonctions déployées
gcloud functions list --region=europe-west1
```

Ou : [Console Firebase](https://console.firebase.google.com) → **facturation-saas** → **Functions**.

---

## Résumé des tests

| Fonction | Test rapide |
|----------|-------------|
| sendDailyPaymentReminders | `gcloud functions call sendDailyPaymentReminders --region=europe-west1` |
| sendContactRequest | Envoyer le formulaire depuis l'app |
| sendInvoiceByEmail | Envoyer une facture par email depuis l'app |
| sendUserInvitation | Inviter un utilisateur depuis l'app |
