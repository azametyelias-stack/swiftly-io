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
