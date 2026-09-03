/**
 * English message dictionary. Typed `Messages` (= `typeof fr`) so `tsc` fails if
 * a key is missing or spelled differently. EN is a SCREEN-22 setting; these are
 * first-pass translations, refine when EN actually ships.
 */

import type { Messages } from "./index";

export const en: Messages = {
  common: {
    confirm: "Confirm",
    back: "Back",
    loading: "Loading…",
    retry: "Try again",
    menu: "Open the menu",
    notifications: "Alerts and notifications",
  },

  dashboard: {
    greeting: "Hello, {name}",
    balanceLabel: "Total balance",
    showAmount: "Show amount",
    hideAmount: "Hide amount",
    variationVs: "vs {period}",
    variationUnavailable: "Change unavailable",
    newTransaction: "New transaction",
    summary: {
      start: "Start",
      income: "Income",
      expenses: "Expenses",
      current: "Current",
    },
    curve: {
      emptyTitle: "The curve starts at your first transaction",
      emptyBody: "Record money in or out and the chart draws from there.",
      offline: "Chart unavailable offline",
    },
    banner: {
      emptyTitle: "Set a goal",
      emptyBody: "The banner will show your progress here.",
    },
    templates: {
      title: "Templates",
      seeAll: "See all",
      create: "Create a template",
      emptyBody: "A template saves an amount and category you use often.",
    },
    accounts: {
      title: "Accounts and cards",
      add: "Add an account",
    },
    history: {
      title: "Recent history",
      seeMore: "See more",
      empty: "No transactions yet.",
      forNote: "for {note}",
      linkedTo: "linked to {name}",
      kindExpense: "Expense",
      kindIncome: "Income",
      kindTransfer: "Transfer",
    },
    error: {
      title: "Data not refreshed",
      staleAt: "Last updated at {time}.",
      balanceAt: "Total balance · {time}",
    },
    emptyState: {
      title: "No data for today",
      body: "The curve starts at your first transaction.",
    },
  },

  landing: {
    logo: "Swiftly.io",
    titleLine1: "TAKE CONTROL",
    titleLine2: "FINANCIALLY",
    tagline: "Track your finances, from chaos to clarity",
    start: "Get started",
  },

  auth: {
    title: "Sign in",

    code: {
      heading: "Enter your invitation code",
      help: "Six digits, sent to you by your account manager.",
      helpVerifying: "Checking the code…",
      helpValidated: "Code verified.",
      digitLabel: "Digit {index} of 6",
      submit: "Confirm",
      submitting: "Checking",
      noCode: "I don't have a code",
      errorInvalid: "Invalid code. Check it and try again.",
      errorServer: "Server error. Try again.",
      confirmed: "Confirmed",
    },

    name: {
      heading: "What's your name?",
      help: "This name shows at the top of your dashboard.",
      helpCreating: "Creating your profile…",
      label: "Name",
      placeholder: "e.g. Elias",
      submit: "Confirm",
      submitting: "Saving",
      errorRequired: "Name required. Please enter your name.",
      errorServer: "Something went wrong. Try again.",
      saved: "Profile saved",
      welcome: "Welcome, {name}",
      welcomeHelp: "Your space is ready.",
    },
  },
};
