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
  brackets?: never; // implied Single
  marriedBrackets?: never;
  flatTax?: never;
  standardDeduction?: never;
  marriedStandardDeduction?: never;
}

export function instanceOfTaxUnknown(
  object: any,
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
  object: any,
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
  taxClass: TAX_CLASSES,
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
    // console.log(
    //   us_state_object.name + " State's taxes are not defined, returning 0."
    // );
    return 0;
  }
  if (instanceOfFlatTax(us_state_object)) {
    // console.log(
    //   us_state_object.name +
    //     " State has a flat tax of " +
    //     us_state_object.flatTax +
    //     "%"
    // );
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
        // console.log(
        //   "You're at the " +
        //     withholdingBrackets[row][3] * 100 +
        //     "% tax bracket for " +
        //     us_state_object.name +
        //     " State"
        // );
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

export const getStateMarginalRate = (
  stateAbbreviation: string,
  taxableAnnualIncome: number,
  taxClass: TAX_CLASSES,
): number => {
  const us_state_object = US_STATES_MAP[stateAbbreviation];
  let income = taxableAnnualIncome;
  if (
    us_state_object.marriedStandardDeduction &&
    taxClass === TAX_CLASSES.MARRIED_FILING_JOINTLY
  ) {
    income = taxableAnnualIncome - us_state_object.marriedStandardDeduction;
  } else if (us_state_object.standardDeduction) {
    income = taxableAnnualIncome - us_state_object.standardDeduction;
  }
  income = Math.max(0, income);

  if (instanceOfTaxUnknown(us_state_object)) return 0;
  if (instanceOfFlatTax(us_state_object)) return us_state_object.flatTax;
  if (instanceOfTaxBrackets(us_state_object)) {
    let withholdingBrackets = us_state_object.brackets;
    if (
      taxClass === TAX_CLASSES.MARRIED_FILING_JOINTLY &&
      us_state_object.marriedBrackets
    ) {
      withholdingBrackets = us_state_object.marriedBrackets;
    }
    for (let row = 0; row < withholdingBrackets.length; row++) {
      if (
        withholdingBrackets[row][1] === Infinity ||
        withholdingBrackets[row][1] > income
      ) {
        return withholdingBrackets[row][3];
      }
    }
  }
  return 0;
};

// Other sources for flat tax: https://www.nerdwallet.com/article/taxes/state-income-tax-rates
// this table is to prioritize withholdings rather than taxes, although most are tax rates
// format inspiration: https://gist.github.com/mshafrir/2646763
// source: https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/ 2026 data
export const US_STATES_MAP: US_STATE_MAP = {
  None: { name: "None", abbreviation: "None", flatTax: 0 }, //adding None
  AL: {
    name: "Alabama",
    abbreviation: "AL",
    // source: https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/
    // ignoring occupational tax rates, etc.
    standardDeduction: 3000,
    marriedStandardDeduction: 8500,
    brackets: [
      [0, 500, 0, 0.02],
      [500, 3000, 10, 0.04],
      [3000, Infinity, 110, 0.05],
    ],
    marriedBrackets: [
      [0, 1000, 0, 0.02],
      [1000, 6000, 20, 0.04],
      [6000, Infinity, 220, 0.05],
    ],
  },
  AK: { name: "Alaska", abbreviation: "AK", flatTax: 0 },
  AS: { name: "American Samoa", abbreviation: "AS" },
  AZ: {
    name: "Arizona",
    abbreviation: "AZ",
    // source: https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/
    flatTax: 0.025,
    standardDeduction: 8350,
    marriedStandardDeduction: 16700,
  },
  AR: {
    name: "Arkansas",
    abbreviation: "AR",
    // source: https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/
    standardDeduction: 2470,
    marriedStandardDeduction: 4940,
    brackets: [
      [0, 4600, 0, 0.02],
      [4600, Infinity, 92, 0.039],
    ],
  },
  CA: {
    name: "California",
    abbreviation: "CA",
    // source: https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/
    // we're ignoring itemized deductions, credits, allowances, and exemptions...
    standardDeduction: 5540,
    marriedStandardDeduction: 11080,
    brackets: [
      [0, 11079, 0, 0.01],
      [11079, 26264, 110.79, 0.02],
      [26264, 41452, 414.49, 0.04],
      [41452, 57542, 1022.01, 0.06],
      [57542, 72724, 1987.41, 0.08],
      [72724, 371479, 3201.97, 0.093],
      [371479, 445771, 30986.19, 0.103],
      [445771, 742953, 38638.27, 0.113],
      [742953, 1000000, 72219.84, 0.123],
      [1000000, Infinity, 103836.62, 0.133],
    ],
    marriedBrackets: [
      [0, 22158, 0, 0.01],
      [22158, 52528, 221.58, 0.02],
      [52528, 82904, 828.98, 0.04],
      [82904, 115084, 2044.02, 0.06],
      [115084, 145448, 3974.82, 0.08],
      [145448, 742958, 6403.94, 0.093],
      [742958, 891542, 61972.37, 0.103],
      [891542, 1000000, 77276.52, 0.113],
      [1000000, 1485906, 89532.27, 0.123],
      [1485906, Infinity, 149298.71, 0.133],
    ],
  },
  CO: {
    name: "Colorado",
    abbreviation: "CO",
    flatTax: 0.044, // updated 2026 (HB24-1065)
    standardDeduction: 16100,
    marriedStandardDeduction: 32200,
  },
  CT: {
    name: "Connecticut",
    abbreviation: "CT",
    // source: https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/
    standardDeduction: 15000,
    marriedStandardDeduction: 24000,
    brackets: [
      [0, 10000, 0, 0.02],
      [10000, 50000, 200, 0.045],
      [50000, 100000, 2000, 0.055],
      [100000, 200000, 4750, 0.06],
      [200000, 250000, 10750, 0.065],
      [250000, 500000, 14000, 0.069],
      [500000, Infinity, 31250, 0.0699],
    ],
    marriedBrackets: [
      [0, 20000, 0, 0.02],
      [20000, 100000, 400, 0.045],
      [100000, 200000, 4000, 0.055],
      [200000, 400000, 9500, 0.06],
      [400000, 500000, 21500, 0.065],
      [500000, 1000000, 28000, 0.069],
      [1000000, Infinity, 62500, 0.0699],
    ],
  },
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
    // source: https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/
    standardDeduction: 16100,
    marriedStandardDeduction: 32200,
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
  GA: {
    name: "Georgia",
    abbreviation: "GA",
    // source: https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/
    flatTax: 0.0519,
    standardDeduction: 12000,
    marriedStandardDeduction: 24000,
  },
  GU: { name: "Guam", abbreviation: "GU" },
  HI: {
    name: "Hawaii",
    abbreviation: "HI",
    // source: https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/
    standardDeduction: 4400,
    marriedStandardDeduction: 8800,
    brackets: [
      [0, 9600, 0, 0.014],
      [9600, 14400, 134.4, 0.032],
      [14400, 19200, 288, 0.055],
      [19200, 24000, 552, 0.064],
      [24000, 36000, 859.2, 0.068],
      [36000, 48000, 1675.2, 0.072],
      [48000, 125000, 2539.2, 0.076],
      [125000, 175000, 8391.2, 0.079],
      [175000, 225000, 12341.2, 0.0825],
      [225000, 275000, 16466.2, 0.09],
      [275000, 325000, 20966.2, 0.1],
      [325000, Infinity, 25966.2, 0.11],
    ],
    marriedBrackets: [
      [0, 19200, 0, 0.014],
      [19200, 28800, 268.8, 0.032],
      [28800, 38400, 576, 0.055],
      [38400, 48000, 1104, 0.064],
      [48000, 72000, 1718.4, 0.068],
      [72000, 96000, 3350.4, 0.072],
      [96000, 250000, 5078.4, 0.076],
      [250000, 350000, 16782.4, 0.079],
      [350000, 450000, 24682.4, 0.0825],
      [450000, 550000, 32932.4, 0.09],
      [550000, 650000, 41932.4, 0.1],
      [650000, Infinity, 51932.4, 0.11],
    ],
  },
  ID: {
    name: "Idaho",
    abbreviation: "ID",
    // source: https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/
    standardDeduction: 16100,
    marriedStandardDeduction: 32200,
    brackets: [
      [0, 4811, 0, 0.0],
      [4811, Infinity, 0, 0.053],
    ],
    marriedBrackets: [
      [0, 9622, 0, 0.0],
      [9622, Infinity, 0, 0.053],
    ],
  },
  IL: { name: "Illinois", abbreviation: "IL", flatTax: 0.0495 },
  IN: { name: "Indiana", abbreviation: "IN", flatTax: 0.0295 }, // updated 2026 (phased cut)
  IA: {
    name: "Iowa",
    abbreviation: "IA",
    // source: https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/
    flatTax: 0.038,
    standardDeduction: 16100,
    marriedStandardDeduction: 32200,
  },
  KS: {
    name: "Kansas",
    abbreviation: "KS",
    // source: https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/
    standardDeduction: 3605,
    marriedStandardDeduction: 8240,
    brackets: [
      [0, 23000, 0, 0.052],
      [23000, Infinity, 1196, 0.0558],
    ],
  },
  KY: {
    name: "Kentucky",
    abbreviation: "KY",
    flatTax: 0.035,
    standardDeduction: 3360,
  }, // updated 2026
  LA: {
    name: "Louisiana",
    abbreviation: "LA",
    // source: https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/
    flatTax: 0.03,
    standardDeduction: 12875,
    marriedStandardDeduction: 25750,
  },
  ME: {
    name: "Maine",
    abbreviation: "ME",
    // source: https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/
    standardDeduction: 8350,
    marriedStandardDeduction: 16700,
    brackets: [
      [0, 27399, 0, 0.058],
      [27399, 64849, 1589.14, 0.0675],
      [64849, Infinity, 4117.02, 0.0715],
    ],
  },
  MH: { name: "Marshall Islands", abbreviation: "MH" },
  MD: {
    name: "Maryland",
    abbreviation: "MD",
    // source: https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/
    standardDeduction: 3350,
    marriedStandardDeduction: 6700,
    brackets: [
      [0, 1000, 0, 0.02],
      [1000, 2000, 20, 0.03],
      [2000, 3000, 50, 0.04],
      [3000, 100000, 90, 0.0475],
      [100000, 125000, 4697.5, 0.05],
      [125000, 150000, 5947.5, 0.0525],
      [150000, 250000, 7260, 0.055],
      [250000, 500000, 12760, 0.0575],
      [500000, 1000000, 27135, 0.0625],
      [1000000, Infinity, 58385, 0.065],
    ],
    marriedBrackets: [
      [0, 1000, 0, 0.02],
      [1000, 2000, 20, 0.03],
      [2000, 3000, 50, 0.04],
      [3000, 150000, 90, 0.0475],
      [150000, 175000, 7072.5, 0.05],
      [175000, 225000, 8322.5, 0.0525],
      [225000, 300000, 10947.5, 0.055],
      [300000, 600000, 15072.5, 0.0575],
      [600000, 1200000, 32322.5, 0.0625],
      [1200000, Infinity, 69822.5, 0.065],
    ],
  },
  MA: { name: "Massachusetts", abbreviation: "MA", flatTax: 0.05 },
  MI: {
    name: "Michigan",
    abbreviation: "MI",
    flatTax: 0.0425,
  },
  MN: {
    name: "Minnesota",
    abbreviation: "MN",
    // 2026 source: https://www.revenue.state.mn.us/minnesota-income-tax-rates-and-brackets
    brackets: [
      [0, 33310, 0, 0.0535],
      [33310, 109430, 1782.085, 0.068],
      [109430, 203150, 6958.245, 0.0785],
      [203150, Infinity, 14315.265, 0.0985],
    ],
    marriedBrackets: [
      [0, 48700, 0, 0.0535],
      [48700, 193480, 2605.45, 0.068],
      [193480, 337930, 12450.49, 0.0785],
      [337930, Infinity, 23789.815, 0.0985],
    ],
  },
  MS: {
    name: "Mississippi",
    abbreviation: "MS",
    // source: https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/
    standardDeduction: 2300,
    marriedStandardDeduction: 4600,
    brackets: [
      [0, 10000, 0, 0.0],
      [10000, Infinity, 0, 0.04],
    ],
  },
  MO: {
    name: "Missouri",
    abbreviation: "MO",
    // source: https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/
    standardDeduction: 16100,
    marriedStandardDeduction: 32200,
    brackets: [
      [0, 1348, 0, 0.0],
      [1348, 2696, 0, 0.02],
      [2696, 4044, 26.96, 0.025],
      [4044, 5392, 60.66, 0.03],
      [5392, 6740, 101.1, 0.035],
      [6740, 8088, 148.28, 0.04],
      [8088, 9436, 202.2, 0.045],
      [9436, Infinity, 262.86, 0.047],
    ],
  },
  MT: {
    name: "Montana",
    abbreviation: "MT",
    // source: https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/
    standardDeduction: 16100,
    marriedStandardDeduction: 32200,
    brackets: [
      [0, 47500, 0, 0.047],
      [47500, Infinity, 2232.5, 0.0565],
    ],
  },
  NE: {
    name: "Nebraska",
    abbreviation: "NE",
    // source: https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/
    standardDeduction: 8850,
    marriedStandardDeduction: 17700,
    brackets: [
      [0, 4130, 0, 0.0246],
      [4130, 24760, 101.6, 0.0351],
      [24760, Infinity, 825.71, 0.0455],
    ],
  },
  NV: { name: "Nevada", abbreviation: "NV", flatTax: 0 },
  NH: { name: "New Hampshire", abbreviation: "NH", flatTax: 0 }, // I&D tax fully repealed Jan 1 2025
  NJ: {
    name: "New Jersey",
    abbreviation: "NJ",
    // source: https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/
    // ignoring deductions and exemptions
    brackets: [
      [0, 20000, 0, 0.014],
      [20000, 35000, 280, 0.0175],
      [35000, 40000, 542.5, 0.035],
      [40000, 75000, 717.5, 0.0553],
      [75000, 500000, 2653, 0.0637],
      [500000, 1000000, 29725.5, 0.0897],
      [1000000, Infinity, 74575.5, 0.1075],
    ],
    marriedBrackets: [
      [0, 20000, 0, 0.014],
      [20000, 50000, 280, 0.0175],
      [50000, 70000, 805, 0.0245],
      [70000, 80000, 1295, 0.035],
      [80000, 150000, 1645, 0.0553],
      [150000, 500000, 5516, 0.0637],
      [500000, 1000000, 27811, 0.0897],
      [1000000, Infinity, 72661, 0.1075],
    ],
  },
  NM: {
    name: "New Mexico",
    abbreviation: "NM",
    // source: https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/
    standardDeduction: 16100,
    marriedStandardDeduction: 32200,
    brackets: [
      [0, 5500, 0, 0.015],
      [5500, 16500, 82.5, 0.032],
      [16500, 33500, 434.5, 0.043],
      [33500, 66500, 1165.5, 0.047],
      [66500, 210000, 2716.5, 0.049],
      [210000, Infinity, 9748, 0.059],
    ],
  },
  NY: {
    name: "New York",
    abbreviation: "NY",
    // source: https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/
    // ignoring deductions and minimum income for tax
    standardDeduction: 8000,
    marriedStandardDeduction: 16050,
    brackets: [
      [0, 8500, 0, 0.039],
      [8500, 11700, 331.5, 0.044],
      [11700, 13900, 472.3, 0.0515],
      [13900, 80650, 585.6, 0.054],
      [80650, 215400, 4190.1, 0.059],
      [215400, 1077550, 12140.35, 0.0685],
      [1077550, 5000000, 71197.63, 0.0965],
      [5000000, 25000000, 449714.06, 0.103],
      [25000000, Infinity, 2509714.06, 0.109],
    ],
    marriedBrackets: [
      [0, 17150, 0, 0.039],
      [17150, 23600, 668.85, 0.044],
      [23600, 27900, 952.65, 0.0515],
      [27900, 161550, 1174.1, 0.054],
      [161550, 323200, 8391.2, 0.059],
      [323200, 2155350, 17928.55, 0.0685],
      [2155350, 5000000, 143430.83, 0.0965],
      [5000000, 25000000, 417939.56, 0.103],
      [25000000, Infinity, 2477939.56, 0.109],
    ],
  },
  NC: { name: "North Carolina", abbreviation: "NC", flatTax: 0.0409 }, // updated 2026 withholding rate (statutory 3.99%)
  ND: {
    name: "North Dakota",
    abbreviation: "ND",
    // source: https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/
    standardDeduction: 16100,
    marriedStandardDeduction: 32200,
    brackets: [
      [0, 48475, 0, 0.0],
      [48475, 244825, 0, 0.0195],
      [244825, Infinity, 3828.83, 0.025],
    ],
    marriedBrackets: [
      [0, 80975, 0, 0.0],
      [80975, 298075, 0, 0.0195],
      [298075, Infinity, 4233.45, 0.025],
    ],
  },
  MP: { name: "Northern Mariana Islands", abbreviation: "MP" },
  OH: {
    name: "Ohio",
    abbreviation: "OH",
    // source: https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/
    // no standard deduction
    brackets: [
      [0, 26050, 0, 0.0],
      [26050, Infinity, 0, 0.0275],
    ],
  },
  OK: {
    name: "Oklahoma",
    abbreviation: "OK",
    // source: https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/
    standardDeduction: 6350,
    marriedStandardDeduction: 12700,
    brackets: [
      [0, 3750, 0, 0.0],
      [3750, 4900, 0, 0.025],
      [4900, 7200, 28.75, 0.035],
      [7200, Infinity, 109.25, 0.045],
    ],
  },
  OR: {
    name: "Oregon",
    abbreviation: "OR",
    // source: https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/
    standardDeduction: 2910,
    marriedStandardDeduction: 5820,
    brackets: [
      [0, 4550, 0, 0.0475],
      [4550, 11400, 216.13, 0.0675],
      [11400, 125000, 678.5, 0.0875],
      [125000, Infinity, 10618.5, 0.099],
    ],
  },
  PW: { name: "Palau", abbreviation: "PW" },
  PA: { name: "Pennsylvania", abbreviation: "PA", flatTax: 0.0307 },
  PR: { name: "Puerto Rico", abbreviation: "PR" },
  RI: {
    name: "Rhode Island",
    abbreviation: "RI",
    // source: https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/
    standardDeduction: 11200,
    marriedStandardDeduction: 22400,
    brackets: [
      [0, 82050, 0, 0.0375],
      [82050, 186450, 3076.88, 0.0475],
      [186450, Infinity, 8035.88, 0.0599],
    ],
  },
  SC: {
    name: "South Carolina",
    abbreviation: "SC",
    // source: https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/
    standardDeduction: 8350,
    marriedStandardDeduction: 16700,
    brackets: [
      [0, 3640, 0, 0.0],
      [3640, 18230, 0, 0.03],
      [18230, Infinity, 437.7, 0.06],
    ],
  },
  SD: { name: "South Dakota", abbreviation: "SD", flatTax: 0 },
  TN: { name: "Tennessee", abbreviation: "TN", flatTax: 0 },
  TX: { name: "Texas", abbreviation: "TX", flatTax: 0 },
  UT: { name: "Utah", abbreviation: "UT", flatTax: 0.045 }, // updated 2026 (SB60 pending, using current 4.50%)
  VT: {
    name: "Vermont",
    abbreviation: "VT",
    // source: https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/
    standardDeduction: 7650,
    marriedStandardDeduction: 15300,
    brackets: [
      [0, 49400, 0, 0.0335],
      [49400, 119700, 1654.9, 0.066],
      [119700, 249700, 6294.7, 0.076],
      [249700, Infinity, 16174.7, 0.0875],
    ],
    marriedBrackets: [
      [0, 82500, 0, 0.0335],
      [82500, 199450, 2763.75, 0.066],
      [199450, 304000, 10482.45, 0.076],
      [304000, Infinity, 18428.25, 0.0875],
    ],
  },
  VI: { name: "Virgin Islands", abbreviation: "VI" },
  VA: {
    name: "Virginia",
    abbreviation: "VA",
    // source: https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/
    // ignoring exemptions
    standardDeduction: 8750,
    marriedStandardDeduction: 17500,
    brackets: [
      [0, 3000, 0, 0.02],
      [3000, 5000, 60, 0.03],
      [5000, 17000, 120, 0.05],
      [17000, Infinity, 720, 0.0575],
    ],
  },
  WA: { name: "Washington", abbreviation: "WA", flatTax: 0 },
  WV: {
    name: "West Virginia",
    abbreviation: "WV",
    // source: https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/
    // no standard deduction
    brackets: [
      [0, 10000, 0, 0.0222],
      [10000, 25000, 222, 0.0296],
      [25000, 40000, 666, 0.0333],
      [40000, 60000, 1165.5, 0.0444],
      [60000, Infinity, 2053.5, 0.0482],
    ],
  },
  WI: {
    name: "Wisconsin",
    abbreviation: "WI",
    // source: https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/
    standardDeduction: 13960,
    marriedStandardDeduction: 25840,
    brackets: [
      [0, 15110, 0, 0.035],
      [15110, 51950, 528.85, 0.044],
      [51950, 332720, 2149.81, 0.053],
      [332720, Infinity, 17030.62, 0.0765],
    ],
    marriedBrackets: [
      [0, 20150, 0, 0.035],
      [20150, 69260, 705.25, 0.044],
      [69260, 443630, 2866.09, 0.053],
      [443630, Infinity, 22707.7, 0.0765],
    ],
  },
  WY: { name: "Wyoming", abbreviation: "WY", flatTax: 0 },
};
