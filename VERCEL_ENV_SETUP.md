# 🚀 Configuration des variables d'environnement pour Vercel

## ⚠️ Variables manquantes détectées lors du déploiement

Vous devez configurer ces variables d'environnement dans votre dashboard Vercel :

### 📧 Configuration Resend (obligatoire)

```
RESEND_API_KEY=re_xxxxxxxxxx
```

### 🔥 Configuration Firebase (obligatoire)

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=votre-projet.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=votre-projet-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=votre-projet.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

### 🔥 Configuration Firebase Admin (pour les API)

```
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nVOTRE_CLE_PRIVEE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@votre-projet.iam.gserviceaccount.com
```

### 💳 Configuration Stripe (obligatoire)

```
STRIPE_SECRET_KEY=sk_live_XXXXXXXXXX
STRIPE_PREMIUM_PRICE_ID=price_XXXXXXXXXX
STRIPE_ENTREPRISE_PRICE_ID=price_XXXXXXXXXX
STRIPE_FREE_PRICE_ID=price_XXXXXXXXXX
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_XXXXXXXXXX
```

### 🌐 Configuration URL de base

```
NEXT_PUBLIC_BASE_URL=https://votre-domaine.vercel.app
NEXT_PUBLIC_URL=https://votre-domaine.vercel.app
```

## 📝 Comment configurer dans Vercel

1. **Aller dans votre projet Vercel**
2. **Cliquer sur "Settings"**
3. **Aller dans "Environment Variables"**
4. **Ajouter chaque variable une par une**
5. **Sélectionner les environnements** : Production, Preview, Development
6. **Redéployer** le projet

## 🔧 Obtenir les clés Firebase Admin

1. **Aller dans Firebase Console**
2. **Project Settings > Service Accounts**
3. **Cliquer sur "Generate new private key"**
4. **Télécharger le fichier JSON**
5. **Extraire les valeurs** :
   - `private_key` → `FIREBASE_PRIVATE_KEY`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`

⚠️ **Important** : Remplacez les `\n` par de vraies nouvelles lignes dans la clé privée.

## 🎯 Variables critiques manquantes actuellement

D'après les logs de déploiement, ces variables sont `undefined` :

- `STRIPE_PREMIUM_PRICE_ID`
- `STRIPE_ENTREPRISE_PRICE_ID`
- `STRIPE_FREE_PRICE_ID`
- `NEXT_PUBLIC_URL`

Ajoutez-les dans Vercel pour corriger les erreurs de déploiement.

## ✅ Vérification

Une fois configuré, redéployez et vérifiez que :

- ✅ Le build se termine sans erreur
- ✅ Les API routes fonctionnent
- ✅ Les emails Resend sont envoyés
- ✅ Les paiements Stripe fonctionnent
