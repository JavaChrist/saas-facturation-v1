# 🎭 Système de Modales Modernes

Un système de modales élégant et moderne pour remplacer les `alert()` et `confirm()` basiques de JavaScript.

## 🎯 **Fonctionnalités**

- ✅ **Modales élégantes** avec animations et transitions
- ✅ **Types multiples** : succès, erreur, avertissement, info, confirmation
- ✅ **Confirmations de suppression** avec styling dangereux
- ✅ **Fermeture automatique** avec barre de progression
- ✅ **Accessibilité** (ESC pour fermer, focus management)
- ✅ **Responsive** et compatible mobile
- ✅ **TypeScript** avec typage complet
- ✅ **Hook personnalisé** pour une utilisation simple

## 🚀 **Installation**

Tous les composants sont déjà installés dans votre projet :

```
src/
├── components/ui/
│   ├── Modal.tsx              # Composant modal de base
│   ├── ConfirmationModal.tsx  # Modal de confirmation
│   ├── NotificationModal.tsx  # Modal de notification
│   └── ModalManager.tsx       # Gestionnaire universel
├── hooks/
│   └── useModal.ts           # Hook personnalisé
└── components/examples/
    └── ModalExamples.tsx     # Exemples d'utilisation
```

## 📝 **Utilisation Simple**

### 1. **Import et Setup**

```typescript
import { useModal } from '@/hooks/useModal';
import ModalManager from '@/components/ui/ModalManager';

export default function MonComposant() {
  const modal = useModal();

  // ... votre logique

  return (
    <div>
      {/* Votre contenu */}

      {/* Ajouter le gestionnaire à la fin */}
      <ModalManager
        isOpen={modal.isOpen}
        onClose={modal.closeModal}
        onConfirm={modal.handleConfirm}
        modalType={modal.modalType}
        modalData={modal.modalData}
        isLoading={modal.isLoading}
      />
    </div>
  );
}
```

### 2. **Messages Simples**

```typescript
// Messages de succès (avec fermeture auto)
modal.showSuccess("Facture créée avec succès !");

// Messages d'erreur
modal.showError("Impossible de sauvegarder les données");

// Avertissements
modal.showWarning("Cette action nécessite une confirmation");

// Informations
modal.showInfo("Votre session expire dans 5 minutes");
```

### 3. **Confirmations de Suppression**

```typescript
const handleDelete = (itemName: string, id: string) => {
  modal.showDeleteConfirmation(
    itemName, // Ex: "la facture FCT-2025001"
    async () => {
      try {
        await deleteItem(id);
        modal.showSuccess("Élément supprimé avec succès");
      } catch (error) {
        modal.showError("Erreur lors de la suppression");
      }
    }
  );
};

// Utilisation
handleDelete("la facture FCT-2025001", "facture-id-123");
```

### 4. **Confirmations Personnalisées**

```typescript
modal.showConfirmation({
  title: "Envoyer l'email ?",
  message: "Êtes-vous sûr de vouloir envoyer cet email à tous les clients ?",
  confirmText: "Oui, envoyer",
  cancelText: "Annuler",
  isDangerous: false,
  icon: "warning",
});
```

## 🎨 **Types de Modales**

### **Messages de Notification**

| Type      | Couleur  | Usage               | Auto-close  |
| --------- | -------- | ------------------- | ----------- |
| `success` | 🟢 Vert  | Opérations réussies | ✅ Oui (3s) |
| `error`   | 🔴 Rouge | Erreurs             | ❌ Non      |
| `warning` | 🟡 Ambre | Avertissements      | ❌ Non      |
| `info`    | 🔵 Bleu  | Informations        | ❌ Non      |

### **Modales de Confirmation**

| Type           | Usage            | Bouton Confirmer |
| -------------- | ---------------- | ---------------- |
| `confirmation` | Actions normales | 🔵 Bleu          |
| `delete`       | Suppressions     | 🔴 Rouge         |

## ⚙️ **Options Avancées**

### **Messages avec Options**

```typescript
modal.showNotification({
  title: "Titre personnalisé",
  message: "Votre message ici",
  type: "success",
  autoClose: true,
  autoCloseDelay: 5000, // 5 secondes
  showOkButton: false, // Masquer le bouton OK
  okText: "Compris", // Texte du bouton OK
});
```

### **Confirmations Avancées**

```typescript
modal.showConfirmation({
  title: "Confirmer l'action",
  message: "Cette action est irréversible. Continuer ?",
  confirmText: "Oui, continuer",
  cancelText: "Annuler",
  isDangerous: true, // Bouton rouge
  icon: "delete", // Icône de suppression
});
```

## 🔧 **Exemples Pratiques**

### **Remplacement d'Alert**

**❌ Avant (Alert basique)**

```typescript
const handleSave = async () => {
  try {
    await saveData();
    alert("Données sauvegardées !");
  } catch (error) {
    alert("Erreur lors de la sauvegarde");
  }
};
```

**✅ Après (Modal moderne)**

```typescript
const handleSave = async () => {
  try {
    await saveData();
    modal.showSuccess("Données sauvegardées !");
  } catch (error) {
    modal.showError("Erreur lors de la sauvegarde");
  }
};
```

### **Remplacement de Confirm**

**❌ Avant (Confirm basique)**

```typescript
const handleDelete = async (id: string) => {
  if (confirm("Êtes-vous sûr de vouloir supprimer ?")) {
    try {
      await deleteItem(id);
      alert("Élément supprimé");
    } catch (error) {
      alert("Erreur lors de la suppression");
    }
  }
};
```

**✅ Après (Modal moderne)**

```typescript
const handleDelete = async (id: string) => {
  modal.showDeleteConfirmation("cet élément", async () => {
    try {
      await deleteItem(id);
      modal.showSuccess("Élément supprimé avec succès");
    } catch (error) {
      modal.showError("Erreur lors de la suppression");
    }
  });
};
```

## 🎯 **Hook useModal - API Complète**

```typescript
const modal = useModal();

// État
modal.isOpen          // boolean - Modal ouverte ?
modal.isLoading       // boolean - Chargement en cours ?
modal.modalType       // 'confirmation' | 'notification'
modal.modalData       // Données de la modal

// Actions de base
modal.openModal()     // Ouvrir une modal
modal.closeModal()    // Fermer la modal
modal.handleConfirm() // Gérer la confirmation

// Messages rapides
modal.showSuccess(message, title?, autoClose?)
modal.showError(message, title?, autoClose?)
modal.showWarning(message, title?, autoClose?)
modal.showInfo(message, title?, autoClose?)

// Confirmations
modal.showConfirmation(options)
modal.showDeleteConfirmation(itemName, onDelete)
modal.showNotification(options)
```

## 🎨 **Personnalisation CSS**

Les modales utilisent Tailwind CSS et peuvent être personnalisées :

```css
/* Couleurs personnalisées */
.modal-success {
  @apply bg-green-50 border-green-200;
}
.modal-error {
  @apply bg-red-50 border-red-200;
}
.modal-warning {
  @apply bg-amber-50 border-amber-200;
}

/* Animations personnalisées */
.modal-enter {
  @apply animate-in fade-in slide-in-from-top-4 duration-300;
}
.modal-exit {
  @apply animate-out fade-out slide-out-to-top-4 duration-200;
}
```

## 🔧 **Migration depuis Alert/Confirm**

### **Script de Migration Automatique**

```bash
# Rechercher tous les alert() dans le projet
grep -r "alert(" src/ --include="*.tsx" --include="*.ts"

# Rechercher tous les confirm() dans le projet
grep -r "confirm(" src/ --include="*.tsx" --include="*.ts"
```

### **Pattern de Remplacement**

1. **Ajouter les imports** au début du fichier
2. **Ajouter le hook** dans le composant
3. **Remplacer les alert()** par `modal.showXXX()`
4. **Remplacer les confirm()** par `modal.showConfirmation()`
5. **Ajouter ModalManager** à la fin du JSX

## ✅ **Avantages vs Alert/Confirm**

| Fonctionnalité     | Alert/Confirm         | Modal System                    |
| ------------------ | --------------------- | ------------------------------- |
| **Design**         | ❌ Basique OS         | ✅ Moderne, personnalisé        |
| **UX**             | ❌ Bloque l'interface | ✅ Non-bloquant                 |
| **Responsive**     | ❌ Non                | ✅ Oui                          |
| **Accessibilité**  | ❌ Limitée            | ✅ Complète (ESC, focus)        |
| **Animations**     | ❌ Aucune             | ✅ Transitions fluides          |
| **Types**          | ❌ Un seul type       | ✅ Multiples types              |
| **Customisation**  | ❌ Impossible         | ✅ Complètement personnalisable |
| **Loading States** | ❌ Non                | ✅ Gestion du loading           |
| **Auto-close**     | ❌ Non                | ✅ Oui avec progression         |

## 🚀 **Status d'Implémentation**

- ✅ **Page Factures** - Entièrement migrée
- ⏳ **Page Clients** - En cours
- ⏳ **Page Utilisateurs** - En cours
- ⏳ **Autres pages** - À faire

## 📋 **Todo**

- [ ] Migrer tous les `alert()` restants
- [ ] Migrer tous les `confirm()` restants
- [ ] Ajouter des tests unitaires
- [ ] Créer des modales spécialisées (upload, etc.)
- [ ] Améliorer l'accessibilité (ARIA labels)

---

**Le système de modales est maintenant prêt à remplacer toutes les alertes de votre application ! 🎉**
