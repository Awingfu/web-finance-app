// file that allows you to just import from /utils
export {
  getFICAWithholding,
  getFederalWithholding,
  getMedicareWithholding,
  getFederalMarginalRate,
  getFICAMarginalRate,
  getMedicareMarginalRate,
  maxFICAContribution,
  getFICATaxRate,
} from "./withholdings_federal";
export {
  US_STATES_MAP,
  instanceOfTaxUnknown,
  determineStateTaxesWithheld,
  getStateMarginalRate,
} from "./withholdings_state";
export {
  LOCAL_TAXES,
  LOCAL_TAXES_BY_STATE,
  getLocalWithholding,
  getLocalMarginalRate,
} from "./withholdings_local";
export {
  formatCurrency,
  formatPercent,
  formatStateValue,
} from "./helperFunctions";
export { prefix } from "./prefix";
export { RetirementTable } from "./retirement_table";
export { RetirementTableStrategy } from "./types";
export type { RetirementTableRow } from "./types";
