// 2022
// Source: https://www.irs.gov/pub/irs-dft/p15t--dft.pdf page 11 W4 after 2020
// This file contains Federal withholding, SocialSecurity withholding and Medicare withholding
import { TAX_CLASSES } from "./constants";

interface Withholding {
    [key: string]: number[][]
}

// Calculate (cumulative from previous tax rows) and push into rows. Array modification is by reference
// Input withholding should be in the format [min income, max income, withholding rate]
// Output withholding will be in the format [min income, max income, withholding rate, cumulative withholding from above rows]
const addCumulativeColumn = (withholding_table: Withholding) => {
    if (withholding_table[TAX_CLASSES.SINGLE][0].length > 3) return; // we must have already added the needed column
    for (let tax_class in withholding_table) {
        let last_sum = 0;
        let current_sum = 0;
        for (let row_num = 0; row_num < withholding_table[tax_class].length; row_num++) {
            let row_ref = withholding_table[tax_class][row_num];
            row_ref.push(last_sum + current_sum);
            last_sum += current_sum;
            // ignore infinity case in last row of each table
            if (row_num != withholding_table[tax_class].length) {
                current_sum = (row_ref[1] - row_ref[0]) * row_ref[2];
            }
        }
    }
}

const raw_federal_withholding: Withholding =
{
    [TAX_CLASSES.SINGLE]: [
        [0, 6275, 0.0],
        [6275, 11250, 0.10],
        [11250, 26538, 0.12],
        [26538, 49463, 0.22],
        [49463, 88738, 0.24],
        [88738, 110988, 0.32],
        [110988, 268075, 0.35],
        [268075, Infinity, 0.37],
    ],
    [TAX_CLASSES.MARRIED_FILING_JOINTLY]: [
        [0, 12550, 0.0],
        [12550, 22500, 0.10],
        [22500, 53075, 0.12],
        [53075, 98925, 0.22],
        [98925, 177475, 0.24],
        [177475, 221975, 0.32],
        [221975, 326700, 0.35],
        [326700, Infinity, 0.37],
    ],
    [TAX_CLASSES.MARRIED_FILING_SEPARATELY]: [
        [0, 6275, 0.0],
        [6275, 11250, 0.10],
        [11250, 26538, 0.12],
        [26538, 49463, 0.22],
        [49463, 88738, 0.24],
        [88738, 110988, 0.32],
        [110988, 268075, 0.35],
        [268075, Infinity, 0.37],
    ],
    [TAX_CLASSES.HEAD_OF_HOUSEHOLD]: [
        [0, 9400, 0.0],
        [9400, 16500, 0.10],
        [16500, 36500, 0.12],
        [36500, 52575, 0.22],
        [52575, 91850, 0.24],
        [91850, 114100, 0.32],
        [114100, 271200, 0.35],
        [271200, Infinity, 0.37],
    ],
};

const processedFederalWithholding = (): Withholding => {
    addCumulativeColumn(raw_federal_withholding);
    return raw_federal_withholding
}

export const determineFederalTaxesWithheld = (taxableAnnualIncome: number, tax_class: TAX_CLASSES): number => {
    let withholdingBrackets = processedFederalWithholding()[tax_class];
    for (let row = 0; row < withholdingBrackets.length; row++) {
        // if we're at the last bracket or the max at the current bracket is higher than income
        if (withholdingBrackets[row][1] === Infinity || withholdingBrackets[row][1] > taxableAnnualIncome) {
            // cumulative from previous rows + (income - min income at bracket) * tax rate at bracket
            console.log("You're at the " + withholdingBrackets[row][2] * 100 + "% Federal withholding bracket.");
            return withholdingBrackets[row][3] + (taxableAnnualIncome - withholdingBrackets[row][0]) * withholdingBrackets[row][2];
        }
    }
    console.log("Unreachable code reached, returning 0 for federal withholding.")
    return 0;
};

// https://www.nerdwallet.com/article/taxes/fica-tax-withholding
// This is done individually so tax class doesn't matter.
const raw_social_security_withholding: Withholding =
{
    [TAX_CLASSES.SINGLE]: [
        [0, 142800, 0.062],
        [142800, Infinity, 0.0],
    ]
};

const processedSocialSecurityWithholding = (): Withholding => {
    addCumulativeColumn(raw_social_security_withholding);
    return raw_social_security_withholding
}

export const determineSocialSecurityTaxesWithheld = (grossAnnualIncome: number): number => {
    let withholdingBrackets = processedSocialSecurityWithholding()[TAX_CLASSES.SINGLE];
    for (let row = 0; row < withholdingBrackets.length; row++) {
        // if we're at the last bracket or the max at the current bracket is higher than income
        if (withholdingBrackets[row][1] === Infinity || withholdingBrackets[row][1] > grossAnnualIncome) {
            // cumulative from previous rows + (income - min income at bracket) * tax rate at bracket
            return withholdingBrackets[row][3] + (grossAnnualIncome - withholdingBrackets[row][0]) * withholdingBrackets[row][2];
        }
    }
    console.log("Unreachable code reached, returning 0 for SS withholding.")
    return 0;
};

export const maxSocialSecurityContribution = processedSocialSecurityWithholding()[TAX_CLASSES.SINGLE][1][3];
export const getSocialSecuritytax = raw_social_security_withholding[TAX_CLASSES.SINGLE][0][2];

// Source https://www.irs.gov/taxtopics/tc560
const raw_medicare_withholding: Withholding =
{
    [TAX_CLASSES.SINGLE]: [
        [0, 200000, 0.0145],
        [200000, Infinity, 0.0235],
    ],
    [TAX_CLASSES.MARRIED_FILING_JOINTLY]: [
        [0, 250000, 0.0145],
        [250000, Infinity, 0.0235],
    ],
    [TAX_CLASSES.MARRIED_FILING_SEPARATELY]: [
        [0, 125000, 0.0145],
        [125000, Infinity, 0.0235],
    ],
    [TAX_CLASSES.HEAD_OF_HOUSEHOLD]: [
        [0, 200000, 0.0145],
        [200000, Infinity, 0.0235],
    ],
};

const processedMedicareWithholding = (): Withholding => {
    addCumulativeColumn(raw_medicare_withholding);
    return raw_medicare_withholding;
}

export const determineMedicareTaxesWithheld = (grossAnnualIncome: number, tax_class: TAX_CLASSES): number => {
    let withholdingBrackets = processedMedicareWithholding()[tax_class];
    for (let row = 0; row < withholdingBrackets.length; row++) {
        // if we're at the last bracket or the max at the current bracket is higher than income
        if (withholdingBrackets[row][1] === Infinity || withholdingBrackets[row][1] > grossAnnualIncome) {
            // cumulative from previous rows + (income - min income at bracket) * tax rate at bracket
            return withholdingBrackets[row][3] + (grossAnnualIncome - withholdingBrackets[row][0]) * withholdingBrackets[row][2];
        }
    }
    console.log("Unreachable code reached, returning 0 for Medicare withholding.")
    return 0;
};
