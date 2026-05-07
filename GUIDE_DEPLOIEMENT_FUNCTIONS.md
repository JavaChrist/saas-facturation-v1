# Guide : Déploiement des Cloud Functions Firebase et configuration des emails

Ce guide vous accompagne pour déployer les Cloud Functions (dont les rappels automatiques) et configurer l'envoi d'emails.

---

## Prérequis

1. **Node.js** installé (v18 ou supérieur)
2. **Firebase CLI** installé : `npm install -g firebase-tools`
3. **Compte Firebase** avec le projet configuré
4. **Compte email** pour l'envoi (Gmail ou autre SMTP)

---

## Étape 1 : Connexion à Firebase

```bash
firebase login
```

Si vous avez plusieurs projets Firebase :

```bash
firebase use <votre-projet-id>
```

Pour lister vos projets :

```bash
firebase projects:list
```

---

## Étape 2 : Configuration des variables d'environnement

Les Cloud Functions utilisent **Nodemailer** avec Gmail ou un serveur SMTP. Vous avez deux méthodes pour configurer les variables.

### Option A : Firebase Config (recommandé pour la production)

```bash
# Email expéditeur (doit être vérifié dans Gmail si vous utilisez Gmail)
firebase functions:config:set email.from="facturation@votredomaine.com"

# Email commercial (pour les demandes de contact)
firebase functions:config:set email.commercial="votre-email@domaine.com"

# Variables sensibles via .env (voir Option B)
```

### Option B : Fichier .env (plus sécurisé pour les mots de passe)

1. Créez le fichier `functions/.env` (il ne doit **pas** être commité) :

```bash
cd functions
```

2. Créez le fichier `.env` avec le contenu suivant (configuré pour **IONOS SMTP**) :

```
SMTP_HOST=smtp.ionos.fr
SMTP_PORT=587
EMAIL_USER=contact@votredomaine.fr
EMAIL_PASSWORD=votre-mot-de-passe
EMAIL_FROM=Facturation <contact@votredomaine.fr>
BASE_URL=https://votre-domaine.com
```

> **IONOS** : Utilisez votre adresse email IONOS et le mot de passe de votre boîte mail.

---

## Étape 3 : Fichier .env des functions

Le projet utilise déjà `dotenv` pour charger `functions/.env`. Créez ce fichier :

```bash
cd functions
```

Créez `functions/.env` avec vos identifiants (voir Étape 2).

> ⚠️ Le fichier `.env` est ignoré par Git. Ne le commitez jamais.

---

## Étape 4 : Vérifier le predeploy (optionnel)

Le `firebase.json` exécute un lint avant le déploiement. Si le lint échoue, vous pouvez temporairement le désactiver dans `firebase.json` :

```json
"predeploy": ["npm --prefix \"$RESOURCE_DIR\" run build"]
```

(Supprimez la partie `run lint` si nécessaire.)

---

## Étape 5 : Build et déploiement

```bash
# Depuis la racine du projet
cd c:\Users\conta\Desktop\Applications\saas-facturation-v1

# Build des functions
cd functions
npm run build

# Si des erreurs TypeScript apparaissent, corrigez-les avant de continuer

# Retour à la racine et déploiement
cd ..
firebase deploy --only functions
```

Pour déployer uniquement la fonction de rappels :

```bash
firebase deploy --only functions:sendDailyPaymentReminders
```

---

## Étape 6 : Vérifier le déploiement

1. **Console Firebase** : https://console.firebase.google.com  
   → Votre projet → Functions → vous devriez voir `sendDailyPaymentReminders` et les autres fonctions.

2. **Logs** : pour suivre l'exécution des rappels (tous les jours à 9h Paris) :

```bash
firebase functions:log
```

---

## Région de déploiement

Les fonctions sont déployées en **europe-west1** (Belgique) pour :
- Respecter le RGPD (données en Europe)
- Réduire la latence pour les utilisateurs européens

---

## Résumé des fonctions déployées

| Fonction | Type | Description |
|----------|------|-------------|
| `sendUserInvitation` | HTTPS (onCall) | Envoi d'invitations utilisateurs |
| `sendInvoiceByEmail` | HTTPS (onCall) | Envoi de factures par email |
| `sendContactRequest` | HTTPS (onCall) | Demandes commerciales |
| `sendDailyPaymentReminders` | Planifiée (cron) | Rappels automatiques à 9h chaque jour |

---

## Dépannage

### Erreur "Billing account not configured"
Les Cloud Functions nécessitent le plan Blaze (facturation à l'usage). Activez-le dans la console Firebase → Paramètres du projet → Facturation.

### Erreur d'envoi d'email
- Vérifiez que `EMAIL_USER` et `EMAIL_PASSWORD` sont corrects
- Pour Gmail : utilisez un mot de passe d'application
- Consultez les logs : `firebase functions:log`

### La fonction planifiée ne s'exécute pas
- Vérifiez le fuseau horaire : `Europe/Paris` (9h = 8h UTC en hiver)
- Les fonctions planifiées peuvent avoir un délai de quelques minutes

---

## Sécurité

- **Ne commitez jamais** le fichier `functions/.env`
- Ajoutez `functions/.env` dans `.gitignore` si ce n'est pas déjà fait
- Pour la production, privilégiez les secrets Firebase ou Google Secret Manager
