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

// only for singles
// source: https://gist.github.com/mshafrir/2646763
export const US_STATES_MAP : US_STATE_MAP = {
    'None': { name: 'None', abbreviation: 'None', flatTax: 0}, //adding None
    'AL': { name: 'Alabama', abbreviation: 'AL' },
    'AK': { name: 'Alaska', abbreviation: 'AK' },
    'AS': { name: 'American Samoa', abbreviation: 'AS' },
    'AZ': { name: 'Arizona', abbreviation: 'AZ' },
    'AR': { name: 'Arkansas', abbreviation: 'AR' },
    'CA': { 
        name: 'California', 
        abbreviation: 'CA',
        // 2021 source: https://www.nerdwallet.com/article/taxes/california-state-tax
        brackets: [
            [0, 9325, 0.01],
            [9325, 22107, 0.02],
            [22107, 34892, 0.04],
            [34892, 48435, 0.06],
            [48435, 61214, 0.08],
            [61214, 312686, 0.093],
            [312686, 375221, 0.103],
            [375221, 625369, 0.113],
            [625369, Infinity, 0.123],
        ],
        marriedBrackets: [
            [0, 18650, 0.01],
            [18650, 44214, 0.02],
            [44214, 69784, 0.04],
            [69784, 96870, 0.06],
            [96870, 122428, 0.08],
            [122428, 625372, 0.093],
            [625372, 750442, 0.103],
            [750442, 1250738, 0.113],
            [1250738, Infinity, 0.123],
        ]
    },
    'CO': { name: 'Colorado', abbreviation: 'CO' },
    'CT': { name: 'Connecticut', abbreviation: 'CT' },
    'DE': { name: 'Delaware', abbreviation: 'DE' },
    'DC': { name: 'District Of Columbia', abbreviation: 'DC' },
    'FM': { name: 'Federated States Of Micronesia', abbreviation: 'FM' },
    'FL': { name: 'Florida', abbreviation: 'FL', flatTax: 0},
    'GA': { name: 'Georgia', abbreviation: 'GA' },
    'GU': { name: 'Guam', abbreviation: 'GU' },
    'HI': { name: 'Hawaii', abbreviation: 'HI' },
    'ID': { name: 'Idaho', abbreviation: 'ID' },
    'IL': { name: 'Illinois', abbreviation: 'IL', flatTax: 0.0495},
    'IN': { name: 'Indiana', abbreviation: 'IN' },
    'IA': { name: 'Iowa', abbreviation: 'IA' },
    'KS': { name: 'Kansas', abbreviation: 'KS' },
    'KY': { name: 'Kentucky', abbreviation: 'KY' },
    'LA': { name: 'Louisiana', abbreviation: 'LA' },
    'ME': { name: 'Maine', abbreviation: 'ME' },
    'MH': { name: 'Marshall Islands', abbreviation: 'MH' },
    'MD': { name: 'Maryland', abbreviation: 'MD' },
    'MA': { name: 'Massachusetts', abbreviation: 'MA' },
    'MI': { name: 'Michigan', abbreviation: 'MI' },
    'MN': { name: 'Minnesota', abbreviation: 'MN' },
    'MS': { name: 'Mississippi', abbreviation: 'MS' },
    'MO': { name: 'Missouri', abbreviation: 'MO' },
    'MT': { name: 'Montana', abbreviation: 'MT' },
    'NE': { name: 'Nebraska', abbreviation: 'NE' },
    'NV': { name: 'Nevada', abbreviation: 'NV', flatTax: 0},
    'NH': { name: 'New Hampshire', abbreviation: 'NH' },
    'NJ': { name: 'New Jersey', abbreviation: 'NJ' },
    'NM': { name: 'New Mexico', abbreviation: 'NM' },
    'NY': { name: 'New York', abbreviation: 'NY' },
    'NC': { name: 'North Carolina', abbreviation: 'NC' },
    'ND': { name: 'North Dakota', abbreviation: 'ND' },
    'MP': { name: 'Northern Mariana Islands', abbreviation: 'MP' },
    'OH': { name: 'Ohio', abbreviation: 'OH' },
    'OK': { name: 'Oklahoma', abbreviation: 'OK' },
    'OR': { name: 'Oregon', abbreviation: 'OR' },
    'PW': { name: 'Palau', abbreviation: 'PW' },
    'PA': { name: 'Pennsylvania', abbreviation: 'PA' },
    'PR': { name: 'Puerto Rico', abbreviation: 'PR' },
    'RI': { name: 'Rhode Island', abbreviation: 'RI' },
    'SC': { name: 'South Carolina', abbreviation: 'SC' },
    'SD': { name: 'South Dakota', abbreviation: 'SD' },
    'TN': { name: 'Tennessee', abbreviation: 'TN' },
    'TX': { name: 'Texas', abbreviation: 'TX', flatTax: 0},
    'UT': { name: 'Utah', abbreviation: 'UT' },
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
    'WY': { name: 'Wyoming', abbreviation: 'WY' }
};