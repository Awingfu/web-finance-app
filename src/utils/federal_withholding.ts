/**
 * Latest updated year: 2024
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

// Withholding will be in the format [min wage, max wage, cumulative withholding from above rows, withholding rate]
const BIWEEKLY_WITHHOLDING: Withholding = {
  [TAX_CLASSES.MARRIED_FILING_JOINTLY]: [
    [0, 1123, 0, 0.0],
    [1123, 2015, 0, 0.1],
    [2015, 4750, 89.2, 0.12],
    [4750, 8856, 417.4, 0.22],
    [8856, 15888, 1320.72, 0.24],
    [15888, 19871, 3008.4, 0.32],
    [19871, 29246, 4282.96, 0.35],
    [29246, Infinity, 7564.21, 0.37],
  ],
  [TAX_CLASSES.SINGLE]: [
    [0, 562, 0, 0.0],
    [562, 1008, 0, 0.1],
    [1008, 2375, 44.6, 0.12],
    [2375, 4428, 208.64, 0.22],
    [4428, 7944, 660.3, 0.24],
    [7944, 9936, 1504.14, 0.32],
    [9936, 23998, 2141.58, 0.35],
    [23998, Infinity, 7063.28, 0.37],
  ],
};

const SEMIMONTHLY_WITHHOLDING: Withholding = {
  [TAX_CLASSES.MARRIED_FILING_JOINTLY]: [
    [0, 1217, 0, 0.0],
    [1217, 2183, 0, 0.1],
    [2183, 5146, 96.6, 0.12],
    [5146, 9594, 452.16, 0.22],
    [9594, 17213, 1430.72, 0.24],
    [17213, 21527, 3259.28, 0.32],
    [21527, 31683, 4639.76, 0.35],
    [31683, Infinity, 8194.36, 0.37],
  ],
  [TAX_CLASSES.SINGLE]: [
    [0, 608, 0, 0.0],
    [608, 1092, 0, 0.1],
    [1092, 2573, 48.4, 0.12],
    [2573, 4797, 226.12, 0.22],
    [4797, 8606, 715.4, 0.24],
    [8606, 10764, 1629.56, 0.32],
    [10764, 25998, 2320.12, 0.35],
    [25998, Infinity, 7652.02, 0.37],
  ],
};

const MONTHLY_WITHHOLDING: Withholding = {
  [TAX_CLASSES.MARRIED_FILING_JOINTLY]: [
    [0, 2433, 0, 0.0],
    [2433, 4367, 0, 0.1],
    [4367, 10292, 193.4, 0.12],
    [10292, 19188, 904.4, 0.22],
    [19188, 34425, 2861.52, 0.24],
    [34425, 43054, 6518.4, 0.32],
    [43054, 63367, 9279.68, 0.35],
    [63367, Infinity, 16389.23, 0.37],
  ],
  [TAX_CLASSES.SINGLE]: [
    [0, 1217, 0, 0.0],
    [1217, 2183, 0, 0.1],
    [2183, 5146, 96.6, 0.12],
    [5146, 9594, 452.16, 0.22],
    [9594, 17213, 1430.72, 0.24],
    [17213, 21527, 3259.28, 0.32],
    [21527, 51996, 4639.76, 0.35],
    [51996, Infinity, 15303.91, 0.37],
  ],
};

// This is done individually so tax class doesn't matter.
// Income over the threshold is no longer taxed, hence we see a 0 rate.
const FICA_WITHHOLDING: Withholding = {
  [TAX_CLASSES.SINGLE]: [
    [0, 168600, 0, 0.062],
    [168600, Infinity, 10453.2, 0.0],
  ],
};

// Married filing jointly is actually different here.
// Income over the threshold is an additional 0.9% so 0.0145 + 0.009 = 0.0235 for the rate above threshold
const MEDICARE_WITHHOLDING: Withholding = {
  [TAX_CLASSES.SINGLE]: [
    [0, 200000, 0, 0.0145],
    [200000, Infinity, 2900, 0.0235],
  ],
  [TAX_CLASSES.MARRIED_FILING_JOINTLY]: [
    [0, 250000, 0, 0.0145],
    [250000, Infinity, 3625, 0.0235],
  ],
  [TAX_CLASSES.MARRIED_FILING_SEPARATELY]: [
    [0, 125000, 0, 0.0145],
    [125000, Infinity, 1812.5, 0.0235],
  ],
  [TAX_CLASSES.HEAD_OF_HOUSEHOLD]: [
    [0, 200000, 0, 0.0145],
    [200000, Infinity, 2900, 0.0235],
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
  payPeriod: PAY_SCHEDULE
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
        "Unsupported pay period used to call getFederalWithholding. Defaulting to biweekly."
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
  // console.log(
  //   "You're at the " +
  //     withholdingBrackets[row][3] * 100 +
  //     "% Federal withholding bracket."
  // );
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
  tax_class: TAX_CLASSES
): number => {
  const withholdingBrackets = MEDICARE_WITHHOLDING[tax_class];
  const threshold = withholdingBrackets[1][0];
  if (annualIncome >= threshold) {
    return (
      withholdingBrackets[1][2] +
      (annualIncome - threshold) * withholdingBrackets[1][3]
    );
  }
  return annualIncome * withholdingBrackets[1][3];
};
