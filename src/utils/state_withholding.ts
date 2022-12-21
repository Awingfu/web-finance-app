/** This files contains the US States and their withholding data (if filled out)
 *   3 classes for each state: flat tax, brackets (with optional married brackets), and unknown.
 *   State taxes are hard. Some states let you choose your own withholding like AZ.
 *   TODO, add more custom state logic and major city tax toggles
 */
import { TAX_CLASSES } from "./constants";

// Interfaces and exporting type checkers
interface US_STATE_BASIC {
  name: string;
  abbreviation: string;
}

interface US_STATE_TAX_UNKNOWN extends US_STATE_BASIC {
  brackets?: never;
  marriedBrackets?: never;
  flatTax?: never;
  standardDeduction?: never;
  marriedStandardDeduction?: never;
}

export function instanceOfTaxUnknown(
  object: any
): object is US_STATE_TAX_UNKNOWN {
  return !(object.brackets || object.flatTax != undefined); //explicit undefined check since 0 is falsy
}

interface US_STATE_TAX_BRACKETS extends US_STATE_BASIC {
  flatTax?: never;
  standardDeduction?: number;
  marriedStandardDeduction?: number;
  brackets: number[][]; // format of bracket [min, max, tax bracket]
  marriedBrackets?: number[][];
}

export function instanceOfFlatTax(object: any): object is US_STATE_TAX_FLAT {
  return !object.brackets && object.flatTax != undefined;
}

interface US_STATE_TAX_FLAT extends US_STATE_BASIC {
  flatTax: number; // should be a decimal fraction
  standardDeduction?: number;
  marriedStandardDeduction?: number;
  brackets?: never;
  marriedBrackets?: never;
}

export function instanceOfTaxBrackets(
  object: any
): object is US_STATE_TAX_BRACKETS {
  return !object.flatTax && object.brackets;
}

type US_STATE_TAX_MAP =
  | US_STATE_TAX_UNKNOWN
  | US_STATE_TAX_BRACKETS
  | US_STATE_TAX_FLAT;

interface US_STATE_MAP {
  [key: string]: US_STATE_TAX_MAP;
}

// main function to export
export const determineStateTaxesWithheld = (
  stateAbbreviation: string,
  taxableAnnualIncome: number,
  taxClass: TAX_CLASSES
): number => {
  let us_state_object = US_STATES_MAP[stateAbbreviation];
  let income = taxableAnnualIncome;
  if (
    us_state_object.marriedStandardDeduction &&
    taxClass === TAX_CLASSES.MARRIED_FILING_JOINTLY
  ) {
    income = taxableAnnualIncome - us_state_object.marriedStandardDeduction;
  } else if (us_state_object.standardDeduction) {
    income = taxableAnnualIncome - us_state_object.standardDeduction;
  }

  if (instanceOfTaxUnknown(us_state_object)) {
    if (us_state_object.name != "None") {
      console.log(
        us_state_object.name + " State's taxes are not defined, returning 0."
      );
    }
    return 0;
  }
  if (instanceOfFlatTax(us_state_object)) {
    console.log(
      us_state_object.name +
        " State has a flat tax of " +
        us_state_object.flatTax +
        "%"
    );
    return us_state_object.flatTax * income;
  }
  if (instanceOfTaxBrackets(us_state_object)) {
    let withholdingBrackets = us_state_object.brackets;
    if (
      taxClass === TAX_CLASSES.MARRIED_FILING_JOINTLY &&
      us_state_object.marriedBrackets
    ) {
      withholdingBrackets = us_state_object.marriedBrackets;
    }
    for (let row = 0; row < withholdingBrackets.length; row++) {
      // if we're at the last bracket or the max at the current bracket is higher than income
      if (
        withholdingBrackets[row][1] === Infinity ||
        withholdingBrackets[row][1] > income
      ) {
        // cumulative from previous rows + (income - min income at bracket) * tax rate at bracket
        console.log(
          "You're at the " +
            withholdingBrackets[row][3] * 100 +
            "% tax bracket for " +
            us_state_object.name +
            " State"
        );
        return (
          withholdingBrackets[row][2] +
          (income - withholdingBrackets[row][0]) * withholdingBrackets[row][3]
        );
      }
    }
  }
  console.log("State tax withholding error. Unreachable code reached.");
  return 0;
};

// Other sources for flat tax: https://www.nerdwallet.com/article/taxes/state-income-tax-rates
// this table is to prioritize withholdings rather than taxes
// format source: https://gist.github.com/mshafrir/2646763
export const US_STATES_MAP: US_STATE_MAP = {
  None: { name: "None", abbreviation: "None", flatTax: 0 }, //adding None
  AL: {
    name: "Alabama",
    abbreviation: "AL",
    // source: https://smartasset.com/taxes/alabama-paycheck-calculator
    // ignoring occupational tax rates, etc.
    brackets: [
      [0, 500, 0, 0.02],
      [500, 3000, 10, 0.04],
      [3000, Infinity, 110, 0.05],
    ],
  },
  AK: { name: "Alaska", abbreviation: "AK", flatTax: 0 },
  AS: { name: "American Samoa", abbreviation: "AS" },
  // AZ source: https://azdor.gov/businesses-arizona/withholding-tax/withholding-calculator
  AZ: { name: "Arizona", abbreviation: "AZ" }, // you get to pick your own rate on the A-4 ??
  AR: { name: "Arkansas", abbreviation: "AR" },
  CA: {
    name: "California",
    abbreviation: "CA",
    // 2022 withholding source: https://www.nfc.usda.gov/Publications/HR_Payroll/Taxes/Bulletins/2022/TAXES-22-21.htm
    // we're ignoring itemized deductions, credits, allowances, and exemptions...
    standardDeduction: 4803,
    marriedStandardDeduction: 4803,
    brackets: [
      [0, 9325, 0, 0.011],
      [9325, 22107, 102.58, 0.022],
      [22107, 34892, 383.78, 0.044],
      [34892, 48435, 946.32, 0.066],
      [48435, 61214, 1840.16, 0.088],
      [61214, 312686, 2964.71, 0.1023],
      [312686, 375221, 28690.3, 0.1133],
      [375221, 625369, 35775.52, 0.1243],
      [625369, 1000000, 66868.92, 0.1353],
      [1000000, Infinity, 117556.49, 0.1463],
    ],
    marriedBrackets: [
      [0, 18650, 0, 0.011],
      [18650, 44214, 205.15, 0.022],
      [44214, 69784, 767.56, 0.044],
      [69784, 96870, 1892.64, 0.066],
      [96870, 122428, 3680.32, 0.088],
      [122428, 625372, 5929.42, 0.1023],
      [625372, 750442, 57380.59, 0.1133],
      [750442, 1000000, 71551.02, 0.1243],
      [1000000, 1250738, 102571.08, 0.1353],
      [1250738, Infinity, 136495.93, 0.1463],
    ],
  },
  CO: { name: "Colorado", abbreviation: "CO", flatTax: 0.0455 },
  CT: { name: "Connecticut", abbreviation: "CT" },
  DE: {
    name: "Delaware",
    abbreviation: "DE",
    standardDeduction: 3250,
    marriedStandardDeduction: 6500,
    // 2020 data excluding exemptions: https://nfc.usda.gov/Publications/HR_Payroll/Taxes/Bulletins/2020/TAXES-20-29.htm
    // ignoring exemptions
    brackets: [
      [0, 2000, 0, 0],
      [2000, 5000, 0, 0.022],
      [5000, 10000, 66, 0.039],
      [10000, 20000, 261, 0.048],
      [20000, 25000, 741, 0.052],
      [25000, 60000, 1001, 0.0555],
      [60000, Infinity, 2943.5, 0.066],
    ],
  },
  DC: {
    name: "District Of Columbia",
    abbreviation: "DC",
    // Source https://otr.cfo.dc.gov/page/dc-individual-and-fiduciary-income-tax-rates
    brackets: [
      [0, 10000, 0, 0.04],
      [10000, 40000, 400, 0.06],
      [40000, 60000, 2200, 0.065],
      [60000, 250000, 3500, 0.085],
      [250000, 500000, 19650, 0.0925],
      [500000, 1000000, 42775, 0.0975],
      [1000000, Infinity, 91525, 0.1075],
    ],
  },
  FM: { name: "Federated States Of Micronesia", abbreviation: "FM" },
  FL: { name: "Florida", abbreviation: "FL", flatTax: 0 },
  GA: { name: "Georgia", abbreviation: "GA" },
  GU: { name: "Guam", abbreviation: "GU" },
  HI: { name: "Hawaii", abbreviation: "HI" },
  ID: { name: "Idaho", abbreviation: "ID" },
  IL: { name: "Illinois", abbreviation: "IL", flatTax: 0.0495 },
  IN: { name: "Indiana", abbreviation: "IN", flatTax: 0.0323 },
  IA: { name: "Iowa", abbreviation: "IA" },
  KS: { name: "Kansas", abbreviation: "KS" },
  KY: { name: "Kentucky", abbreviation: "KY", flatTax: 0.05 },
  LA: { name: "Louisiana", abbreviation: "LA" },
  ME: { name: "Maine", abbreviation: "ME" },
  MH: { name: "Marshall Islands", abbreviation: "MH" },
  MD: {
    name: "Maryland",
    abbreviation: "MD",
    // 2021 source: https://www.marylandtaxes.gov/forms/Tax_Publications/Tax_Facts/Withholding_Tax_Facts/Withholding_Tax_Facts_2021.pdf
    // MD does not withhold under 0.0475% so we're commenting out the lower tax brackets
    brackets: [
      // [0, 1000, 0, 0.02],
      // [1000, 2000, 20, 0.03],
      // [2000, 3000, 50, 0.04],
      // [3000, 100000, 90, 0.0475],
      [0, 100000, 90, 0.0475],
      [100000, 125000, 4697.5, 0.05],
      [125000, 150000, 5947.5, 0.0525],
      [150000, 250000, 7260, 0.055],
      [250000, Infinity, 12760, 0.0575],
    ],
    marriedBrackets: [
      // [0, 1000, 0, 0.02],
      // [1000, 2000, 20, 0.03],
      // [2000, 3000, 50, 0.04],
      // [3000, 150000, 90, 0.0475],
      [0, 150000, 90, 0.0475],
      [150000, 175000, 7072.5, 0.05],
      [175000, 225000, 8322.5, 0.0525],
      [225000, 300000, 10947.5, 0.055],
      [300000, Infinity, 15072.5, 0.0575],
    ],
  },
  MA: { name: "Massachusetts", abbreviation: "MA", flatTax: 0.05 },
  MI: { name: "Michigan", abbreviation: "MI", flatTax: 0.0425 },
  MN: { name: "Minnesota", abbreviation: "MN" },
  MS: { name: "Mississippi", abbreviation: "MS" },
  MO: {
    name: "Missouri",
    abbreviation: "MO",
    standardDeduction: 12950,
    // 2022 source https://dor.mo.gov/forms/Withholding%20Formula_2022.pdf
    brackets: [
      [0, 1121, 0, 0.015],
      [1121, 2242, 16.815, 0.02],
      [2242, 3363, 39.235, 0.025],
      [3363, 4484, 67.26, 0.03],
      [4484, 5605, 100.89, 0.035],
      [5605, 6726, 140.125, 0.04],
      [6726, 7847, 184.965, 0.045],
      [7847, 8968, 235.41, 0.05],
      [8968, Infinity, 291.46, 0.053],
    ],
  },
  MT: { name: "Montana", abbreviation: "MT" },
  NE: { name: "Nebraska", abbreviation: "NE" },
  NV: { name: "Nevada", abbreviation: "NV", flatTax: 0 },
  NH: { name: "New Hampshire", abbreviation: "NH", flatTax: 0 }, // 5% on dividends and interest, TODO
  NJ: {
    name: "New Jersey",
    abbreviation: "NJ",
    // 2021 source: https://www.nfc.usda.gov/Publications/HR_Payroll/Taxes/Bulletins/2021/TAXES-21-13.htm
    // ignoring deductions, exemptions, and minimum income for tax
    brackets: [
      [0, 20000, 0, 0.015],
      [20000, 35000, 300, 0.02],
      [35000, 40000, 600, 0.039],
      [40000, 75000, 795, 0.061],
      [75000, 500000, 2930, 0.07],
      [500000, 1000000, 32680, 0.099],
      [1000000, Infinity, 82180, 0.118],
    ],
    marriedBrackets: [
      [0, 20000, 0, 0.015],
      [20000, 50000, 300, 0.02],
      [50000, 70000, 900, 0.027],
      [70000, 80000, 1440, 0.039],
      [80000, 150000, 1830, 0.061],
      [150000, 500000, 6100, 0.07],
      [500000, 1000000, 30600, 0.099],
      [1000000, Infinity, 80100, 0.118],
    ],
  },
  NM: { name: "New Mexico", abbreviation: "NM" },
  NY: {
    name: "New York",
    abbreviation: "NY",
    // source: https://www.nerdwallet.com/article/taxes/new-york-state-tax
    // ignoring deductions and minimum income for tax
    brackets: [
      [0, 8500, 0, 0.04],
      [8500, 11700, 340, 0.045],
      [11700, 13900, 484, 0.0525],
      [13900, 21400, 600, 0.059],
      [21400, 80650, 1042, 0.0597],
      [80650, 215400, 4579, 0.0633],
      [215400, 1077550, 13109, 0.0685],
      [1077550, 5000000, 72166, 0.0965],
      [5000000, 25000000, 450683, 0.103],
      [25000000, Infinity, 2510683, 0.109],
    ],
    marriedBrackets: [
      [0, 17150, 0, 0.04],
      [17150, 23600, 686, 0.045],
      [23600, 27900, 976, 0.0525],
      [27900, 43000, 1202, 0.059],
      [43000, 161550, 2093, 0.0597],
      [161550, 323200, 9170, 0.0633],
      [323200, 2155350, 19403, 0.0685],
      [2155350, 5000000, 144905, 0.0965],
      [5000000, 25000000, 419414, 0.103],
      [25000000, Infinity, 2479414, 0.109],
    ],
  },
  NC: { name: "North Carolina", abbreviation: "NC", flatTax: 0.0525 },
  ND: { name: "North Dakota", abbreviation: "ND" },
  MP: { name: "Northern Mariana Islands", abbreviation: "MP" },
  OH: { name: "Ohio", abbreviation: "OH" },
  OK: { name: "Oklahoma", abbreviation: "OK" },
  OR: { name: "Oregon", abbreviation: "OR" },
  PW: { name: "Palau", abbreviation: "PW" },
  PA: { name: "Pennsylvania", abbreviation: "PA", flatTax: 0.0307 },
  PR: { name: "Puerto Rico", abbreviation: "PR" },
  RI: { name: "Rhode Island", abbreviation: "RI" },
  SC: { name: "South Carolina", abbreviation: "SC" },
  SD: { name: "South Dakota", abbreviation: "SD", flatTax: 0 },
  TN: { name: "Tennessee", abbreviation: "TN", flatTax: 0 },
  TX: { name: "Texas", abbreviation: "TX", flatTax: 0 },
  UT: { name: "Utah", abbreviation: "UT", flatTax: 0.0495 },
  VT: { name: "Vermont", abbreviation: "VT" },
  VI: { name: "Virgin Islands", abbreviation: "VI" },
  VA: {
    name: "Virginia",
    abbreviation: "VA",
    // 2021 source https://www.nerdwallet.com/article/taxes/virginia-state-tax
    // ignoring exemptions
    standardDeduction: 4500,
    marriedStandardDeduction: 9000,
    brackets: [
      [0, 3000, 0, 0.02],
      [3000, 5000, 60, 0.03],
      [5000, 17000, 120, 0.05],
      [17000, Infinity, 720, 0.0575],
    ],
  },
  WA: { name: "Washington", abbreviation: "WA", flatTax: 0 },
  WV: { name: "West Virginia", abbreviation: "WV" },
  WI: {
    name: "Wisconsin",
    abbreviation: "WI",
    // https://www.bankrate.com/taxes/wisconsin-state-taxes/
    brackets: [
      [0, 11090, 0, 0.04],
      [11090, 22190, 443.6, 0.0584],
      [22190, 244270, 1091.84, 0.0627],
      [244270, Infinity, 15016.26, 0.0765],
    ],
    marriedBrackets: [
      [0, 14790, 0, 0.04],
      [14790, 29580, 591.6, 0.0584],
      [29580, 325700, 1455.34, 0.0627],
      [325700, Infinity, 20022.06, 0.0765],
    ],
  },
  WY: { name: "Wyoming", abbreviation: "WY", flatTax: 0 },
};
