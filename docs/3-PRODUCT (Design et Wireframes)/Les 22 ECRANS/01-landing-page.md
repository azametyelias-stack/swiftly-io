# 🖼️ SCREEN 1 — LANDING PAGE
**Statut** : Révisé — méthodologie fonctionnelle uniquement
**Date** : 21 juillet 2026
**Screenshot associé** : IMG_0726 (Landing Page, jointe séparément)

---

## 1. Overview

- **Nom de l'écran** : Landing Page
- **Objectif** : Présenter Swiftly.io / SwiftTrack et motiver l'utilisateur à démarrer
- **Arrive de** : Première visite (aucun écran précédent)
- **Va vers** : Écran de connexion (code d'invitation)
- **Priorité MVP** : MUST HAVE
- **Complexité** : Simple

---

## 2. Contenu affiché (texte exact)

- Logo : "Swiftly.io"
- Titre : "PRENDRE CONTROLE"
- Sous-titre (accentué) : "FINANCIEREMENT"
- Description : "Tracker vos finances du chao a la clarté"
  ⚠️ À reconfirmer avec Elias — possible coquille ("chaos" + accent sur "à" ?)
- Bouton : "Démarrer"

---

## 3. Logique métier

- Page **100% statique**, aucune donnée dynamique
- Aucune authentification requise
- Aucun appel API, aucune requête base de données
- Aucune validation de formulaire (pas de champ de saisie)

---

## 4. Rôle du bouton

### Bouton "Démarrer"
| Élément | Détail |
|---|---|
| Action | Navigation vers l'écran de connexion (code invitation) |
| Validation avant clic | Aucune |
| Après clic | Navigation directe, pas d'appel API |
| Erreur possible | Aucune |
| Désactivé quand | Jamais |
| Visible quand | Toujours |

---

## 5. États & comportements (fonctionnel)

- **Chargement initial** : la page doit s'afficher rapidement (page statique)
- **Pendant la navigation** (après clic "Démarrer") : éviter que des clics multiples déclenchent plusieurs navigations — ignorer/désactiver les clics suivants pendant la transition
- **États vide / erreur** : non applicables (page statique, pas de données)

---

## 6. Database

Aucune. Page statique, pas de requête.

---

## 7. Intégrations

Navigation simple vers l'écran de connexion. Pas d'appel API, pas de service externe.

---

## 8. Accessibilité (exigences fonctionnelles)

- Hiérarchie de titres sémantique (H1 puis H2)
- Bouton actionnable au clavier (Tab + Entrée)
- Logo avec texte alternatif

---

## 9. Assets à fournir séparément

- **Média de fond** : image (potentiellement vidéo à l'avenir) en plein cadre derrière tout le contenu — pattern "hero background" classique, avec logo/titres/bouton superposés par-dessus en overlay. Le fichier média lui-même doit être fourni tel quel (asset unique, non déductible d'une description) ; la structure "contenu superposé sur fond plein cadre" est déductible du screenshot par Claude Design
- **Dégradé noir en bas de l'image** : pas de fichier nécessaire, déductible du screenshot par Claude Design

## 10. Points de clarification

- **Couleurs, typographie, tailles, espacement, mise en page exacte** (hors assets ci-dessus) : volontairement **non spécifiés** dans ce document — laissés à l'appréciation de Claude Design à partir du screenshot Figma joint et du design system à venir. C'est un test de fidélité de reproduction.
- Texte exact de la description à reconfirmer (voir section 2)

---

## 11. Validation

- Elias : ✅
- Claude : ✅ (révisé 21 juillet 2026)
