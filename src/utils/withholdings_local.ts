/**
 * This file contains local (city/county) withholding tax data.
 * Two types:
 *   - flat: a flat rate applied to annual taxable income
 *   - bracket: per-paycheck bracket tables (like federal/NYC withholding)
 *
 * To add a new locality: add an entry to LOCAL_TAXES and it will
 * automatically appear in the UI when the matching state is selected.
 * Source: https://taxfoundation.org/research/all/state/local-income-taxes-2023/
 */
import { PAY_SCHEDULE } from "./constants";

interface LocalTaxBase {
  name: string;
  stateAbbreviation: string;
  tooltip?: string;
}

interface LocalTaxFlat extends LocalTaxBase {
  type: "flat";
  rate: number; // applied to annual taxable income
}

interface LocalTaxBrackets extends LocalTaxBase {
  type: "bracket";
  biweekly: number[][];
  semimonthly: number[][];
  monthly: number[][];
}

export type LocalTax = LocalTaxFlat | LocalTaxBrackets;

// Map of local tax key → LocalTax data
// Keys are used as stable identifiers in paycheck state
export const LOCAL_TAXES: Record<string, LocalTax> = {
  // New York City — Table II, 2026
  // Source: https://www.tax.ny.gov/pdf/publications/withholding/nys50_t_nyc.pdf
  // Same table for single and married. Format: [min, max, cumulative, rate] per paycheck.
  NYC: {
    name: "New York City",
    stateAbbreviation: "NY",
    type: "bracket",
    tooltip:
      "NYC residents pay an additional local income tax. Uses official NYC withholding tables (Table II, 2026).",
    biweekly: [
      [0, 308, 0, 0.0205],
      [308, 334, 6.31, 0.028],
      [334, 577, 7.08, 0.0325],
      [577, 962, 14.92, 0.0395],
      [962, 2308, 30.12, 0.0415],
      [2308, Infinity, 86.0, 0.0425],
    ],
    semimonthly: [
      [0, 333, 0, 0.0205],
      [333, 362, 6.83, 0.028],
      [362, 625, 7.67, 0.0325],
      [625, 1042, 16.17, 0.0395],
      [1042, 2500, 32.63, 0.0415],
      [2500, Infinity, 93.17, 0.0425],
    ],
    monthly: [
      [0, 667, 0, 0.0205],
      [667, 725, 13.67, 0.028],
      [725, 1250, 15.33, 0.0325],
      [1250, 2083, 32.33, 0.0395],
      [2083, 5000, 65.25, 0.0415],
      [5000, Infinity, 186.33, 0.0425],
    ],
  },

  // Indianapolis / Marion County, Indiana — 2026
  INDIANAPOLIS: {
    name: "Indianapolis",
    stateAbbreviation: "IN",
    type: "flat",
    rate: 0.03,
    tooltip: "Marion County / Indianapolis local income tax (3%, 2026).",
  },

  // Detroit, Michigan — 2026
  DETROIT: {
    name: "Detroit",
    stateAbbreviation: "MI",
    type: "flat",
    rate: 0.024,
    tooltip:
      "Detroit city income tax (2.4% for residents, 1.2% for non-residents, 2026). Uses resident rate.",
  },

  // St. Louis, Missouri — 2026
  STL_KC: {
    name: "St. Louis/Kansas City",
    stateAbbreviation: "MO",
    type: "flat",
    rate: 0.01,
    tooltip: "St. Louis city income tax (1%, 2026).",
  },

  NEWARK: {
    name: "Newark",
    stateAbbreviation: "NJ",
    type: "flat",
    rate: 0.01,
    tooltip: "Newark city income tax (1%, 2026).",
  },

  CINCINNATI: {
    name: "Cincinnati",
    stateAbbreviation: "OH",
    type: "flat",
    rate: 0.018,
    tooltip: "Cincinnati city income tax (1.8%, 2026).",
  },

  COLUMBUS: {
    name: "Columbus",
    stateAbbreviation: "OH",
    type: "flat",
    rate: 0.025,
    tooltip: "Columbus city income tax (2.5%, 2026).",
  },

  PORTLAND: {
    name: "Portland",
    stateAbbreviation: "OR",
    type: "flat",
    rate: 0.04,
    tooltip:
      "Portland city income tax is net 4% (1% regional and 3% county, 2026).",
  },

  PHILADELPHIA: {
    name: "Philadelphia",
    stateAbbreviation: "PA",
    type: "flat",
    rate: 0.0374,
    tooltip:
      "Philadelphia city income tax (3.74% for residents, 3.43% for non-residents, 2025). Uses resident rate.",
  },
};

// Lookup: state abbreviation → ordered list of local tax keys
// Built automatically from LOCAL_TAXES so no manual sync needed
export const LOCAL_TAXES_BY_STATE: Record<string, string[]> = Object.entries(
  LOCAL_TAXES,
).reduce(
  (acc, [key, tax]) => {
    if (!acc[tax.stateAbbreviation]) acc[tax.stateAbbreviation] = [];
    acc[tax.stateAbbreviation].push(key);
    return acc;
  },
  {} as Record<string, string[]>,
);

function getBrackets(
  tax: LocalTaxBrackets,
  payPeriod: PAY_SCHEDULE,
): number[][] {
  switch (payPeriod) {
    case PAY_SCHEDULE.SEMIMONTHLY:
      return tax.semimonthly;
    case PAY_SCHEDULE.MONTHLY:
      return tax.monthly;
    default:
      return tax.biweekly;
  }
}

/**
 * Returns per-paycheck and annual withholding for a local tax.
 * Flat taxes use annual taxable income; bracket taxes use per-paycheck taxable wage.
 */
export const getLocalWithholding = (
  key: string,
  taxableWagePerPaycheck: number,
  taxableAnnualIncome: number,
  payPeriod: PAY_SCHEDULE,
  periodsPerYear: number,
): { paycheck: number; annual: number } => {
  const tax = LOCAL_TAXES[key];
  if (!tax) return { paycheck: 0, annual: 0 };

  if (tax.type === "flat") {
    const annual = taxableAnnualIncome * tax.rate;
    return { paycheck: annual / periodsPerYear, annual };
  }

  const brackets = getBrackets(tax, payPeriod);
  let row = 0;
  while (
    row < brackets.length - 1 &&
    brackets[row][1] < taxableWagePerPaycheck
  ) {
    row += 1;
  }
  const paycheck =
    brackets[row][2] +
    (taxableWagePerPaycheck - brackets[row][0]) * brackets[row][3];
  return { paycheck, annual: paycheck * periodsPerYear };
};

/**
 * Returns the marginal rate for a local tax at the given per-paycheck wage.
 * Flat taxes always return their flat rate.
 */
export const getLocalMarginalRate = (
  key: string,
  taxableWagePerPaycheck: number,
  payPeriod: PAY_SCHEDULE,
): number => {
  const tax = LOCAL_TAXES[key];
  if (!tax) return 0;
  if (tax.type === "flat") return tax.rate;

  const brackets = getBrackets(tax, payPeriod);
  let row = 0;
  while (
    row < brackets.length - 1 &&
    brackets[row][1] < taxableWagePerPaycheck
  ) {
    row += 1;
  }
  return brackets[row][3];
};
