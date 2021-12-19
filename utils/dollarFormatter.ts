import { formatValue } from 'react-currency-input-field';

const dollarFormatter = (amount: number) : string => 
    formatValue({
        value: amount.toString(),
        groupSeparator: ',',
        decimalSeparator: '.',
        prefix: '$',
    });

export default dollarFormatter;