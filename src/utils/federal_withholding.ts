// 2022
// Source: https://www.irs.gov/pub/irs-dft/p15t--dft.pdf page 11 W4 after 2020
import { TAX_CLASSES } from "./constants";

interface Withholding { 
    [key: string]: number[][]
}

// Calculate (cumulative from previous tax rows) and push into rows. Array modification is by reference
// Input withholding should be in the format [min income, max income, withholding rate]
// Output withholding will be in the format [min income, max income, withholding rate, cumulative withholding from above rows]
const addCumulativeColumn = (withholding_table : Withholding) => {
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

const federal_withholding : Withholding = 
{
    [TAX_CLASSES.SINGLE] : [
        [0, 6275, 0.0],
        [6275, 11250, 0.10],
        [11250, 26538, 0.12],
        [26538, 49463, 0.22],
        [49463, 88738, 0.24],
        [88738, 110988, 0.32],
        [110988, 268075, 0.35],
        [268075, Infinity, 0.37],
    ],
    [TAX_CLASSES.MARRIED_FILING_JOINTLY] : [
        [0, 12550, 0.0],
        [12550, 22500, 0.10],
        [22500, 53075, 0.12],
        [53075, 98925, 0.22],
        [98925, 177475, 0.24],
        [177475, 221975, 0.32],
        [221975, 326700, 0.35],
        [326700, Infinity, 0.37],
    ],
    [TAX_CLASSES.HEAD_OF_HOUSEHOLD] : [
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
federal_withholding[TAX_CLASSES.MARRIED_FILING_SEPARATELY] = [...federal_withholding[TAX_CLASSES.SINGLE]];
addCumulativeColumn(federal_withholding);

// https://www.nerdwallet.com/article/taxes/fica-tax-withholding
// This is done individually so tax class doesn't matter
const social_security_withholding : Withholding = 
{
    [TAX_CLASSES.SINGLE] : [
        [0, 142800, 0.062],
        [142800, Infinity, 0.0],
    ]
};
social_security_withholding[TAX_CLASSES.MARRIED_FILING_SEPARATELY] = [...federal_withholding[TAX_CLASSES.SINGLE]];
social_security_withholding[TAX_CLASSES.MARRIED_FILING_JOINTLY] = [...federal_withholding[TAX_CLASSES.SINGLE]];
social_security_withholding[TAX_CLASSES.HEAD_OF_HOUSEHOLD] = [...federal_withholding[TAX_CLASSES.SINGLE]];
addCumulativeColumn(social_security_withholding);

// Source https://www.irs.gov/taxtopics/tc560
const medicare_withholding : Withholding = 
{
    [TAX_CLASSES.SINGLE] : [
        [0, 200000, 0.0145],
        [200000, Infinity, 0.0235],
    ],
    [TAX_CLASSES.MARRIED_FILING_JOINTLY] : [
        [0, 250000, 0.0145],
        [250000, Infinity, 0.0235],
    ],
    [TAX_CLASSES.MARRIED_FILING_SEPARATELY] : [
        [0, 125000, 0.0145],
        [125000, Infinity, 0.0235],
    ],
};
medicare_withholding[TAX_CLASSES.HEAD_OF_HOUSEHOLD] = [...medicare_withholding[TAX_CLASSES.SINGLE]];
addCumulativeColumn(medicare_withholding);

export {
    social_security_withholding,
    medicare_withholding,
    federal_withholding,
}