// This file will contain helper functions
// Just export the function and ensure they're imported where needed
import { FREQUENCIES } from "./constants";

export const formatCurrency = (num: number): string => {
    let formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      // These options are needed to round to whole numbers if that's what you want.
      //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
      //maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
    });
  
    return formatter.format(num);
};

export const formatPercent = (num: number, round: boolean = true): string => {
  const percentNumber = round ? Math.round(num * 100) : num * 100;
  return percentNumber + "%";
}

export const formatStateValue = (value: string | number): string => {
  return Number(value).toString();
}

// Not finished
// Gets all paydays based on pay period and current year
const getPayDays = (paycheckFrequency: FREQUENCIES, year: number, payBeforeHolidays: boolean = true, payBeforeWeekends: boolean = true): Date[] => {
  return [new Date()];
}