# 🖼️ SCREEN 3 — CONNEXION (USERNAME)
**Statut** : Révisé — méthodologie fonctionnelle uniquement
**Date** : 21 juillet 2026
**Screenshot associé** : IMG_0723 (Connexion - Username, jointe séparément)

---

## 1. Overview

- **Nom de l'écran** : Connexion - Username
- **Objectif** : Demander le nom d'utilisateur pour identifier le profil
- **Arrive de** : Connexion - Code d'invitation (Écran 2)
- **Va vers** : Dashboard (Écran 4+)
- **Priorité MVP** : MUST HAVE
- **Complexité** : Simple

---

## 2. Contenu affiché (texte exact)

- Titre : "Connexion"
- Label : "Nom" *(note : correspond techniquement au username, mais le libellé "Nom" est conservé pour la simplicité du MVP)*
- Placeholder recommandé : "ex: Elias"
- Bouton : "Confirmer"

---

## 3. Logique métier

### Validation

- Champ requis, ne peut pas être vide
- Ne peut pas être uniquement des espaces (trim avant validation, côté frontend et backend)
- Caractères spéciaux autorisés
- Pas de limite de longueur côté frontend (le backend décide)
- Unicité du username : probablement pas nécessaire pour le MVP (le code d'invitation sert déjà d'identifiant unique)

---

## 4. Rôle du bouton

### Bouton "Confirmer"
| Élément | Détail |
|---|---|
| Action | `POST /api/auth/profile` avec `{ username }`, authentifié via le token obtenu à l'étape précédente (code d'invitation) |
| Validation avant clic | Champ non vide, non uniquement des espaces |
| Après succès | Stocke la session utilisateur, navigue vers le Dashboard |
| Après échec | Affiche un message d'erreur, remet le focus sur le champ pour correction |
| Désactivé quand | Champ vide, ou validation en cours |
| Visible quand | Toujours |

---

## 5. États & comportements (fonctionnel)

- **Défaut** : champ vide, focus automatique au chargement de la page
- **Focus** : le champ actif doit être visuellement distinct (indicateur laissé à Claude Design)
- **Rempli** : texte saisi visible normalement
- **Erreur** : état visuel distinct sur le champ + message affiché ("Nom requis. Veuillez entrer votre nom." pour une validation vide, message générique pour une erreur serveur), focus revient sur le champ
- **Chargement** : bouton et champ désactivés pendant l'appel API (~1-2s)
- **Succès** : navigation vers le Dashboard, session utilisateur stockée

### Cas limites

- Champ vide ou uniquement des espaces → validation échoue, message d'erreur
- Texte très long (200+ caractères) → pas de limite frontend, le backend peut tronquer/rejeter
- Timeout réseau pendant la validation → retour à l'état normal + message d'erreur, réessai possible
- Token expiré/invalide (session de l'étape précédente) → redirection vers l'écran Connexion - Code d'invitation
- Utilisateur quitte la page pendant le chargement → comportement dépend du flux d'auth (probablement retour à la connexion si la session n'est pas confirmée)

---

## 6. Database

- **Table `users`** : `UPDATE username WHERE user_id` (dérivé du token d'auth) ; l'utilisateur est créé lors de l'étape du code d'invitation, complété ici avec son username

---

## 7. Intégrations

### API
`POST /api/auth/profile`
- Headers : `Authorization: Bearer [token de l'étape précédente]`
- Body : `{ username: "[saisie]" }`
- Réponses :
  - `200` → `{ success: true, user }` : stocke la session, navigue vers le Dashboard
  - `400` → erreur de validation (champ vide, etc.)
  - `401` → session expirée → redirection vers Connexion - Code d'invitation
  - `500` → erreur serveur générique
- Timeout recommandé : 5 secondes

---

## 8. Accessibilité (exigences fonctionnelles)

- Label associé au champ de saisie
- Message d'erreur lié au champ (aria-describedby) et annoncé (aria-live)
- Navigation clavier complète (Tab, Entrée pour soumettre)
- Focus visible

---

## 9. Points de clarification

- **Couleurs, typographie, tailles, espacement, indicateurs visuels de focus/erreur** : volontairement non spécifiés — laissés à Claude Design à partir du screenshot + design system
- Label "Nom" conservé tel quel pour le MVP — confirmé par Elias
- Placeholder "ex: Elias" à ajouter — confirmé par Elias
- Touche Entrée pour soumettre le formulaire → recommandé : oui, à confirmer
- Unicité du username → probablement non nécessaire pour le MVP, à confirmer

---

## 10. Validation

- Elias : ✅
- Claude : ✅ (révisé 21 juillet 2026)
