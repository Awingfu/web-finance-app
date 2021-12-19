// 2022
// Source: https://www.irs.gov/pub/irs-dft/p15t--dft.pdf page 11 W4 after 2020

enum TAX_CLASSES {
    SINGLE = "Single", 
    MARRIED_FILING_JOINTLY = "Married Filing Jointly", 
    MARRIED_FILING_SEPARATELY = "Married Filing Separatly", 
    HEAD_OF_HOUSEHOLD = "Head of Household"
};

const federal_witholding = 
{
    [TAX_CLASSES.SINGLE] : [
        [0, 6275, 0, 0, 0],
        [6275, 11250, 0, .10, 6275],
        [11250, 26538, 497, .12, 11250],
        [26538, 49463, 2332, .22, 26538],
        [49463, 88738, 7375.5, .24, 49463],
        [88738, 110988, 16801.5, .32, 88738],
        [110988, 268075, 23921.5, .35, 110988],
        [268075, Infinity, 78902.13, .37, 268075]
    ],
    [TAX_CLASSES.MARRIED_FILING_SEPARATELY]: [],
    [TAX_CLASSES.MARRIED_FILING_JOINTLY] : [],
    [TAX_CLASSES.HEAD_OF_HOUSEHOLD] : [],
};

export default federal_witholding;