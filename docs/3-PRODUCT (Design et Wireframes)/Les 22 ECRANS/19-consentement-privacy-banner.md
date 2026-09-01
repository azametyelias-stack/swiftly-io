# 🔒 SCREEN-20: CONSENT BANNER (Popup de Consentement)

**Type:** Modal/Popup overlay  
**Placement:** Fixed bottom of screen  
**Trigger:** Premier login (localStorage vide)  
**Interaction:** Sticky jusqu'à action utilisateur  

---

## 📐 Layout & Dimensions

```
DESKTOP (1920px):
┌────────────────────────────────────────────────────────┐
│                   Contenu page (flou)                   │
├────────────────────────────────────────────────────────┤
│                                                          │
│  ╔══════════════════════════════════════════════════╗   │
│  ║  🔒 Politique de Confidentialité                 ║   │
│  ║                                                  ║   │
│  ║  Nous collectons certaines données pour         ║   │
│  ║  améliorer ton expérience (email, téléphone,    ║   │
│  ║  historique). Voir la politique complète →      ║   │
│  ║                                                  ║   │
│  ║  [✅ Accepter tout]  [⚙️ Personnaliser]        ║   │
│  ╚══════════════════════════════════════════════════╝   │
└────────────────────────────────────────────────────────┘

MOBILE (375px):
┌──────────────────────────┐
│   Contenu page (flou)     │
├──────────────────────────┤
│                          │
│  ╔════════════════════╗  │
│  ║ 🔒 Politique       ║  │
│  ║ Confidentialité    ║  │
│  ║                    ║  │
│  ║ Nous collectons... ║  │
│  ║ Voir complet →     ║  │
│  ║                    ║  │
│  ║ [Accepter tout]    ║  │
│  ║ [Personnaliser]    ║  │
│  ╚════════════════════╝  │
└──────────────────────────┘
```

---

## 🎨 Styling & Couleurs

### Conteneur Principal

```css
/* Banner Container */
position: fixed;
bottom: 0;
left: 0;
right: 0;
z-index: 50;
background: white;
border-top: 1px solid #E5E7EB;
box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
padding: 16px;
animation: slideUp 0.3s ease-out;

/* Backdrop (flou du contenu) */
::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 40;
}
```

### Contenu Intérieur

```
Padding: 16px (mobile) / 24px (desktop)
Max-width: 1200px
Margin: 0 auto
```

---

## 📝 Contenu Texte

### Titre Principal

```
Texte: "🔒 Politique de Confidentialité"
Font: Inter / Poppins
Size: 16px (mobile) / 18px (desktop)
Weight: 600 (semi-bold)
Color: #1F2937 (gris très foncé)
Margin-bottom: 8px
```

### Texte Description

```
Texte: "Nous collectons certaines données pour améliorer 
        ton expérience (email, téléphone, historique des 
        transactions). Voir la politique complète →"

Font: Inter / Poppins
Size: 14px
Weight: 400 (regular)
Color: #6B7280 (gris moyen)
Line-height: 1.5
Margin-bottom: 16px

Lien "Voir la politique complète →":
├─ Color: #2563EB (bleu)
├─ Text-decoration: underline
├─ Cursor: pointer
├─ Hover: color #1D4ED8 (bleu foncé)
└─ href: /privacy
```

---

## 🔘 Boutons

### Bouton 1: "✅ Accepter tout"

```
Layout:
├─ Display: flex
├─ Align-items: center
├─ Gap: 8px
└─ Justify-content: center

Style:
├─ Background: #2563EB (bleu primaire)
├─ Color: white
├─ Padding: 10px 24px (mobile) / 12px 32px (desktop)
├─ Border-radius: 8px
├─ Font-weight: 600
├─ Font-size: 14px
├─ Border: none
├─ Cursor: pointer
├─ Box-shadow: none (normal)
└─ Transition: all 0.2s ease

Hover:
├─ Background: #1D4ED8 (bleu foncé)
├─ Box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3)
└─ Transform: translateY(-2px)

Active/Clicked:
├─ Background: #1E40AF (bleu encore plus foncé)
└─ Transform: translateY(0)

Icon:
├─ Emoji: ✅
├─ Size: 16px
├─ Margin-right: 6px
└─ Animation: pulse on hover
```

### Bouton 2: "⚙️ Personnaliser"

```
Style:
├─ Background: #F3F4F6 (gris très clair)
├─ Color: #1F2937 (gris très foncé)
├─ Padding: 10px 24px (mobile) / 12px 32px (desktop)
├─ Border-radius: 8px
├─ Font-weight: 600
├─ Font-size: 14px
├─ Border: 1px solid #D1D5DB (gris clair)
├─ Cursor: pointer
├─ Transition: all 0.2s ease
└─ Box-shadow: none

Hover:
├─ Background: #E5E7EB (gris)
├─ Border-color: #9CA3AF
└─ Transform: translateY(-2px)

Active/Clicked:
├─ Background: #D1D5DB (gris foncé)
└─ Transform: translateY(0)

Icon:
├─ Emoji: ⚙️
├─ Size: 16px
├─ Margin-right: 6px
└─ Animation: spin on hover (rotate 180deg)
```

---

## 📱 Responsive Behavior

### Desktop (1024px+)

```
┌─────────────────────────────────────────────────┐
│ 🔒 Politique de Confidentialité                 │
│ Nous collectons... Voir complet →               │
│ [✅ Accepter tout]  [⚙️ Personnaliser]         │
└─────────────────────────────────────────────────┘

Layout: Horizontal (titre + texte en haut, boutons en bas)
Boutons: Côte à côte (flex-row)
Gaps: 16px entre boutons
```

### Tablet (768px - 1024px)

```
┌──────────────────────────────┐
│ 🔒 Politique de              │
│ Confidentialité              │
│                              │
│ Nous collectons...           │
│ Voir complet →               │
│                              │
│ [✅ Accepter tout]           │
│ [⚙️ Personnaliser]           │
└──────────────────────────────┘

Layout: Vertical avec texte centré
Boutons: Empilés verticalement
Gaps: 8px entre boutons
```

### Mobile (< 768px)

```
┌──────────────────┐
│ 🔒 Politique    │
│ Confiden.       │
│                 │
│ Nous collectons│
│ Voir complet →  │
│                 │
│ [✅ Accepter]   │
│ [⚙️ Perso.]     │
└──────────────────┘

Layout: Vertical, full-width
Boutons: Full-width empilés
Font-size: Réduit légèrement
Padding: Réduit
```

---

## ⚡ Interactions & Animations

### Apparition

```css
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(100px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
```

### Disparition (après clic "Accepter")

```css
@keyframes slideDown {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(100px);
  }
}

animation: slideDown 0.3s ease-in;
```

### Hover sur lien

```css
"Voir la politique complète →"
├─ Transition: color 0.2s
├─ Underline animation: slide in from left
└─ Color change: gris → bleu
```

### Hover sur boutons

```css
Bouton primaire:
├─ Box-shadow: subtly appear
├─ Transform: translateY(-2px)
└─ Background: transition to darker

Bouton secondaire:
├─ Border: become more visible
├─ Background: transition to light gray
└─ Transform: translateY(-2px)
```

---

## 🎯 Comportement

### État 1: Initial (Premier chargement)

```
✅ Banner visible
✅ Animation slideUp
✅ Backdrop flou actif
✅ Focus sur bouton "Accepter tout"
✅ Utilisateur peut:
   ├─ Cliquer "Accepter tout"
   ├─ Cliquer "Personnaliser"
   └─ Cliquer le lien "Voir complet"
```

### État 2: Hover sur "Accepter tout"

```
✅ Bouton s'élève légèrement
✅ Ombre devient plus visible
✅ Background bleu devient plus foncé
✅ Cursor: pointer
```

### État 3: Click "Accepter tout"

```
✅ Animation "click" (brief scale)
✅ localStorage['privacy_consent'] = {..., analytics: true}
✅ POST /api/privacy/consent
✅ Toast de confirmation?
✅ Animation slideDown
✅ Banner disparaît après 0.3s
✅ Backdrop disparaît
```

### État 4: Click "Personnaliser"

```
✅ Animation fade transition
✅ Navigue vers /privacy-settings
✅ localStorage reste inchangé
```

### État 5: Click lien "Voir complet"

```
✅ Ouvre /privacy dans la même fenêtre
✅ Banner reste visible (sticky)
✅ Utilisateur peut toujours "Accepter" depuis /privacy
```

---

## 🔐 Accessibilité (A11y)

```
✅ ARIA labels:
   ├─ aria-label="Accepter la politique de confidentialité"
   ├─ aria-label="Personnaliser les paramètres de cookies"
   └─ role="alertdialog"

✅ Keyboard navigation:
   ├─ Tab: cycle entre boutons
   ├─ Enter: click bouton
   └─ Escape: maybe close (optionnel)

✅ Focus indicators:
   ├─ Outline: 2px solid #2563EB
   ├─ Outline-offset: 2px
   └─ Visible pour tous les boutons

✅ Color contrast:
   ├─ Texte bleu sur blanc: ✅ (4.5:1)
   ├─ Texte gris sur blanc: ✅ (5.5:1)
   └─ Tous les textes WCAG AA compliant

✅ Screen readers:
   ├─ Annoncer: "Politique de confidentialité"
   ├─ Lire le texte complet
   └─ Annoncer les boutons
```

---

## 🎨 Design System Reference

**Couleurs:**
- Primaire: `#2563EB` (bleu)
- Texte principal: `#1F2937` (gris très foncé)
- Texte secondaire: `#6B7280` (gris moyen)
- Border/Divider: `#E5E7EB` (gris très clair)
- Background alt: `#F3F4F6` (gris clair)

**Typographie:**
- Font family: Inter, Poppins, sans-serif
- Sizes: 14px (body), 16px (title)
- Weight: 400 (regular), 600 (semi-bold)

**Spacing:**
- 8px, 16px, 24px, 32px (multiples de 8)

**Border-radius:**
- 8px (buttons, cards)

**Shadows:**
- Subtle: `0 1px 3px rgba(0,0,0,0.1)`
- Medium: `0 4px 12px rgba(0,0,0,0.1)`

---

## 📋 Checklist pour Claude Code

- [ ] Component `ConsentBanner.tsx` créé
- [ ] localStorage read/write fonctionnel
- [ ] POST /api/privacy/consent fonctionne
- [ ] Animation slideUp/slideDown smooth
- [ ] Responsive: desktop, tablet, mobile
- [ ] Boutons hover/active states
- [ ] Focus indicators visibles
- [ ] ARIA labels présents
- [ ] Lien /privacy fonctionne
- [ ] Bouton "Personnaliser" → /privacy-settings
- [ ] Toast après acceptation (optionnel)
- [ ] Backdrop overlay couvre tout
- [ ] z-index correct (50 pour banner, 40 pour backdrop)

---

**Status:** ✅ Prêt pour Claude Code
