/**
 * Federal Withholding Source: https://www.irs.gov/publications/p15t Manual Payroll Systems W4 after 2020
 * Federal Withholding Source PDF: https://www.irs.gov/pub/irs-dft/p15t--dft.pdf
 * W4 Reference for math checks: https://www.irs.gov/pub/irs-pdf/fw4.pdf
 * FICA and Medicare Tax Source: https://www.nerdwallet.com/article/taxes/fica-tax-withholding
 * Additional Medicare Tax Source https://www.irs.gov/taxtopics/tc560
 * This file contains Federal, FICA (Social Security), and Medicare withholding
 * We also assume only Biweekly, Semimonthly, and Monthly pay periods for Married or Single tax classes
 */
import { PAY_SCHEDULE, TAX_CLASSES } from "./constants";

interface Withholding {
  [key: string]: number[][];
}

export const PAYROLL_LAST_UPDATED = 2026; // used for frontend display

// Withholding will be in the format [min wage, max wage, cumulative withholding from above rows, withholding rate]
const BIWEEKLY_WITHHOLDING: Withholding = {
  [TAX_CLASSES.MARRIED_FILING_JOINTLY]: [
    [0, 1238, 0, 0.0],
    [1238, 2192, 0, 0.1],
    [2192, 5115, 95.4, 0.12],
    [5115, 9369, 446.16, 0.22],
    [9369, 16760, 1382.04, 0.24],
    [16760, 20948, 3155.88, 0.32],
    [20948, 30804, 4496.04, 0.35],
    [30804, Infinity, 7945.64, 0.37],
  ],
  [TAX_CLASSES.SINGLE]: [
    [0, 619, 0, 0.0],
    [619, 1096, 0, 0.1],
    [1096, 2558, 47.7, 0.12],
    [2558, 4685, 223.14, 0.22],
    [4685, 8380, 691.08, 0.24],
    [8380, 10474, 1577.88, 0.32],
    [10474, 25258, 2247.96, 0.35],
    [25258, Infinity, 7422.36, 0.37],
  ],
};

const SEMIMONTHLY_WITHHOLDING: Withholding = {
  [TAX_CLASSES.MARRIED_FILING_JOINTLY]: [
    [0, 1342, 0, 0.0],
    [1342, 2375, 0, 0.1],
    [2375, 5542, 103.3, 0.12],
    [5542, 10150, 483.34, 0.22],
    [10150, 18156, 1497.1, 0.24],
    [18156, 22694, 3418.54, 0.32],
    [22694, 33731, 4870.7, 0.35],
    [33731, Infinity, 8607.65, 0.37],
  ],
  [TAX_CLASSES.SINGLE]: [
    [0, 671, 0, 0.0],
    [671, 1188, 0, 0.1],
    [1188, 2771, 51.7, 0.12],
    [2771, 5075, 241.66, 0.22],
    [5075, 9078, 748.54, 0.24],
    [9078, 11347, 1709.26, 0.32],
    [11347, 27363, 2435.34, 0.35],
    [27363, Infinity, 8040.94, 0.37],
  ],
};

const MONTHLY_WITHHOLDING: Withholding = {
  [TAX_CLASSES.MARRIED_FILING_JOINTLY]: [
    [0, 2683, 0, 0.0],
    [2683, 4750, 0, 0.1],
    [4750, 11083, 206.7, 0.12],
    [11083, 20300, 966.66, 0.22],
    [20300, 36313, 2994.4, 0.24],
    [36313, 45388, 6837.52, 0.32],
    [45388, 66742, 9741.52, 0.35],
    [66742, Infinity, 17215.42, 0.37],
  ],
  [TAX_CLASSES.SINGLE]: [
    [0, 1342, 0, 0.0],
    [1342, 2375, 0, 0.1],
    [2375, 5542, 103.3, 0.12],
    [5542, 10150, 483.34, 0.22],
    [10150, 18156, 1497.1, 0.24],
    [18156, 22694, 3418.54, 0.32],
    [22694, 54725, 4870.7, 0.35],
    [54725, Infinity, 16081.55, 0.37],
  ],
};

// This is done individually so tax class doesn't matter.
// Income over the threshold is no longer taxed, hence we see a 0 rate.
const FICA_INCOME_CAP = 184500;
const FICA_TAX_RATE = 0.062; // Technically employer also pays 6.2%, but we're only concerned with employee withholding here
const FICA_WITHHOLDING: Withholding = {
  [TAX_CLASSES.SINGLE]: [
    [0, FICA_INCOME_CAP, 0, FICA_TAX_RATE],
    [FICA_INCOME_CAP, Infinity, FICA_INCOME_CAP * FICA_TAX_RATE, 0.0],
  ],
};

// Married filing jointly is actually different here.
// Income over the threshold is an additional 0.9% so 0.0145 + 0.009 = 0.0235 for the rate above threshold
// ignoring head of household as it's the same as single and not used in any calculators
const MEDICARE_INCOME_CAP_SINGLE = 200000;
const MEDICARE_INCOME_CAP_MARRIED = 250000;
const MEDICARE_INCOME_CAP_SEPARATE = 125000;
const MEDICARE_TAX_RATE = 0.0145;
const MEDICARE_ADDITIONAL_TAX_RATE = 0.009;
const MEDICARE_TOP_RATE = MEDICARE_TAX_RATE + MEDICARE_ADDITIONAL_TAX_RATE;
const MEDICARE_WITHHOLDING: Withholding = {
  [TAX_CLASSES.SINGLE]: [
    [0, MEDICARE_INCOME_CAP_SINGLE, 0, MEDICARE_TAX_RATE],
    [
      MEDICARE_INCOME_CAP_SINGLE,
      Infinity,
      MEDICARE_INCOME_CAP_SINGLE * MEDICARE_TAX_RATE,
      MEDICARE_TOP_RATE,
    ],
  ],
  [TAX_CLASSES.MARRIED_FILING_JOINTLY]: [
    [0, MEDICARE_INCOME_CAP_MARRIED, 0, MEDICARE_TAX_RATE],
    [
      MEDICARE_INCOME_CAP_MARRIED,
      Infinity,
      MEDICARE_INCOME_CAP_MARRIED * MEDICARE_TAX_RATE,
      MEDICARE_TOP_RATE,
    ],
  ],
  [TAX_CLASSES.MARRIED_FILING_SEPARATELY]: [
    [0, MEDICARE_INCOME_CAP_SEPARATE, 0, MEDICARE_TAX_RATE],
    [
      MEDICARE_INCOME_CAP_SEPARATE,
      Infinity,
      MEDICARE_INCOME_CAP_SEPARATE * MEDICARE_TAX_RATE,
      MEDICARE_TOP_RATE,
    ],
  ],
};

/**
 * This function returns the total federal taxes to withhold from a paycheck given a wage, tax class, and pay period.
 * Note: Head of Household is unused in any calculators, so defaulting it to Single.
 * @param taxableWage
 * @param rawTaxClass
 * @param payPeriod
 * @returns
 */
export const getFederalWithholding = (
  taxableWage: number,
  rawTaxClass: TAX_CLASSES,
  payPeriod: PAY_SCHEDULE,
): number => {
  let taxClass = rawTaxClass;
  if (
    taxClass === TAX_CLASSES.MARRIED_FILING_SEPARATELY ||
    taxClass === TAX_CLASSES.HEAD_OF_HOUSEHOLD
  ) {
    taxClass = TAX_CLASSES.SINGLE;
  }
  let withholdingBrackets = BIWEEKLY_WITHHOLDING[taxClass];
  switch (payPeriod) {
    case PAY_SCHEDULE.BIWEEKLY:
      break;
    case PAY_SCHEDULE.SEMIMONTHLY:
      withholdingBrackets = SEMIMONTHLY_WITHHOLDING[taxClass];
      break;
    case PAY_SCHEDULE.MONTHLY:
      withholdingBrackets = MONTHLY_WITHHOLDING[taxClass];
      break;
    default:
      console.log(
        "Unsupported pay period used to call getFederalWithholding. Defaulting to biweekly.",
      );
      break;
  }

  let row = 0;
  // increment row while not the last row and the max wage at current row is less than taxableWage
  // in other words, stop when we're at the last row, or the current max wage is higher than our taxableWage
  while (
    row < withholdingBrackets.length - 1 &&
    withholdingBrackets[row][1] < taxableWage
  ) {
    row += 1;
  }
  return (
    withholdingBrackets[row][2] +
    (taxableWage - withholdingBrackets[row][0]) * withholdingBrackets[row][3]
  );
};

export const maxFICAContribution = FICA_WITHHOLDING[TAX_CLASSES.SINGLE][1][2];
export const getFICATaxRate = FICA_WITHHOLDING[TAX_CLASSES.SINGLE][0][3];
export const getFICAWithholding = (annualIncome: number): number => {
  const withholdingBrackets = FICA_WITHHOLDING[TAX_CLASSES.SINGLE];
  if (annualIncome >= withholdingBrackets[1][0]) {
    return maxFICAContribution;
  }
  return annualIncome * withholdingBrackets[0][3];
};

export const getMedicareWithholding = (
  annualIncome: number,
  tax_class: TAX_CLASSES,
): number => {
  const withholdingBrackets = MEDICARE_WITHHOLDING[tax_class];
  const threshold = withholdingBrackets[1][0];
  if (annualIncome >= threshold) {
    return (
      withholdingBrackets[1][2] +
      (annualIncome - threshold) * withholdingBrackets[1][3]
    );
  }
  return annualIncome * withholdingBrackets[0][3];
};
