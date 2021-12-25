// 2022
// Source: https://www.irs.gov/pub/irs-dft/p15t--dft.pdf page 11 W4 after 2020

enum TAX_CLASSES {
    SINGLE = "Single", 
    MARRIED_FILING_JOINTLY = "Married Filing Jointly", 
    MARRIED_FILING_SEPARATELY = "Married Filing Separatly", 
    HEAD_OF_HOUSEHOLD = "Head of Household"
};

interface Taxes { 
    [key: string]: number[][]
}

// Source: https://taxfoundation.org/2022-tax-brackets/
// [min, max, tax_rate]
// next step will convert to [min, max, tax_rate]
const federal_taxes: Taxes = 
{
    [TAX_CLASSES.SINGLE] : [
        [0, 10275, .10],
        [10275, 41775, .12],
        [41775, 89075, .22],
        [89075, 170050, .24],
        [170050, 215950, .32],
        [215950, 539900, .35],
        [539900, Infinity, .37],
    ],
    [TAX_CLASSES.MARRIED_FILING_JOINTLY] : [
        [0, 20550, .10],
        [20550, 83550, .12],
        [83550, 178150, .22],
        [178150, 340100, .24],
        [340100, 431900, .32],
        [431900, 647850, .35],
        [647850, Infinity, .37],
    ],
    [TAX_CLASSES.HEAD_OF_HOUSEHOLD] : [
        [0, 14650, .10],
        [14650, 55900, .12],
        [55900, 89050, .22],
        [89050, 170050, .24],
        [170050, 215950, .32],
        [215950, 539900, .35],
        [539900, Infinity, .37],
    ],
};

// Calculate (sum from previous tax rows) and push into arrays. Array modification is by reference
for (let tax_class in federal_taxes) {
    let last_sum: number = 0;
    let current_sum: number = 0;
    for (let row_num = 0; row_num < federal_taxes[tax_class].length; row_num++) {
        let row_ref = federal_taxes[tax_class][row_num];
        row_ref.push(last_sum + current_sum);
        last_sum += current_sum;
        // ignore infinity case
        if (row_num != federal_taxes[tax_class].length) {
             current_sum = (row_ref[1] - row_ref[0]) * row_ref[2];
        }
    }
}

// MARRIED_FILING_SEPARATELY is currently the same as SINGLE
federal_taxes[TAX_CLASSES.MARRIED_FILING_SEPARATELY] = [...federal_taxes[TAX_CLASSES.SINGLE]]

// maybe move to constants?
export const federal_standard_deductions = {
    [TAX_CLASSES.SINGLE] : 12950,
    [TAX_CLASSES.MARRIED_FILING_JOINTLY] : 25900,
    [TAX_CLASSES.HEAD_OF_HOUSEHOLD] : 19400,
}

// https://www.nerdwallet.com/article/taxes/fica-tax-withholding
export const social_security_taxes: Taxes = 
{
    [TAX_CLASSES.SINGLE] : [
        [0, 142800, .062],
        [142800, Infinity, .0],
    ],
    //??
    [TAX_CLASSES.MARRIED_FILING_JOINTLY] : [
        [0, 285600, .062],
        [285600, Infinity, .0],
    ]
};

export const medicare_taxes: Taxes = 
{
    [TAX_CLASSES.SINGLE] : [
        [0, 200000, .0145],
        [200000, Infinity, .0235],
    ],
    [TAX_CLASSES.MARRIED_FILING_JOINTLY] : [
        [0, 250000, .0145],
        [250000, Infinity, .0235],
    ]
};

export default federal_taxes;