# 📄 SCREEN-21: PRIVACY PAGE (/privacy)

**Type:** Full page  
**URL:** `/privacy`  
**Accessible from:** Footer link, Consent Banner link  
**Template:** Landing page layout  

---

## 📐 Layout & Structure

### Desktop (1920px)

```
┌────────────────────────────────────────────────────────┐
│ NAVBAR (Swiftly logo + Settings)                       │
├────────────────────────────────────────────────────────┤
│                                                         │
│                    MAX-WIDTH 1200px                    │
│                                                         │
│  ╔══════════════════════════════════════════════════╗  │
│  ║ 🔒 Politique de Confidentialité                  ║  │
│  ║                                                  ║  │
│  ║ Dernière mise à jour: Août 2026                 ║  │
│  ║ Version: 1.0 | Status: ✅ RGPD Compliant        ║  │
│  ║                                                  ║  │
│  ║ Swiftly.io s'engage à protéger ta vie privée... ║  │
│  ╚══════════════════════════════════════════════════╝  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ TABLE OF CONTENTS (Sticky left sidebar)         │  │
│  │ ✓ 1. Quelles données collectons-nous?          │  │
│  │ ✓ 2. Pourquoi les collectons-nous?             │  │
│  │ ✓ 3. Avec qui partageons-nous?                 │  │
│  │ ✓ 4. Tes droits (RGPD)                         │  │
│  │ ✓ 5. Sécurité de tes données                   │  │
│  │ ✓ 6. Cookies & Tracking                        │  │
│  │ ✓ 7. Modifications                             │  │
│  │ ✓ 8. Contact & Support                         │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ SECTION 1: Quelles données collectons-nous?    │  │
│  │                                                  │  │
│  │ Données ESSENTIELLES:                           │  │
│  │ ┌─────────────────────────────────────────────┐ │  │
│  │ │ Donnée    │ Exemple    │ Raison            │ │  │
│  │ ├─────────────────────────────────────────────┤ │  │
│  │ │ Téléphone │ +228 XXX   │ Login + SMS OTP    │ │  │
│  │ │ Email     │ user@...   │ Password reset     │ │  │
│  │ │ ...       │ ...        │ ...                │ │  │
│  │ └─────────────────────────────────────────────┘ │  │
│  │                                                  │  │
│  │ Données OPTIONNELLES:                           │  │
│  │ • 📊 Google Analytics                          │  │
│  │ • 🎯 Marketing Emails                          │  │
│  │ • 🌍 Localisation (GPS)                        │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  [Sections 2-8 continuent...]                         │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ SECTION 8: Contact & Support                   │  │
│  │                                                  │  │
│  │ Questions?                                      │  │
│  │ 📧 privacy@swiftly.io                          │  │
│  │ 📍 Lomé, Togo                                  │  │
│  │ 🕐 Réponse: Sous 48h                           │  │
│  │                                                  │  │
│  │ [👈 Retour] [🔔 Paramètres Privacy]           │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
├────────────────────────────────────────────────────────┤
│ FOOTER (Liens + Copyright)                             │
└────────────────────────────────────────────────────────┘
```

### Mobile (375px)

```
┌──────────────────────┐
│ NAVBAR               │
├──────────────────────┤
│                      │
│ 🔒 Politique         │
│ Confidentialité      │
│                      │
│ Dernière mise à...   │
│ Version: 1.0 | ✅    │
│                      │
│ [📑 TABLE OF CONTENTS]
│ (Expandable menu)    │
│                      │
│ SECTION 1            │
│ Quelles données...   │
│                      │
│ [Table scrollable]   │
│                      │
│ SECTION 2            │
│ Pourquoi...          │
│                      │
│ [Sections continue]  │
│                      │
│ [👈 Back] [⚙️ Param] │
│                      │
├──────────────────────┤
│ FOOTER               │
└──────────────────────┘
```

---

## 🎨 Hero Section (En-tête)

### Titre Principal

```
Text: "🔒 Politique de Confidentialité"
Font-size: 42px (desktop) / 28px (mobile)
Font-weight: 700 (bold)
Color: #1F2937
Margin-bottom: 16px
Line-height: 1.2
```

### Métadonnées

```
Texte: "Dernière mise à jour: Août 2026
        Version: 1.0 | Status: ✅ RGPD Compliant"

Font-size: 14px
Color: #6B7280
Margin-bottom: 24px

✅ Logo/badge: Vert, indiquant la conformité
```

### Description Intro

```
Text: "Swiftly.io s'engage à protéger ta vie privée.
       Cette politique explique comment nous collectons,
       utilisons et protégeons tes données."

Font-size: 16px
Color: #4B5563
Font-weight: 400
Line-height: 1.6
Margin-bottom: 32px
```

---

## 📑 Table of Contents (Sidebar)

### Desktop (Sticky Left)

```
Position: sticky
Top: 80px (below navbar)
Width: 250px
Height: 400px
Overflow: auto
Background: #F9FAFB (très léger gris)
Border-radius: 8px
Padding: 16px
Margin-right: 32px

Titre: "Table of Contents"
├─ Font-size: 12px
├─ Font-weight: 600
├─ Color: #6B7280
├─ Text-transform: uppercase
├─ Letter-spacing: 0.5px
└─ Margin-bottom: 16px

Liens:
├─ Font-size: 14px
├─ Color: #4B5563
├─ Hover: #2563EB + underline
├─ Padding-left: 12px
├─ Border-left: 2px solid transparent
├─ Hover: border-left color #2563EB
└─ Active (section in view): 
   ├─ Font-weight: 600
   ├─ Color: #2563EB
   ├─ Border-left: 2px solid #2563EB
   └─ Background-color: #EFF6FF
```

### Mobile (Expandable)

```
Type: Collapsible menu (Accordion)
Trigger: "📑 Table of Contents" button
Animation: Slide down 0.3s

When expanded:
├─ Full-width
├─ Below hero section
├─ Same styling as desktop
└─ Toggle to close
```

---

## 📋 Content Sections

### Chaque Section a:

```
Header:
├─ Numéro + titre (h2)
├─ Font-size: 24px (desktop) / 20px (mobile)
├─ Color: #1F2937
├─ Font-weight: 600
├─ Margin-bottom: 16px
├─ Anchor link (id="section-N")
└─ Utilisé pour table of contents

Body:
├─ Paragraphes (p)
├─ Font-size: 15px
├─ Color: #4B5563
├─ Line-height: 1.7
├─ Margin-bottom: 12px

Lists/Tables:
├─ Marges cohérentes
├─ Alternating row colors (pour tables)
├─ Padding: 12px
└─ Border-radius: 4px
```

### Section Spéciale: Table de Données

```
Exemple "Quelles données collectons-nous":

┌──────────────┬──────────────┬─────────────┐
│ Donnée       │ Exemple      │ Raison      │
├──────────────┼──────────────┼─────────────┤
│ Téléphone    │ +228 98 76   │ Login+SMS   │
│ Email        │ user@...     │ Reset pwd   │
│ Transactions │ "500 XOF"    │ Historique  │
│ Comptes bank │ Orange Money │ Virements   │
└──────────────┴──────────────┴─────────────┘

Style:
├─ Border-collapse: collapse
├─ Border: 1px solid #E5E7EB
├─ Border-radius: 8px
├─ Font-size: 14px
├─ Padding (cells): 12px
├─ Header background: #F3F4F6
├─ Header font-weight: 600
├─ Body row background: white
├─ Alternate row: #F9FAFB (très léger)
├─ Hover row: #EFF6FF (bleu très clair)
└─ Color: #4B5563
```

---

## 🎯 Callout Boxes (Highlights)

### Types de Callouts:

#### 1. Info Box (Bleu)

```
Background: #EFF6FF (bleu très clair)
Border-left: 4px solid #2563EB
Padding: 16px
Border-radius: 4px
Icon: ℹ️

Text: Explications/clarifications
Color: #1E40AF (bleu foncé)
```

#### 2. Important Box (Orange)

```
Background: #FEF3C7 (orange très clair)
Border-left: 4px solid #F59E0B
Padding: 16px
Border-radius: 4px
Icon: ⚠️

Text: Points importants à noter
Color: #92400E (orange foncé)
```

#### 3. Check Box (Vert)

```
Background: #F0FDF4 (vert très clair)
Border-left: 4px solid #10B981
Padding: 16px
Border-radius: 4px
Icon: ✅

Text: Points positifs/confirmés
Color: #065F46 (vert foncé)
```

---

## 📱 Responsive Behavior

### Desktop (1024px+)

```
Layout: 2 colonnes
├─ Gauche: Table of contents (sticky, 250px)
└─ Droite: Contenu (flex-grow)

Gap: 32px
Max-width: 1400px
Padding: 32px
```

### Tablet (768px - 1024px)

```
Layout: 1 colonne
├─ Table of contents: Collapsible accordion
└─ Contenu: Full-width

Padding: 24px
Max-width: 100%
```

### Mobile (< 768px)

```
Layout: 1 colonne, full-width
├─ Table of contents: Expandable menu
├─ Contenu: 100% width
├─ Padding: 16px
└─ Font-sizes: Réduits légèrement

Tables:
├─ Scrollable horizontalement
├─ Min-width: 300px
└─ Font-size: 12px pour compact
```

---

## 🔘 Boutons d'Action

### Bouton "Paramètres Privacy" (Top-right)

```
Position: sticky top-right (ou dans le hero)
Text: "⚙️ Paramètres Privacy"
Style: Primaire (bleu)
Action: Navigue vers /privacy-settings
```

### Bouton "Retour" (Bas de page)

```
Text: "👈 Retour"
Style: Secondaire (gris)
Action: Retour à la page précédente (history.back)
```

---

## 🎨 Design System

**Couleurs:**
- Titres: #1F2937 (gris très foncé)
- Corps: #4B5563 (gris moyen)
- Secondaire: #6B7280 (gris plus clair)
- Liens: #2563EB (bleu)
- Background: white
- Subtle BG: #F9FAFB (gris très clair)

**Typographie:**
- H1 (Hero): 42px, 700
- H2 (Sections): 24px, 600
- Body: 15px, 400
- Small: 14px, 400
- Font-family: Inter, Poppins

**Spacing:**
- Sections: 32px gap
- Paragraphes: 12px margin-bottom
- Listes: 8px entre items

---

## ⚡ Interactions

### Scroll Spy (Table of Contents)

```
Au scroll:
├─ Détecter quelle section est visible
├─ Mettre en gras/couleur le lien correspondant
├─ Smooth scroll quand click sur lien
└─ Animation: scroll-behavior: smooth
```

### Hover sur lien

```
Text: Underline appear
Color: Transition to darker blue
Cursor: pointer
```

### Copy Email Button (optionnel)

```
privacy@swiftly.io
├─ Hover: Gris clair background
├─ Click: "Copié!" toast
└─ Icon: 📋 (avant), ✅ (après)
```

---

## 🔐 Accessibilité

```
✅ Headings: h1, h2, h3 (proper hierarchy)
✅ Links: aria-label explicites
✅ Tables: <caption>, <th scope>
✅ Color contrast: 4.5:1+ (WCAG AA)
✅ Keyboard nav: Tab through links
✅ Screen readers: Tous les textes accessibles
✅ Focus indicators: 2px outline
```

---

## 📋 Checklist pour Claude Design

- [ ] Hero section avec titre + métadonnées
- [ ] Table of contents sticky (desktop)
- [ ] Table of contents collapsible (mobile)
- [ ] Scroll spy actif
- [ ] 8 sections complètes + bien formatées
- [ ] Tables de données avec bon styling
- [ ] Callout boxes (info/important/check)
- [ ] Responsive: desktop, tablet, mobile
- [ ] Liens internes fonctionnels
- [ ] Bouton "Paramètres Privacy"
- [ ] Bouton "Retour"
- [ ] Typographie cohérente (headings, body)
- [ ] Spacing cohérent
- [ ] Aucune rupture de layout

---

**Status:** ✅ Prêt pour Claude Design
