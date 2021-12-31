/** This files contains the US States and their withholding data (if filled out)
*   3 classes for each state: flat tax, brackets (with optional married brackets), and unknown.
*   State taxes are hard 
*/

// Interfaces and exporting type checkers
interface US_STATE_BASIC {
    name: string,
    abbreviation: string,
};

interface US_STATE_TAX_UNKNOWN extends US_STATE_BASIC {
    brackets?: never
    marriedBrackets?: never
    flatTax?: never
};

export function instanceOfTaxUnknown(object: any): object is US_STATE_TAX_UNKNOWN {
    return !(object.brackets || object.flatTax != undefined); //explicit undefined check since 0 is falsy
}

interface US_STATE_TAX_BRACKETS extends US_STATE_BASIC {
    flatTax?: never
    brackets : number[][] // format of bracket [min, max, tax bracket]
    marriedBrackets? : number[][]
};

export function instanceOfFlatTax(object: any): object is US_STATE_TAX_FLAT {
    return !object.brackets && (object.flatTax != undefined);
}

interface US_STATE_TAX_FLAT extends US_STATE_BASIC {
    flatTax: number // should be a decimal fraction
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
export const determineStateTaxesWithheld = (stateAbbreviation: string, taxableAnnualIncome: number, married: boolean = false): number => {
    let us_state_object = US_STATES_MAP[stateAbbreviation];
    if (instanceOfTaxUnknown(us_state_object)) {
        console.log(us_state_object.name + " State's taxes are not defined, returning 0.");
        return 0;
    }
    if (instanceOfFlatTax(us_state_object)) {
        console.log(us_state_object.name + " State has a flat tax of " + us_state_object.flatTax + "%");
        return us_state_object.flatTax * taxableAnnualIncome;
    }
    if (instanceOfTaxBrackets(us_state_object)) {
        let withholdingBrackets = us_state_object.brackets;
        if (married && us_state_object.marriedBrackets) {
            withholdingBrackets = us_state_object.marriedBrackets; 
        }
        addCumulativeColumn(withholdingBrackets) // add 4th column which is cumulative of taxes from rows above
        for (let row = 0; row < withholdingBrackets.length; row++) {
            // if we're at the last bracket or the max at the current bracket is higher than income
            if (withholdingBrackets[row][1] === Infinity || withholdingBrackets[row][1] > taxableAnnualIncome) {
                // cumulative from previous rows + (income - min income at bracket) * tax rate at bracket
                console.log("You're at the " + withholdingBrackets[row][2]*100 +"% tax bracket for " + us_state_object.name + " State");
                return withholdingBrackets[row][3] + (taxableAnnualIncome - withholdingBrackets[row][0]) * withholdingBrackets[row][2];
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
        // we're ignoring standard deductions, itemized deductions, credits, allowances, and low income exemptions...
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
        // 2021 tax source: https://www.nerdwallet.com/article/taxes/california-state-tax
        // brackets: [
        //     [0, 9325, 0.01],
        //     [9325, 22107, 0.02],
        //     [22107, 34892, 0.04],
        //     [34892, 48435, 0.06],
        //     [48435, 61214, 0.08],
        //     [61214, 312686, 0.093],
        //     [312686, 375221, 0.103],
        //     [375221, 625369, 0.113],
        //     [625369, Infinity, 0.123],
        // ],
        // marriedBrackets: [
        //     [0, 18650, 0.01],
        //     [18650, 44214, 0.02],
        //     [44214, 69784, 0.04],
        //     [69784, 96870, 0.06],
        //     [96870, 122428, 0.08],
        //     [122428, 625372, 0.093],
        //     [625372, 750442, 0.103],
        //     [750442, 1250738, 0.113],
        //     [1250738, Infinity, 0.123],
        // ]
    },
    'CO': { name: 'Colorado', abbreviation: 'CO', flatTax: 0.0455},
    'CT': { name: 'Connecticut', abbreviation: 'CT' },
    'DE': { name: 'Delaware', abbreviation: 'DE' },
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
    'NJ': { name: 'New Jersey', abbreviation: 'NJ' },
    'NM': { name: 'New Mexico', abbreviation: 'NM' },
    'NY': { name: 'New York', abbreviation: 'NY' },
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
        brackets: [
            [0, 3000, 0.02],
            [3000, 5000, 0.03],
            [5000, 17000, 0.05],
            [17000, Infinity, 0.0575]
        ] 
    },
    'WA': { name: 'Washington', abbreviation: 'WA', flatTax: 0},
    'WV': { name: 'West Virginia', abbreviation: 'WV' },
    'WI': { name: 'Wisconsin', abbreviation: 'WI' },
    'WY': { name: 'Wyoming', abbreviation: 'WY', flatTax: 0 }
};