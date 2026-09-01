# 🖼️ SCREEN 11 — ALERTES & NOTIFICATIONS
**Statut** : Compilé après entretien — méthodologie fonctionnelle uniquement
**Date** : 22 juillet 2026
**Screenshot associé** : IMG_0715 (Alertes & Notifications, jointe séparément)

---

## 1. Overview

- **Nom de l'écran** : Alertes & Notifications
- **Objectif** : Afficher l'historique des alertes (comportementales) et notifications programmées (planifiées) en un seul endroit — boîte de réception centralisée
- **Arrive de** : Menu de navigation / Cloche (bell icon) du Dashboard
- **Va vers** : Page de détails de l'alerte/notification (tap)
- **Priorité MVP** : MUST HAVE
- **Complexité** : Modéré

---

## 2. Distinction des trois types de notifications

**Important :** il existe trois catégories distinctes :

1. **ALERTES** (réactives, déclenchées par le comportement) :
   - Ex. : Budget dépassé 92%, Dépassement de limite, Score financier bas
   - **Sauvegardées en base de données**
   - Affichées dans l'historique de cet écran ✅
   - Envoyées en **push système** quand elles se déclenchent
   - Le mot "Alerte:" apparaît dans l'historique

2. **NOTIFICATIONS PROGRAMMÉES** (proactives, planifiées) :
   - Ex. : Score financier quotidien, Objectif du mois, Rappels récurrents
   - **Sauvegardées en base de données**
   - Affichées dans l'historique de cet écran ✅
   - Envoyées en **push système** selon la programmation (ex. 08:00 chaque jour)
   - Le mot "Notification:" apparaît dans l'historique

3. **NOTIFICATIONS TRANSIENTES** (feedback d'action, **non affichées ici**) :
   - Ex. : "Transaction enregistrée avec succès ✓", "Budget créé"
   - **NE PAS sauvegarder** en base de données
   - Affichées comme des **toasts éphémères** (pop-ups qui disparaissent après 2-3 secondes)
   - **Aucun historique** — n'apparaissent **pas** sur cette page
   - Feedback immédiat uniquement

---

## 3. Header

- Flèche retour (←)
- Titre "Alertes & Notifications"
- Icône "+" : **non applicable** pour cet écran (notifications sont auto-générées, pas créées manuellement)

---

## 4. Dropdowns de contrôle

- **Dropdown "Tout"** (filtre par type) — sélectionne ce qu'on affiche :
  - **Tout** (défaut) : affiche Alertes + Notifications programmées
  - **Alerte** : affiche uniquement les Alertes
  - **Notification** : affiche uniquement les Notifications programmées

- **Dropdown "Récent"** (filtre de tri/ordre) :
  - **Plus récent** (défaut) : tri par date descendante
  - **Plus utilisé** : alertes/notifications déclenchées le plus souvent en premier
  - **Alphabétique** : tri A→Z du message
  - **Par urgence** : alertes critiques en priorité (optionnel pour le MVP)

---

## 5. Groupement par période

Les alertes/notifications sont **groupées par jour/période** :
- **"Aujourd'hui"** : générées aujourd'hui
- **"Hier"** : générées hier
- **"Cette semaine"** / **"Semaine dernière"** : selon le contexte
- Anciennes : scroll vers le bas pour voir plus

---

## 6. Liste des alertes/notifications

Chaque item affiche :
- **Icône** : visuelle selon le type d'alerte/notification (budget, score, etc.)
- **Type** : "Alerte:" ou "Notification:" (en gras/titre)
- **Message** : courte description de ce qui s'est passé
- **Valeur/Statut** : à droite, avec couleur codée
  - **Rouge** : alerte/situation négative (ex. "+16%" = dépassement de 16%)
  - **Orange** : avertissement/approche limite (ex. "-15%" = approche limite)
  - **Vert** : bonne nouvelle/positif (ex. "70/1000" = score atteint)

Exemple du screenshot :
- "Alerte: Dépassement Budget Shopping (+16%)" → rouge
- "Notification: Score financier Bon - 70/1000" → vert

---

## 7. Interactions

| Geste | Action | Détail |
|---|---|---|
| **Tap simple** | Affiche les détails | Ouvre une page de détails complets de l'alerte/notification — contexte complet, actions possibles (ex. aller modifier le budget), date/heure exacte |
| **Long-press** | Menu d'options | Marquer comme lue / Archiver / Supprimer (optionnel pour le MVP) |
| **Swipe gauche** | Supprimer | Suppression avec confirmation (modal : "Êtes-vous sûr de vouloir supprimer cette notification ?") |

---

## 8. Écran de détails de l'alerte/notification (à créer par Claude Design)

**À afficher :**
- Message complet de l'alerte/notification
- Contexte détaillé (ex. quel budget, de combien le dépassement, date exacte, heure)
- Lien/Action contextuelle : ex. pour une alerte budget, un bouton "Voir le budget" qui navigue vers l'écran Budgets

**Structure :**
- Pas de formulaire d'édition — les alertes/notifications sont read-only
- Afficher des actions suggérées quand pertinent

---

## 9. Database

- **Table `alerts`** : user_id, type (budget, score, etc.), message, value, created_at, read_status
- **Table `scheduled_notifications`** : user_id, message, type, schedule (cron/frequency), created_at, is_active
- Historique : les deux tables servent de source de vérité ; afficher tout ce qui existe

---

## 10. Push notifications (système OS)

- Les Alertes et Notifications programmées déclenchent des **push système** vers l'OS (Android/iOS/Web)
- Les Notifications transientes (toasts) ne génèrent **pas** de push — feedback immédiat sur l'écran uniquement
- Push reçu = L'utilisateur peut taper sur la notification pour ouvrir l'app et voir les détails

---

## 11. Assets

- Voir `DESIGN-GLOBAL.md` pour le fond d'écran partagé
- Icônes alertes/notifications : design laissé à Claude Design

---

## 12. Points de clarification restants

- Marquer comme "lue" : toggle ou disparition automatique après lecture ?
- Archivage : faut-il un système d'archive séparé, ou juste une suppression ?
- Limite d'historique : garder les notifications indéfiniment, ou archiver après X jours ?

---

## 13. Validation

- Elias : ✅
- Claude : ✅ (compilé 22 juillet 2026)
