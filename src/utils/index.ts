// file that allows you to just import from /utils
export {
  getFICAWithholding,
  getFederalWithholding,
  getMedicareWithholding,
  maxFICAContribution,
  getFICATaxRate,
} from "./federal_withholding";
export {
  US_STATES_MAP,
  instanceOfTaxUnknown,
  determineStateTaxesWithheld,
} from "./state_withholding";
export {
  formatCurrency,
  formatPercent,
  formatStateValue,
} from "./helperFunctions";
export { prefix } from "./prefix";
export { RetirementTable } from "./retirement_table";
export { RetirementTableStrategy } from "./types";
export type { RetirementTableRow } from "./types";
