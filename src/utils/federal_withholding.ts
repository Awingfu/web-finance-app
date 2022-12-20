/** 
 * Latest updated year: 2023
 * Federal Withholding Source: https://www.irs.gov/publications/p15t Manual Payroll Systems W4 after 2020
 * Federal Withholding Source PDF: https://www.irs.gov/pub/irs-dft/p15t--dft.pdf
 * FICA and Medicare Tax Source: https://www.nerdwallet.com/article/taxes/fica-tax-withholding
 * Additional Medicare Tax Source https://www.irs.gov/taxtopics/tc560
 * This file contains Federal, FICA (Social Security), and Medicare withholding
 * We also assume only Biweekly, Semimonthly, and Monthly pay periods for Married or Single tax classes
 */
import { PAY_SCHEDULE, TAX_CLASSES } from "./constants";

interface Withholding {
    [key: string]: number[][]
}

// Withholding will be in the format [min wage, max wage, cumulative withholding from above rows, withholding rate]
const BIWEEKLY_WITHHOLDING: Withholding = {
    [TAX_CLASSES.MARRIED_FILING_JOINTLY]: [
        [0, 1065, 0, 0.0],
        [1065, 1912, 0, 0.10],
        [1912, 4506, 84.7, 0.12],
        [4506, 8402, 395.98, 0.22],
        [8402, 15073, 1253.1, 0.24],
        [15073, 18854, 2854.14, 0.32],
        [18854, 27748, 4064.06, 0.35],
        [27748, Infinity, 7176.96, 0.37],
    ],
    [TAX_CLASSES.SINGLE]: [
        [0, 533, 0, 0.0],
        [533, 956, 0, 0.10],
        [956, 2253, 42.3, 0.12],
        [2253, 4201, 197.94, 0.22],
        [4201, 7537, 626.50, 0.24],
        [7537, 9427, 1427.14, 0.32],
        [9427, 22768, 2031.94, 0.35],
        [22768, Infinity, 6701.29, 0.37],
    ]
} 

const SEMIMONTHLY_WITHHOLDING: Withholding = {
    [TAX_CLASSES.MARRIED_FILING_JOINTLY]: [
        [0, 1154, 0, 0.0],
        [1154, 2071, 0, 0.10],
        [2071, 4881, 91.7, 0.12],
        [4881, 9102, 428.9, 0.22],
        [9102, 16329, 1357.52, 0.24],
        [16329, 20425, 3092, 0.32],
        [20425, 30060, 4402.72, 0.35],
        [30060, Infinity, 7774.97, 0.37],
    ],
    [TAX_CLASSES.SINGLE]: [
        [0, 577, 0, 0.0],
        [577, 1035, 0, 0.10],
        [1035, 2441, 45.8, 0.12],
        [2441, 4551, 214.52, 0.22],
        [4551, 8165, 678.72, 0.24],
        [8165, 10213, 1546.08, 0.32],
        [10213, 24666, 2201.44, 0.35],
        [24666, Infinity, 7259.99, 0.37],
    ]
} 

const MONTHLY_WITHHOLDING: Withholding = {
    [TAX_CLASSES.MARRIED_FILING_JOINTLY]: [
        [0, 2308, 0, 0.0],
        [2308, 4142, 0, 0.10],
        [4142, 9763, 183.4, 0.12],
        [9763, 18204, 857.92, 0.22],
        [18204, 32658, 2714.94, 0.24],
        [32658, 40850, 6183.9, 0.32],
        [40850, 60121, 8805.34, 0.35],
        [60121, Infinity, 15550.19, 0.37],
    ],
    [TAX_CLASSES.SINGLE]: [
        [0, 1154, 0, 0.0],
        [1154, 2071, 0, 0.10],
        [2071, 4881, 91.7, 0.12],
        [4881, 9102, 428.9, 0.22],
        [9102, 16329, 1357.52, 0.24],
        [16329, 20425, 3092, 0.32],
        [20425, 49331, 4402.72, 0.35],
        [49331, Infinity, 14519.82, 0.37],
    ]
} 

// This is done individually so tax class doesn't matter.
// Income over the threshold is no longer taxed, hence we see a 0 rate.
const FICA_WITHHOLDING: Withholding =
{
    [TAX_CLASSES.SINGLE]: [
        [0, 160200, 0, 0.062],
        [160200, Infinity, 9932.4, 0.0],
    ]
};

// Married filing jointly is actually different here. 
// Income over the threshold is an additional 0.9% so 0.0145 + 0.009 = 0.0235 for the rate above threshold
const MEDICARE_WITHHOLDING: Withholding =
{
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
 * TODO: Head of Household is unused in any calculators, so defaulting it to Single. 
 * @param taxableWage 
 * @param rawTaxClass 
 * @param payPeriod 
 * @returns 
 */
export const getFederalWithholding = (taxableWage: number, rawTaxClass: TAX_CLASSES, payPeriod: PAY_SCHEDULE): number => {
    let taxClass = rawTaxClass;
    if (taxClass === TAX_CLASSES.MARRIED_FILING_SEPARATELY || taxClass === TAX_CLASSES.HEAD_OF_HOUSEHOLD) {
        taxClass = TAX_CLASSES.SINGLE;
    }
    let withholdingBrackets = BIWEEKLY_WITHHOLDING[taxClass];
    switch (payPeriod) {
        case PAY_SCHEDULE.BIWEEKLY: 
            break;
        case PAY_SCHEDULE.SEMIMONTHLY:
            withholdingBrackets = SEMIMONTHLY_WITHHOLDING[taxClass];
        case PAY_SCHEDULE.MONTHLY:
            withholdingBrackets = MONTHLY_WITHHOLDING[taxClass];
        default:
            console.log("Unsupported pay period used to call getFederalWithholding. Defaulting to biweekly.")
            break;
    }

    let row = 0;
    // increment row while not the last row and the max wage at current row is less than taxableWage
    // in other words, stop when we're at the last row, or the current max wage is higher than our taxableWage
    while (row < withholdingBrackets.length - 1 && withholdingBrackets[row][1] < taxableWage) {
        row += 1;
    }
    console.log("You're at the " + withholdingBrackets[row][3] * 100 + "% Federal withholding bracket.");
    return withholdingBrackets[row][2] + (taxableWage - withholdingBrackets[row][0]) * withholdingBrackets[row][3];
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

export const getMedicareWithholding = (annualIncome: number, tax_class: TAX_CLASSES): number => {
    const withholdingBrackets = MEDICARE_WITHHOLDING[tax_class];
    const threshold = withholdingBrackets[1][0];
    if (annualIncome >= threshold) {
        return withholdingBrackets[1][2] + (annualIncome - threshold) * withholdingBrackets[1][3];
    }
    return annualIncome * withholdingBrackets[1][3];
};
