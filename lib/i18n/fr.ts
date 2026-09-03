/**
 * French message dictionary (default locale). Text is taken verbatim from the
 * screen docs (`Les 22 ECRANS/01..03`) and the Lot 1 visual
 * (`DESIGN-HANDOFF/design/Swiftly - Lot 1 Onboarding.dc.html`).
 *
 * The Landing description keeps the wording resolved by the design pass
 * ("du chaos à la clarté" — the "chao" typo in the screen doc was corrected).
 */

export const fr = {
  common: {
    confirm: "Confirmer",
    back: "Retour",
    loading: "Chargement…",
    retry: "Réessayer",
    menu: "Ouvrir le menu",
    notifications: "Alertes et notifications",
  },

  dashboard: {
    greeting: "Bonjour, {name}",
    balanceLabel: "Solde total",
    showAmount: "Afficher le montant",
    hideAmount: "Masquer le montant",
    variationVs: "vs {period}",
    variationUnavailable: "Variation indisponible",
    newTransaction: "Nouvelle transaction",
    summary: {
      start: "Début",
      income: "Revenus",
      expenses: "Dépenses",
      current: "Actuel",
    },
    curve: {
      emptyTitle: "La courbe démarre à votre première transaction",
      emptyBody: "Enregistrez une entrée ou une sortie, le graphique se trace ensuite.",
      offline: "Graphique indisponible hors connexion",
    },
    banner: {
      emptyTitle: "Fixez un objectif",
      emptyBody: "Le bandeau affichera votre progression ici.",
    },
    templates: {
      title: "Templates",
      seeAll: "Voir tout",
      create: "Créer un template",
      emptyBody:
        "Un template enregistre un montant et une catégorie que vous répétez souvent.",
    },
    accounts: {
      title: "Comptes et cartes",
      add: "Ajouter un compte",
    },
    history: {
      title: "Historique récent",
      seeMore: "Voir plus",
      empty: "Aucune transaction pour l'instant.",
      forNote: "pour {note}",
      linkedTo: "lié à {name}",
      kindExpense: "Dépense",
      kindIncome: "Revenu",
      kindTransfer: "Transfert",
    },
    error: {
      title: "Données non actualisées",
      staleAt: "Dernière mise à jour à {time}.",
      balanceAt: "Solde total · {time}",
    },
    emptyState: {
      title: "Aucune donnée pour aujourd'hui",
      body: "La courbe démarre à votre première transaction.",
    },
  },

  landing: {
    logo: "Swiftly.io",
    titleLine1: "PRENDRE CONTROLE",
    titleLine2: "FINANCIEREMENT",
    tagline: "Tracker vos finances, du chaos à la clarté",
    start: "Démarrer",
  },

  auth: {
    title: "Connexion",

    code: {
      heading: "Saisissez le code d'invitation",
      help: "Six chiffres, transmis par votre gestionnaire de compte.",
      helpVerifying: "Vérification du code…",
      helpValidated: "Code validé.",
      digitLabel: "Chiffre {index} sur 6",
      submit: "Confirmer",
      submitting: "Vérification",
      noCode: "Je n'ai pas de code",
      errorInvalid: "Code invalide. Vérifiez et réessayez.",
      errorServer: "Erreur serveur. Réessayez.",
      confirmed: "Confirmé",
    },

    name: {
      heading: "Comment vous appelez-vous ?",
      help: "Ce nom apparaîtra en haut de votre tableau de bord.",
      helpCreating: "Création de votre profil…",
      label: "Nom",
      placeholder: "ex: Elias",
      submit: "Confirmer",
      submitting: "Confirmation",
      errorRequired: "Nom requis. Veuillez entrer votre nom.",
      errorServer: "Une erreur est survenue. Réessayez.",
      saved: "Profil enregistré",
      welcome: "Bienvenue, {name}",
      welcomeHelp: "Votre espace est prêt.",
    },
  },
};
