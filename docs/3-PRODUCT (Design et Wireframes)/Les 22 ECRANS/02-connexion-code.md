# 🖼️ SCREEN 2 — CONNEXION (CODE D'INVITATION)
**Statut** : Révisé — méthodologie fonctionnelle uniquement
**Date** : 21 juillet 2026
**Screenshot associé** : IMG_0724 (Connexion, jointe séparément)

---

## 1. Overview

- **Nom de l'écran** : Connexion - Code d'invitation
- **Objectif** : Authentifier l'utilisateur avec un code d'invitation à 6 chiffres
- **Arrive de** : Landing Page (Écran 1)
- **Va vers** : Connexion - Username (Écran 3)
- **Priorité MVP** : MUST HAVE
- **Complexité** : Modéré (logique de saisie + auto-déplacement du focus)

---

## 2. Contenu affiché (texte exact)

- Titre : "Connexion"
- Instruction : "Saisissez le code d'invitation"
- 6 champs de saisie (un chiffre par champ)
- Bouton : "Confirmer"

---

## 3. Logique métier

### Comportement de saisie (critique — à respecter précisément)

- **Auto-déplacement** : quand un chiffre est saisi dans une case, le focus passe automatiquement à la case suivante
- **Backspace** : sur une case vide, backspace déplace le focus vers la case précédente et efface son contenu
- **Copier-coller** : coller un code complet ("123456") répartit automatiquement un chiffre par case ; le focus va à la dernière case remplie
- **Navigation clavier** : flèches gauche/droite + Tab/Shift+Tab pour naviguer entre les cases
- **Validation de saisie** : exactement 6 chiffres (0-9 uniquement) ; impossible de soumettre si incomplet ou non numérique

### Validation backend

- Le code doit exister en base
- Le code ne doit pas être expiré
- Le code ne doit pas être déjà utilisé

---

## 4. Rôle du bouton

### Bouton "Confirmer"
| Élément | Détail |
|---|---|
| Action | Valide le code via `POST /api/auth/verify-code` avec `{ code }` |
| Validation avant clic | Les 6 cases doivent être remplies |
| Après succès | Stocke le token, navigue vers Connexion - Username |
| Après échec | Affiche un message d'erreur spécifique, conserve les valeurs saisies, remet le focus sur la première case |
| Désactivé quand | Cases incomplètes, ou validation en cours |
| Visible quand | Toujours |

---

## 5. États & comportements (fonctionnel)

- **Défaut** : 6 cases vides, focus automatique sur la première case au chargement de la page
- **Focus** : la case active doit être visuellement distincte des autres (indicateur laissé à Claude Design)
- **Remplie** : le chiffre saisi est visible (afficher en clair, pas de masquage type mot de passe — à confirmer, voir section 9)
- **Erreur** : état visuel distinct sur les 6 cases + message affiché ; les cases gardent leur contenu pour permettre la correction ; focus revient sur la première case. Messages différenciés selon le cas :
  - Code invalide → "Code invalide. Vérifiez et réessayez."
  - Code expiré → "Code expiré. Demandez un nouveau code."
  - Code déjà utilisé → "Ce code a déjà été utilisé."
  - Erreur serveur → "Erreur serveur. Réessayez."
- **Chargement** : bouton et cases désactivés pendant l'appel API (~1-2s), aucune saisie possible pendant ce temps
- **Succès** : navigation vers l'écran suivant, token conservé en session

### Cas limites

- Clic sur "Confirmer" avec cases incomplètes → empêché (bouton désactivé)
- Saisie d'un caractère non numérique → ignoré/filtré
- Collage d'un code contenant des non-chiffres → filtré, ne garder que les chiffres
- Timeout réseau pendant la validation → retour à l'état normal + message d'erreur, réessai possible
- Retour en arrière après succès → session active, ne pas réafficher cet écran
- Tentatives multiples échouées → limitation de débit côté backend (non critique pour le MVP)

---

## 6. Database

- **Table `invitation_codes`** : `SELECT code, is_used, expires_at WHERE code = [saisie]` ; `UPDATE is_used = true` après succès
- **Table `users`** : liée via `invitation_codes.user_id` ; utilisateur créé mais incomplet tant que le username n'est pas ajouté (Écran 3)

---

## 7. Intégrations

### API
`POST /api/auth/verify-code`
- Body : `{ code: "123456" }`
- Réponses :
  - `200` → `{ success: true, token, user_id }` : stocke le token, navigue vers Connexion - Username
  - `400` (code invalide) → `{ error: "Code invalide" }`
  - `400` (expiré) → `{ error: "Code expiré" }`
  - `400` (déjà utilisé) → message spécifique
  - `500` → erreur serveur
- Timeout recommandé : 5 secondes

### Session
- Token stocké après succès, doit persister au rechargement de page
- Réutilisé pour la requête de l'écran suivant

---

## 8. Accessibilité (exigences fonctionnelles)

- Chaque case a un label distinct (ex. "chiffre 1 sur 6")
- Navigation complète au clavier (Tab, Shift+Tab, flèches, Entrée pour soumettre)
- Erreurs annoncées aux lecteurs d'écran (aria-live)
- Focus visible sur l'élément actif

---

## 9. Points de clarification

- **Couleurs, tailles des cases, espacement, typographie, indicateurs visuels de focus/erreur** : volontairement non spécifiés — laissés à Claude Design à partir du screenshot + design system
- Afficher le chiffre en clair ou le masquer (type mot de passe) ? → à confirmer avec Elias
- Désactiver le bouton tant que les 6 cases ne sont pas remplies ? → recommandé : oui (feedback UX), à confirmer
- Touche Entrée pour soumettre le formulaire ? → recommandé : oui, à confirmer

---

## 10. Validation

- Elias : ✅
- Claude : ✅ (révisé 21 juillet 2026)
