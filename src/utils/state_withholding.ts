/** This files contains the US States and their withholding data (if filled out)
*   3 classes for each state: flat tax, brackets (with optional married brackets), and unknown.
*   State taxes are hard 
*/
import { TAX_CLASSES } from './constants';

// Interfaces and exporting type checkers
interface US_STATE_BASIC {
    name: string,
    abbreviation: string,
};

interface US_STATE_TAX_UNKNOWN extends US_STATE_BASIC {
    brackets?: never
    marriedBrackets?: never
    flatTax?: never
    standardDeduction?: never
    marriedStandardDeduction?: never
};

export function instanceOfTaxUnknown(object: any): object is US_STATE_TAX_UNKNOWN {
    return !(object.brackets || object.flatTax != undefined); //explicit undefined check since 0 is falsy
}

interface US_STATE_TAX_BRACKETS extends US_STATE_BASIC {
    flatTax?: never
    standardDeduction?: number
    marriedStandardDeduction?: number
    brackets : number[][] // format of bracket [min, max, tax bracket]
    marriedBrackets? : number[][]
};

export function instanceOfFlatTax(object: any): object is US_STATE_TAX_FLAT {
    return !object.brackets && (object.flatTax != undefined);
}

interface US_STATE_TAX_FLAT extends US_STATE_BASIC {
    flatTax: number // should be a decimal fraction
    standardDeduction?: number
    marriedStandardDeduction?: number
    brackets? : never,
    marriedBrackets?: never
};

export function instanceOfTaxBrackets(object: any): object is US_STATE_TAX_BRACKETS {
    return !object.flatTax && object.brackets;
}

type US_STATE_TAX_MAP = US_STATE_TAX_UNKNOWN | US_STATE_TAX_BRACKETS | US_STATE_TAX_FLAT;

interface US_STATE_MAP {
    [key: string] : US_STATE_TAX_MAP
};

// Calculate (cumulative from previous tax rows) and push into rows. Array modification is by reference
// Input should be in the format [min income, max income, withholding rate]
// Output will be in the format [min income, max income, withholding rate, cumulative withholding from above rows]
// TODO: probably remove this step since it adds some complexity every time we select a state with tax brackets 
const addCumulativeColumn = (withholding_table : number[][]) => {
    if (withholding_table[0].length === 4) return; // we must have already added the needed column
    let last_sum = 0;
    let current_sum = 0;
    for (let row_num = 0; row_num < withholding_table.length; row_num++) {
        let row_ref = withholding_table[row_num];
        row_ref.push(last_sum + current_sum);
        last_sum += current_sum;
        // ignore infinity case in last row of each table
        if (row_num != withholding_table.length) {
            current_sum = (row_ref[1] - row_ref[0]) * row_ref[2];
        }
    }
}

// main function to export
export const determineStateTaxesWithheld = (stateAbbreviation: string, taxableAnnualIncome: number, taxClass: TAX_CLASSES): number => {
    let us_state_object = US_STATES_MAP[stateAbbreviation];
    let income = taxableAnnualIncome;
    if (us_state_object.marriedStandardDeduction && taxClass === TAX_CLASSES.MARRIED_FILING_JOINTLY) {
        income = taxableAnnualIncome - us_state_object.marriedStandardDeduction;
    } else if (us_state_object.standardDeduction) {
        income = taxableAnnualIncome - us_state_object.standardDeduction;
    }

    if (instanceOfTaxUnknown(us_state_object)) {
        console.log(us_state_object.name + " State's taxes are not defined, returning 0.");
        return 0;
    }
    if (instanceOfFlatTax(us_state_object)) {
        console.log(us_state_object.name + " State has a flat tax of " + us_state_object.flatTax + "%");
        return us_state_object.flatTax * income;
    }
    if (instanceOfTaxBrackets(us_state_object)) {
        let withholdingBrackets = us_state_object.brackets;
        if (taxClass === TAX_CLASSES.MARRIED_FILING_JOINTLY && us_state_object.marriedBrackets) {
            withholdingBrackets = us_state_object.marriedBrackets; 
        }
        addCumulativeColumn(withholdingBrackets) // add 4th column which is cumulative of taxes from rows above
        for (let row = 0; row < withholdingBrackets.length; row++) {
            // if we're at the last bracket or the max at the current bracket is higher than income
            if (withholdingBrackets[row][1] === Infinity || withholdingBrackets[row][1] > income) {
                // cumulative from previous rows + (income - min income at bracket) * tax rate at bracket
                console.log("You're at the " + withholdingBrackets[row][2]*100 +"% tax bracket for " + us_state_object.name + " State");
                return withholdingBrackets[row][3] + (income - withholdingBrackets[row][0]) * withholdingBrackets[row][2];
            }
        }
    }
    console.log("State tax withholding error. Unreachable code reached.")
    return 0;
};

// Other sources for flat tax: https://www.nerdwallet.com/article/taxes/state-income-tax-rates
// this table is to prioritize withholdings rather than taxes
// source: https://gist.github.com/mshafrir/2646763
export const US_STATES_MAP : US_STATE_MAP = {
    'None': { name: 'None', abbreviation: 'None', flatTax: 0}, //adding None
    'AL': { name: 'Alabama', abbreviation: 'AL' },
    'AK': { name: 'Alaska', abbreviation: 'AK', flatTax: 0 },
    'AS': { name: 'American Samoa', abbreviation: 'AS' },
    'AZ': { name: 'Arizona', abbreviation: 'AZ' },
    'AR': { name: 'Arkansas', abbreviation: 'AR' },
    'CA': { 
        name: 'California', 
        abbreviation: 'CA',
        // 2021 withholding source: https://nfc.usda.gov/Publications/HR_Payroll/Taxes/Bulletins/2021/TAXES-21-15.htm
        // we're ignoring itemized deductions, credits, allowances, and low income exemptions...
        standardDeduction: 4601,
        marriedStandardDeduction: 4601,
        brackets: [
            [0, 8932, 0.011],
            [8932, 21175, 0.022],
            [21175, 33421, 0.044],
            [33421, 46394, 0.066],
            [46394, 58634, 0.088],
            [58634, 299508, 0.1023],
            [299508, 359407, 0.1133],
            [359407, 499012, 0.1243],
            [499012, 1000000, 0.1353],
            [1000000, Infinity, 0.1463],
        ],
        marriedBrackets: [
            [0, 17864, 0.011],
            [17864, 42350, 0.022],
            [42350, 66842, 0.044],
            [66842, 92788, 0.066],
            [92788, 117268, 0.088],
            [117268, 599016, 0.1023],
            [599016, 718814, 0.1133],
            [718814, 1000000, 0.1243],
            [1000000, 1198024, 0.1353],
            [1198024, Infinity, 0.1463],
        ]
    },
    'CO': { name: 'Colorado', abbreviation: 'CO', flatTax: 0.0455},
    'CT': { name: 'Connecticut', abbreviation: 'CT' },
    'DE': { 
        name: 'Delaware', 
        abbreviation: 'DE',
        standardDeduction: 3250,
        marriedStandardDeduction: 6500,
        // 2020 data excluding exemptions: https://nfc.usda.gov/Publications/HR_Payroll/Taxes/Bulletins/2020/TAXES-20-29.htm
        brackets: [
            [0, 2000, 0],
            [2000, 5000, 0.022],
            [5000, 10000, 0.039],
            [10000, 20000, 0.048],
            [20000, 25000, 0.052],
            [25000, 60000, 0.0555],
            [60000, Infinity, 0.066],
        ]
     },
    'DC': { 
        name: 'District Of Columbia', 
        abbreviation: 'DC',
        // 2021 source https://otr.cfo.dc.gov/release/district-columbia-tax-rate-changes-effective-october-1-2021
        brackets: [
            [0, 10000, 0.04],
            [10000, 40000, 0.06],
            [40000, 60000, 0.065],
            [60000, 250000, 0.085],
            [250000, 500000, 0.0925],
            [500000, 1000000, 0.0975],
            [1000000, Infinity, 0.1075],
        ]    
    },
    'FM': { name: 'Federated States Of Micronesia', abbreviation: 'FM' },
    'FL': { name: 'Florida', abbreviation: 'FL', flatTax: 0},
    'GA': { name: 'Georgia', abbreviation: 'GA' },
    'GU': { name: 'Guam', abbreviation: 'GU' },
    'HI': { name: 'Hawaii', abbreviation: 'HI' },
    'ID': { name: 'Idaho', abbreviation: 'ID' },
    'IL': { name: 'Illinois', abbreviation: 'IL', flatTax: 0.0495},
    'IN': { name: 'Indiana', abbreviation: 'IN', flatTax: 0.0323 },
    'IA': { name: 'Iowa', abbreviation: 'IA' },
    'KS': { name: 'Kansas', abbreviation: 'KS' },
    'KY': { name: 'Kentucky', abbreviation: 'KY', flatTax: 0.05 },
    'LA': { name: 'Louisiana', abbreviation: 'LA' },
    'ME': { name: 'Maine', abbreviation: 'ME' },
    'MH': { name: 'Marshall Islands', abbreviation: 'MH' },
    'MD': { 
        name: 'Maryland', 
        abbreviation: 'MD', 
        // 2021 source: https://www.marylandtaxes.gov/forms/Tax_Publications/Tax_Facts/Withholding_Tax_Facts/Withholding_Tax_Facts_2021.pdf
        // MD does not withhold under 0.0475% so we're commenting out the lower tax brackets
        brackets: [
            // [0, 1000, 0.02],
            // [1000, 2000, 0.03],
            // [2000, 3000, 0.04],
            // [3000, 100000, 0.0475],
            [0, 100000, 0.0475],
            [100000, 125000, 0.05],
            [125000, 150000, 0.0525],
            [150000, 250000, 0.055],
            [250000, Infinity, 0.0575],
        ],
        marriedBrackets: [
            // [0, 1000, 0.02],
            // [1000, 2000, 0.03],
            // [2000, 3000, 0.04],
            // [3000, 150000, 0.0475],
            [0, 150000, 0.0475],
            [150000, 175000, 0.05],
            [175000, 225000, 0.0525],
            [225000, 300000, 0.055],
            [300000, Infinity, 0.0575],
        ]
    },
    'MA': { name: 'Massachusetts', abbreviation: 'MA', flatTax: 0.05 },
    'MI': { name: 'Michigan', abbreviation: 'MI', flatTax: 0.0425 },
    'MN': { name: 'Minnesota', abbreviation: 'MN' },
    'MS': { name: 'Mississippi', abbreviation: 'MS' },
    'MO': { 
        name: 'Missouri', 
        abbreviation: 'MO',
        // 2022 source https://dor.mo.gov/forms/Withholding%20Formula_2022.pdf
        brackets: [
            [0, 1121, 0.015],
            [1121, 2242, 0.02],
            [2242, 3363, 0.025],
            [3363, 4484, 0.03],
            [4484, 5605, 0.035],
            [5605, 6726, 0.04],
            [6726, 7847, 0.045],
            [7847, 8968, 0.05],
            [8968, Infinity, 0.053],
        ]
    },
    'MT': { name: 'Montana', abbreviation: 'MT' },
    'NE': { name: 'Nebraska', abbreviation: 'NE' },
    'NV': { name: 'Nevada', abbreviation: 'NV', flatTax: 0},
    'NH': { name: 'New Hampshire', abbreviation: 'NH', flatTax: 0 }, // 5% on dividends and interest, TODO
    'NJ': { 
        name: 'New Jersey', 
        abbreviation: 'NJ',
        // 2021 source: https://www.forbes.com/advisor/taxes/new-jersey-state-tax/
        // ignoring deductions and minimum income for tax
        brackets: [
            [0, 20000, 0.014],
            [20000, 35000, 0.0175],
            [35000, 40000, 0.035],
            [40000, 75000, 0.05525],
            [75000, 500000, 0.0637],
            [500000, 5000000, 0.0897],
            [5000000, Infinity, 0.1075]
        ],
        marriedBrackets: [
            [0, 20000, 0.014],
            [20000, 50000, 0.0175],
            [50000, 70000, 0.0245],
            [70000, 80000, 0.035],
            [80000, 150000, 0.05525],
            [150000, 500000, 0.0637],
            [500000, 5000000, 0.0897],
            [5000000, Infinity, 0.1075]
        ]
    },
    'NM': { name: 'New Mexico', abbreviation: 'NM' },
    'NY': { 
        name: 'New York', 
        abbreviation: 'NY',
        // source: https://www.nerdwallet.com/article/taxes/new-york-state-tax
        // ignoring deductions and minimum income for tax
        brackets: [
            [0, 8500, 0.04],
            [8500, 11700, 0.045],
            [11700, 13900, 0.0525],
            [13900, 21400, 0.059],
            [21400, 80650, 0.0597],
            [80650, 215400, 0.0633],
            [215400, 1077550, 0.0685],
            [1077550, 5000000, 0.0965],
            [5000000, 25000000, 0.103],
            [25000000, Infinity, 0.109]
        ],
        marriedBrackets: [
            [0, 17150, 0.04],
            [17150, 23600, 0.045],
            [23600, 27900, 0.0525],
            [27900, 43000, 0.059],
            [43000, 161550, 0.0597],
            [161550, 323200, 0.0633],
            [323200, 2155350, 0.0685],
            [2155350, 5000000, 0.0965],
            [5000000, 25000000, 0.103],
            [25000000, Infinity, 0.109]
        ]
    },
    'NC': { name: 'North Carolina', abbreviation: 'NC', flatTax: 0.0525 },
    'ND': { name: 'North Dakota', abbreviation: 'ND' },
    'MP': { name: 'Northern Mariana Islands', abbreviation: 'MP' },
    'OH': { name: 'Ohio', abbreviation: 'OH' },
    'OK': { name: 'Oklahoma', abbreviation: 'OK' },
    'OR': { name: 'Oregon', abbreviation: 'OR' },
    'PW': { name: 'Palau', abbreviation: 'PW' },
    'PA': { name: 'Pennsylvania', abbreviation: 'PA', flatTax: 0.0307 },
    'PR': { name: 'Puerto Rico', abbreviation: 'PR' },
    'RI': { name: 'Rhode Island', abbreviation: 'RI' },
    'SC': { name: 'South Carolina', abbreviation: 'SC' },
    'SD': { name: 'South Dakota', abbreviation: 'SD', flatTax: 0 },
    'TN': { name: 'Tennessee', abbreviation: 'TN', flatTax: 0 },
    'TX': { name: 'Texas', abbreviation: 'TX', flatTax: 0},
    'UT': { name: 'Utah', abbreviation: 'UT', flatTax: 0.0495 },
    'VT': { name: 'Vermont', abbreviation: 'VT' },
    'VI': { name: 'Virgin Islands', abbreviation: 'VI' },
    'VA': { 
        name: 'Virginia', 
        abbreviation: 'VA', 
        // 2021 source https://www.nerdwallet.com/article/taxes/virginia-state-tax
        // ignoring exemptions
        standardDeduction: 4500,
        marriedStandardDeduction: 9000,
        brackets: [
            [0, 3000, 0.02],
            [3000, 5000, 0.03],
            [5000, 17000, 0.05],
            [17000, Infinity, 0.0575]
        ] 
    },
    'WA': { name: 'Washington', abbreviation: 'WA', flatTax: 0},
    'WV': { name: 'West Virginia', abbreviation: 'WV' },
    'WI': { 
        name: 'Wisconsin', 
        abbreviation: 'WI',
        // https://www.bankrate.com/taxes/wisconsin-state-taxes/
        brackets: [
            [0, 11090, 0.04],
            [11090, 22190, 0.0584],
            [22190, 244270, 0.0627],
            [244270, Infinity, 0.0765],
        ],
        marriedBrackets: [
            [0, 14790, 0.04],
            [14790, 29580, 0.0584],
            [29580, 325700, 0.0627],
            [325700, Infinity, 0.0765],
        ]
    },
    'WY': { name: 'Wyoming', abbreviation: 'WY', flatTax: 0 }
};