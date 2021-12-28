import { US_STATES_MAP, instanceOfTaxUnknown, instanceOfFlatTax, instanceOfTaxBrackets } from "./us_states";

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
        let tax_brackets = us_state_object.brackets;
        if (married && us_state_object.marriedBrackets) {
            tax_brackets = us_state_object.marriedBrackets; 
        }
        addCumulativeColumn(tax_brackets) // add 4th column which is cumulative of taxes from rows above
        for (let row = 0; row < tax_brackets.length; row++) {
            // if we're at the last bracket or the max at the current bracket is higher than income
            if (tax_brackets[row][1] === Infinity || tax_brackets[row][1] > taxableAnnualIncome) {
                // cumulative from previous rows + (income - min income at bracket) * tax rate at bracket
                console.log("You're at the " + tax_brackets[row][2]*100 +"% tax bracket for " + us_state_object.name + " State");
                return tax_brackets[row][3] + (taxableAnnualIncome - tax_brackets[row][0]) * tax_brackets[row][2];
            }
        }
    }
    console.log("State tax withholding error. Unreachable code reached.")
    return 0;
};