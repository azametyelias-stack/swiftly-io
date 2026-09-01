# 🖼️ SCREEN 22 — PARAMÈTRES UTILISATEUR

**Statut:** À valider  
**Date:** 25 août 2026  
**Screenshot associé:** À fournir

---

## 1. Overview

- **Nom de l'écran:** Paramètres Utilisateur
- **Objectif:** Permettre à l'utilisateur de gérer son profil et préférences
- **Arrive de:** Menu swipe (05) → "Paramètres"
- **Va vers:** Retour au Menu ou Dashboard
- **Priorité MVP:** SHOULD HAVE (peut être simplifié en v1)
- **Complexité:** Simple

---

## 2. Contenu affiché

**Section Profil:**
- Nom complet (éditable)
- Email (affichage seul, non-éditable en MVP)
- Avatar/photo profil (éditable, upload image)

**Section Préférences:**
- Devise par défaut (dropdown: FCFA, USD, EUR, autre)
- Thème (toggle: Clair / Sombre)
- Langue (dropdown: Français, Anglais, autre)

**Section Aide & Support:**
- "Aide & FAQ" (lien vers section 13)
- "Politique de confidentialité" (lien vers section 20)
- "Conditions générales" (lien vers section externe)
- "Contacter le support" (email ou formulaire)

**Section Déconnexion:**
- Bouton "Déconnexion" (rouge/warning)

---

## 3. Logique métier

- **Nom:** Peut être modifié, validation simple (min 2 caractères)
- **Devise:** Détermine la devise affichée partout dans l'app
  - Défaut: basé sur la localisation de l'utilisateur (Togo = FCFA)
  - Change: s'applique immédiatement à tous les écrans
- **Thème:** Light/Dark mode
  - Défaut: Light (peut être changé à future)
  - Change: s'applique immédiatement
- **Langue:** FR/EN (autres langues future)
  - Défaut: FR (basé sur locale du device)
  - Change: recharge l'app ou change contenu en direct
- **Déconnexion:** Efface session, redirect vers Landing (01)

---

## 4. États & comportements

- **Chargement initial:** skeleton loaders pour champs
- **Édition nom:** champ inline edit, bouton "Enregistrer"
- **Upload photo:** file picker, puis preview, puis upload
- **Changement devise/thème:** immédiat (no confirmation needed)
- **Succès:** toast "Paramètres mis à jour ✓"
- **Erreur:** toast "Erreur. Réessayer."

---

## 5. Interactions

| Élément | Action | Résultat |
|---------|--------|----------|
| Champ nom | Edit + Save | Toast "Nom mis à jour ✓" |
| Avatar | Upload | Affiche preview + save |
| Devise | Dropdown change | Immédiat, recharge balances |
| Thème | Toggle | Immédiat, change couleurs app |
| Langue | Dropdown | Immédiat ou refresh (selon implémentation) |
| "Aide & FAQ" | Tap | → Section 13 |
| "Politique" | Tap | → Section 20 |
| "Conditions" | Tap | → Lien externe |
| "Contacter support" | Tap | → Email client OU formulaire modal |
| "Déconnexion" | Tap | Modal "Êtes-vous sûr?" → Landing (01) |

---

## 6. Base de données

Récupère & modifie:
- users.id
- users.name (éditable)
- users.email (lecture seul)
- users.avatar_url (éditable, upload)
- users.preferred_currency (éditable, default = FCFA)
- users.theme (éditable, default = light)
- users.language (éditable, default = fr)
- users.created_at (affichage optionnel: "Compte créé le...")

---

## 7. Accessibilité

- Tous les champs: accessible au clavier
- Labels clairs et associés
- Bouton déconnexion: well-spaced pour éviter tap accidentel
- Confirmation modale avant déconnexion (prévention erreur)

---

## 8. Sécurité

- Email: lecture seul (changement future via vérification code)
- Password change: future (Phase 2)
- Sensitive fields: aucun stockage côté local (sessionStorage seulement)

---

## 9. Cas limites

- Utilisateur upload image 50MB: rejeter avec "Image trop grande"
- Utilisateur change devise pendant transaction en cours: applique après
- Utilisateur change langue pendant menu ouvert: menu recharge
- Déconnexion accidentelle: no undo (must login again)

---

## 10. Points de clarification

- Avatar: où stocké? (Supabase Storage?)
- Changement langue: reload page ou in-memory? (Probablement in-memory)
- 2FA/authentification forte pour change email? (Futur, MVP: non)
- Afficher "Compte créé le..."? (Optionnel)
- Boutton "Supprimer le compte"? (MVP: non, futur)

---

## 11. Version MVP simplifiée

Si besoin de simplifier (time constraint):
- Garder: nom + avatar + devise + déconnexion (4 items)
- Optionnel: thème + langue (peut be future)
- Optionnel: aide & FAQ (peut pointer vers external wiki)

---

## 12. Layout suggéré

```
┌─────────────────────────────────┐
│ ← Paramètres           [gear]   │
├─────────────────────────────────┤
│                                 │
│  [Avatar]                       │
│  Bad Boy                         │
│  bad@example.com                │
│                                 │
│ ─────────────────────────────── │
│                                 │
│ Devise: FCFA [dropdown]         │
│ Thème: Clair / Sombre [toggle]  │
│ Langue: Français [dropdown]     │
│                                 │
│ ─────────────────────────────── │
│                                 │
│ 🔗 Aide & FAQ                    │
│ 🔗 Politique de confidentialité │
│ 🔗 Conditions générales         │
│ 📧 Contacter le support         │
│                                 │
│ ─────────────────────────────── │
│                                 │
│ [🚪 Déconnexion]                │
│                                 │
└─────────────────────────────────┘
```

---
