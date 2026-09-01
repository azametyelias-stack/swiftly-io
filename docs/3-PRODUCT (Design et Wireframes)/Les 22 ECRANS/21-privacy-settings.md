# ⚙️ SCREEN-22: PRIVACY SETTINGS PAGE (/privacy-settings)

**Type:** Settings page  
**URL:** `/privacy-settings`  
**Accessible from:** Consent banner "Personnaliser", Footer link  
**Template:** Settings layout  

---

## 📐 Layout & Structure

### Desktop (1920px)

```
┌────────────────────────────────────────────────────────┐
│ NAVBAR (Logo + Back button)                            │
├────────────────────────────────────────────────────────┤
│                                                         │
│                    MAX-WIDTH 800px                     │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ ⚙️ Paramètres de Confidentialité               │  │
│  │                                                  │  │
│  │ Personnalise ton expérience en gérant quelles   │  │
│  │ données tu acceptes de partager avec nous.      │  │
│  │                                                  │  │
│  │ [Lien vers /privacy complète]                  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ ✅ ESSENTIAL COOKIES (REQUIS)                   │  │
│  │                                                  │  │
│  │ [Disabled Toggle ON]                            │  │
│  │                                                  │  │
│  │ Description:                                    │  │
│  │ Requis pour le fonctionnement de l'app          │  │
│  │ (session, sécurité, authentification)          │  │
│  │                                                  │  │
│  │ Cookies:                                        │  │
│  │ • access_token (15 min)                         │  │
│  │ • refresh_token (30 jours)                      │  │
│  │ • session_id (session)                          │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 📊 GOOGLE ANALYTICS (OPTIONNEL)                 │  │
│  │                                                  │  │
│  │ [Toggle OFF]                                    │  │
│  │                                                  │  │
│  │ Description:                                    │  │
│  │ Nous aide à comprendre comment tu utilises     │  │
│  │ l'app. Pages visitées, clics, temps passé.     │  │
│  │                                                  │  │
│  │ Collecteur: Google                              │  │
│  │ Durée: 12 mois                                  │  │
│  │ Impact: Sans cela, stats anonymes uniquement   │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 🎯 MARKETING EMAILS (OPTIONNEL)                 │  │
│  │                                                  │  │
│  │ [Toggle OFF]                                    │  │
│  │                                                  │  │
│  │ Description:                                    │  │
│  │ Newsletters, promotions, nouvelles features.   │  │
│  │                                                  │  │
│  │ Fréquence: 1-2x par semaine                    │  │
│  │ Unsubscribe: Simple, en 1 clic                  │  │
│  │ Impact: Plus de mails, mais tu restes informé  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 🌍 LOCALISATION / GPS (OPTIONNEL, FUTURE)       │  │
│  │                                                  │  │
│  │ [Toggle OFF] [Disabled - Coming Soon]          │  │
│  │                                                  │  │
│  │ Description:                                    │  │
│  │ Pour services géolocalisés (quand disponible). │  │
│  │                                                  │  │
│  │ État: Bientôt disponible                        │  │
│  │ Impact: Améliorer les recommandations locales  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │ [✅ Paramètres sauvegardés!]                    │  │
│  │                                                  │  │
│  │ [👈 Retour]    [Voir Politique Complète →]     │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
├────────────────────────────────────────────────────────┤
│ FOOTER                                                  │
└────────────────────────────────────────────────────────┘
```

### Mobile (375px)

```
┌──────────────────────┐
│ NAVBAR               │
├──────────────────────┤
│                      │
│ ⚙️ Paramètres       │
│ Confidentialité      │
│                      │
│ Personnalise ton...  │
│                      │
│ ┌──────────────────┐ │
│ │ ✅ ESSENTIAL     │ │
│ │                  │ │
│ │ [Toggle: ON]     │ │
│ │ Disabled         │ │
│ │                  │ │
│ │ Requis pour...   │ │
│ │                  │ │
│ │ Cookies:         │ │
│ │ • access_token   │ │
│ │ • refresh_token  │ │
│ └──────────────────┘ │
│                      │
│ ┌──────────────────┐ │
│ │ 📊 ANALYTICS     │ │
│ │                  │ │
│ │ [Toggle: OFF]    │ │
│ │                  │ │
│ │ Nous aide à...   │ │
│ │                  │ │
│ │ Google | 12 mois │ │
│ └──────────────────┘ │
│                      │
│ ┌──────────────────┐ │
│ │ 🎯 MARKETING     │ │
│ │                  │ │
│ │ [Toggle: OFF]    │ │
│ │                  │ │
│ │ Newsletters,     │ │
│ │ promo...         │ │
│ │                  │ │
│ │ 1-2x/sem         │ │
│ └──────────────────┘ │
│                      │
│ ┌──────────────────┐ │
│ │ 🌍 LOCATION      │ │
│ │                  │ │
│ │ [Toggle: OFF]    │ │
│ │ Disabled/Soon    │ │
│ │                  │ │
│ │ Bientôt...       │ │
│ └──────────────────┘ │
│                      │
│ [✅ Sauvegardé!]    │
│                      │
│ [👈 Back]           │
│ [🔗 Voir complet]   │
│                      │
├──────────────────────┤
│ FOOTER               │
└──────────────────────┘
```

---

## 🎨 Hero Section

### Titre

```
Text: "⚙️ Paramètres de Confidentialité"
Font-size: 36px (desktop) / 24px (mobile)
Font-weight: 700 (bold)
Color: #1F2937
Margin-bottom: 16px
```

### Description

```
Text: "Personnalise ton expérience en gérant quelles données
       tu acceptes de partager avec nous."

Font-size: 16px
Color: #6B7280
Font-weight: 400
Line-height: 1.6
Margin-bottom: 16px
```

### Lien Important

```
Text: "Voir la politique de confidentialité complète →"
Font-size: 14px
Color: #2563EB
Text-decoration: underline
Hover: color #1D4ED8
Cursor: pointer
Href: /privacy
```

---

## 🔘 Cookie Cards (Conteneurs)

### Structure de base pour chaque carte

```
┌─────────────────────────────────────────┐
│ [Icon] TITRE DU COOKIE                  │
│ [Toggle]                                │
│                                          │
│ Description courte expliquant le but   │
│ de ce type de cookie.                  │
│                                          │
│ Détails supplémentaires:               │
│ • Collecteur: Nom                       │
│ • Durée: Combien de temps               │
│ • Impact: Conséquences                  │
└─────────────────────────────────────────┘

Styling:
├─ Background: white
├─ Border: 1px solid #E5E7EB
├─ Border-radius: 12px
├─ Padding: 20px
├─ Margin-bottom: 16px
├─ Transition: all 0.2s ease
└─ Hover: border-color #2563EB, box-shadow subtle
```

---

## 🎛️ Toggle Switch Design

### States

#### OFF (Default pour optionnels)

```
Position: Relative
Width: 48px
Height: 28px
Background: #E5E7EB (gris)
Border-radius: 14px (full)
Cursor: pointer
Transition: all 0.3s ease

Circle indicator:
├─ Position: absolute (left: 2px)
├─ Width: 24px
├─ Height: 24px
├─ Background: white
├─ Border-radius: 50%
├─ Box-shadow: 0 2px 4px rgba(0,0,0,0.1)
└─ Transition: 0.3s ease
```

#### ON (Essential cookies)

```
Background: #10B981 (vert)
Border-radius: 14px

Circle indicator:
├─ Position: absolute (right: 2px)
├─ Width: 24px
├─ Height: 24px
├─ Background: white
└─ Box-shadow: 0 2px 4px rgba(16,185,129,0.3)
```

#### HOVER (Quand toggleable)

```
Cursor: pointer
Background: #D1D5DB (gris plus foncé)
Box-shadow: 0 2px 8px rgba(0,0,0,0.1)
Transform: scale(1.02)
```

#### DISABLED (Essential cookies)

```
Cursor: not-allowed
Opacity: 0.6
Background: #D1D5DB (gris, pas changeable)
Pointer-events: none

Badge "REQUIS":
├─ Position: absolute (top-right)
├─ Background: #2563EB
├─ Color: white
├─ Padding: 4px 12px
├─ Border-radius: 20px
├─ Font-size: 12px
├─ Font-weight: 600
└─ Text: "REQUIS"
```

#### COMING SOON (Location - future)

```
Opacity: 0.5
Cursor: not-allowed
Background: #F3F4F6 (gris clair)
Pointer-events: none

Badge "COMING SOON":
├─ Position: absolute (top-right)
├─ Background: #F59E0B (orange)
├─ Color: white
├─ Padding: 4px 12px
├─ Border-radius: 20px
├─ Font-size: 12px
├─ Font-weight: 600
└─ Text: "Bientôt"
```

---

## 📋 Contenu de Chaque Carte

### CARTE 1: Essential Cookies

```
Icon: ✅ (vert)
Title: "ESSENTIAL COOKIES (REQUIS)"
Toggle: [ON] [DISABLED]

Description:
"Requis pour le fonctionnement de l'app
(session, sécurité, authentification)"

Details:
• Collecteur: Swiftly.io (local)
• Durée: 15 min - 30 jours
• Impact: OBLIGATOIRE pour utiliser l'app

Color scheme:
├─ Icon: green (#10B981)
├─ Title: dark gray (#1F2937)
├─ Description: gray (#4B5563)
└─ Details: light gray (#6B7280)
```

### CARTE 2: Google Analytics

```
Icon: 📊 (bleu)
Title: "GOOGLE ANALYTICS (OPTIONNEL)"
Toggle: [OFF] [TOGGLEABLE]

Description:
"Nous aide à comprendre comment tu utilises
l'app. Pages visitées, clics, temps passé."

Details:
• Collecteur: Google
• Durée: 12 mois
• Impact: Améliore UX, mais moins de privacy

Color scheme:
├─ Icon: blue (#2563EB)
├─ Title: dark gray (#1F2937)
├─ Description: gray (#4B5563)
└─ Details: light gray (#6B7280)
```

### CARTE 3: Marketing Emails

```
Icon: 🎯 (orange)
Title: "MARKETING EMAILS (OPTIONNEL)"
Toggle: [OFF] [TOGGLEABLE]

Description:
"Newsletters, promotions, nouvelles features.
Fréquence modérée: 1-2x par semaine"

Details:
• Collecteur: SendGrid
• Durée: Tant que tu acceptes
• Unsubscribe: Simple, en 1 clic
• Impact: Rester informé des updates

Color scheme:
├─ Icon: orange (#F59E0B)
├─ Title: dark gray (#1F2937)
├─ Description: gray (#4B5563)
└─ Details: light gray (#6B7280)
```

### CARTE 4: Location / GPS

```
Icon: 🌍 (teal)
Title: "LOCALISATION / GPS (OPTIONNEL, FUTURE)"
Toggle: [OFF] [DISABLED]

Description:
"Pour services géolocalisés quand disponible.
Améliorer les recommandations locales."

Details:
• État: Bientôt disponible
• Collecteur: [TBD]
• Durée: [À confirmer]
• Impact: Services personnalisés par zone

Badge: "Bientôt" (orange)

Color scheme:
├─ Icon: teal (#14B8A6)
├─ Title: dark gray (#1F2937)
├─ Description: gray (#4B5563)
└─ Details: light gray (#6B7280)
└─ Opacity: 0.5 (disabled)
```

---

## ✅ Toast de Confirmation

### Quand toggle change

```
Text: "✅ Paramètres sauvegardés!"
Duration: 3 secondes

Position: Bottom-center (desktop) / Top-center (mobile)
Background: #10B981 (vert)
Color: white
Padding: 16px 24px
Border-radius: 8px
Box-shadow: 0 4px 12px rgba(16,185,129,0.3)
Font-size: 14px
Font-weight: 500

Animation IN:
├─ Duration: 0.3s
├─ From: opacity 0, translateY(20px)
└─ To: opacity 1, translateY(0)

Animation OUT:
├─ Duration: 0.3s (après 3s)
├─ From: opacity 1
└─ To: opacity 0
```

---

## 🔘 Boutons d'Action

### Bouton "Retour"

```
Text: "👈 Retour"
Style: Secondaire (gris)
Position: Bottom-left
Action: history.back() ou /dashboard

Background: #F3F4F6
Color: #1F2937
Border: 1px solid #D1D5DB
Padding: 10px 24px
Border-radius: 8px
Hover: background #E5E7EB
```

### Lien "Voir Politique Complète"

```
Text: "Voir Politique Complète →"
Position: Bottom-right
Action: href="/privacy"

Color: #2563EB
Text-decoration: underline
Font-size: 14px
Hover: color #1D4ED8
```

---

## 📱 Responsive Behavior

### Desktop (1024px+)

```
Max-width: 800px
Cards: 1 colonne
Padding: 32px
Gap: 16px entre cartes

Boutons: Côte à côte (flex-row)
Toggle: Position right dans la carte
```

### Tablet (768px - 1024px)

```
Max-width: 100%
Cards: 1 colonne
Padding: 24px
Gap: 16px entre cartes

Boutons: Empilés (flex-column)
```

### Mobile (< 768px)

```
Max-width: 100%
Cards: 1 colonne, full-width
Padding: 16px
Gap: 12px entre cartes

Cards: Padding réduit (16px)
Font-size: Légèrement réduit
Toggle: Légèrement plus grand (touch-friendly)

Boutons: Full-width, empilés
```

---

## ⚡ Interactions & Animations

### Toggle Change

```
Click toggle:
├─ Background change (gris → vert ou inverse)
├─ Circle slide (left → right ou inverse)
├─ Duration: 0.3s ease-in-out
├─ POST /api/privacy/update-consent
└─ Toast "Paramètres sauvegardés!"

Disabled toggles:
├─ Cursor: not-allowed
├─ No animation
└─ No POST request
```

### Hover sur Carte

```
Background: Subtle change
Border: Become more visible (#2563EB)
Box-shadow: 0 4px 12px rgba(0,0,0,0.08)
Transform: translateY(-2px)
Transition: 0.2s ease
```

### Focus State

```
Toggles:
├─ Outline: 2px solid #2563EB
├─ Outline-offset: 2px
└─ Visible quand tab focus

Liens:
├─ Text-decoration: underline
└─ Outline: 2px solid #2563EB
```

---

## 🔐 Accessibilité

```
✅ Form semantics:
   ├─ Utiliser <label> pour toggles
   ├─ Lier label à input (for/id)
   └─ ARIA labels descriptives

✅ Screen readers:
   ├─ "Essential Cookies Toggle, 15 minutes to 30 days"
   ├─ "Analytics Toggle, currently OFF"
   └─ "Saved confirmation, 3 seconds"

✅ Keyboard nav:
   ├─ Tab: cycle entre toggles
   ├─ Space/Enter: toggle
   └─ Focus visible sur tous les éléments

✅ Color contrast:
   ├─ Texte sur fond: 4.5:1+
   ├─ Icons: visible et discernible
   └─ WCAG AA compliant

✅ Touch targets:
   ├─ Toggles: min 44x44px (mobile)
   ├─ Buttons: min 44x44px
   └─ Links: suffisamment espacés
```

---

## 🎨 Design System Reference

**Couleurs:**
- Vert (Essential): #10B981
- Bleu (Analytics): #2563EB
- Orange (Marketing): #F59E0B
- Teal (Location): #14B8A6
- Gris backgrounds: #F3F4F6, #F9FAFB
- Text dark: #1F2937
- Text medium: #4B5563
- Text light: #6B7280

**Typographie:**
- H1: 36px, 700
- H2: 24px, 600
- Body: 15px, 400
- Small: 12px, 400
- Font-family: Inter, Poppins

**Spacing:**
- Cards gap: 16px
- Card padding: 20px
- Buttons gap: 12px
- Section margin: 32px

**Border-radius:**
- Cards: 12px
- Toggles: 14px
- Buttons: 8px
- Details: 20px (badges)

---

## 📋 Checklist pour Claude Design

- [ ] Hero section complet (titre + description)
- [ ] 4 cartes de cookies créées
- [ ] Toggles avec tous les states (ON, OFF, DISABLED, COMING SOON)
- [ ] Toast de confirmation stylisé
- [ ] Boutons "Retour" et "Voir complet"
- [ ] Responsive: desktop, tablet, mobile
- [ ] Icons/emojis cohérents
- [ ] Couleurs selon brand
- [ ] Spacing cohérent
- [ ] Focus indicators visibles
- [ ] ARIA labels présents
- [ ] Animations smooth
- [ ] Text contrast ✅ WCAA AA

---

**Status:** ✅ Prêt pour Claude Design
