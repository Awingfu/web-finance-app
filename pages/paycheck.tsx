import { useState, ChangeEvent, SetStateAction } from "react";
import {
  Form,
  Table,
  InputGroup,
  DropdownButton,
  Dropdown,
  Alert,
} from "react-bootstrap";
import styles from "../styles/Paycheck.module.scss";
import { Header, Footer, TooltipOnHover } from "../src/components";
import {
  TAX_CLASSES,
  FREQUENCIES,
  FREQUENCY_TO_ANNUM,
  ALL_FREQUENCIES,
  PAY_SCHEDULE,
  PAY_SCHEDULE_TO_ANNUM,
} from "../src/utils/constants";
import {
  determineStateTaxesWithheld,
  getStateMarginalRate,
  getFICAWithholding,
  getFederalWithholding,
  getMedicareWithholding,
  getFederalMarginalRate,
  getFICAMarginalRate,
  getMedicareMarginalRate,
  US_STATES_MAP,
  instanceOfTaxUnknown,
  formatCurrency,
  formatStateValue,
  maxFICAContribution,
  getFICATaxRate,
  LOCAL_TAXES,
  LOCAL_TAXES_BY_STATE,
  getLocalWithholding,
  getLocalMarginalRate,
} from "../src/utils";
import { PAYROLL_LAST_UPDATED } from "../src/utils/withholdings_federal";

/**
 * TODO:
 * 1. Create more advanced table
 *  - Company match
 *  - Other tax deductions, company match on HSA/FSA
 *  - multiple states
 *  - maximums on 401k, IRA, HSA
 * 2. perhaps split tool to do a month by month breakdown (e.g. to factor in maxing SStax)
 * 3. Split form and table to separate components
 * 4. save info to local storage + clear data button -> so we don't lose data on refresh
 */

const calculateContributionFromPercentage = (
  amount: number,
  contributionPercentage: number,
): number => {
  return amount * (contributionPercentage / 100);
};

const convertAnnualAmountToPaySchedule = (
  amount: number,
  paySchedule: PAY_SCHEDULE,
): number => {
  return amount / PAY_SCHEDULE_TO_ANNUM[paySchedule];
};

const calculateAnnualFromAmountAndFrequency = (
  contributionAmount: number,
  frequency: FREQUENCIES = FREQUENCIES.ANNUM,
  paySchedule: PAY_SCHEDULE = PAY_SCHEDULE.BIWEEKLY,
): number => {
  if (frequency === FREQUENCIES.PAYCHECK) {
    return contributionAmount * PAY_SCHEDULE_TO_ANNUM[paySchedule];
  } else {
    return contributionAmount * FREQUENCY_TO_ANNUM[frequency];
  }
};

function Paycheck() {
  // Form States
  const [salary, changeSalary] = useState(60000);
  const [bonus, changeBonus] = useState(0);
  const [bonusEligible, changeBonusEligible] = useState(false);

  const [paySchedule, changePaySchedule] = useState(PAY_SCHEDULE.BIWEEKLY);
  const [taxClass, changeTaxClass] = useState(TAX_CLASSES.SINGLE);
  const [usState, changeUSState] = useState(US_STATES_MAP["None"].abbreviation);
  const [localTaxes, setLocalTaxes] = useState<Record<string, boolean>>({});

  // if bonus is elegible for contributions, add it to salary
  let totalCompensation_annual = salary;
  if (bonusEligible) {
    totalCompensation_annual = salary + bonus;
  }

  // Pre Tax
  const [t401kContribution, changeT401kContribution] = useState(0);
  const t401k_annual = calculateContributionFromPercentage(
    totalCompensation_annual,
    t401kContribution,
  );
  const t401k_paycheck = convertAnnualAmountToPaySchedule(
    t401k_annual,
    paySchedule,
  );

  const [tIRAContribution, changeTIRAContribution] = useState(0);
  const tIRA_annual = calculateContributionFromPercentage(
    totalCompensation_annual,
    tIRAContribution,
  );
  const tIRA_paycheck = convertAnnualAmountToPaySchedule(
    tIRA_annual,
    paySchedule,
  );

  const [medicalContribution, changeMedicalContribution] = useState(0);
  const [medicalContributionFrequency, changeMedicalContributionFrequency] =
    useState(FREQUENCIES.PAYCHECK);
  const medical_annual = calculateAnnualFromAmountAndFrequency(
    medicalContribution,
    medicalContributionFrequency,
    paySchedule,
  );
  const medical_paycheck = convertAnnualAmountToPaySchedule(
    medical_annual,
    paySchedule,
  );

  const [commuterContribution, changeCommuterContribution] = useState(0);
  const [commuterContributionFrequency, changeCommuterContributionFrequency] =
    useState(FREQUENCIES.PAYCHECK);
  const commuter_annual = calculateAnnualFromAmountAndFrequency(
    commuterContribution,
    commuterContributionFrequency,
    paySchedule,
  );
  const commuter_paycheck = convertAnnualAmountToPaySchedule(
    commuter_annual,
    paySchedule,
  );

  const [hsaContribution, changeHSAContribution] = useState(0);
  const [hsaContributionFrequency, changeHSAContributionFrequency] = useState(
    FREQUENCIES.PAYCHECK,
  );
  const hsa_annual = calculateAnnualFromAmountAndFrequency(
    hsaContribution,
    hsaContributionFrequency,
    paySchedule,
  );
  const hsa_paycheck = convertAnnualAmountToPaySchedule(
    hsa_annual,
    paySchedule,
  );

  const [otherPreTaxContribution, changeOtherPreTaxContribution] = useState(0);
  const [
    otherPreTaxContributionFrequency,
    changeOtherPreTaxContributionFrequency,
  ] = useState(FREQUENCIES.PAYCHECK);
  const otherPreTax_annual = calculateAnnualFromAmountAndFrequency(
    otherPreTaxContribution,
    otherPreTaxContributionFrequency,
    paySchedule,
  );
  const otherPreTax_paycheck = convertAnnualAmountToPaySchedule(
    otherPreTax_annual,
    paySchedule,
  );

  // used to remove pre tax rows in table with $0 contributions
  const preTaxTableMap: { [key: string]: any } = {
    "Traditional 401k": [t401k_annual, t401k_paycheck],
    "Traditional IRA": [tIRA_annual, tIRA_paycheck],
    "Medical Insurance": [medical_annual, medical_paycheck],
    "Commuter Benefits": [commuter_annual, commuter_paycheck],
    "HSA/FSA": [hsa_annual, hsa_paycheck],
    "Other Pre-Tax": [otherPreTax_annual, otherPreTax_paycheck],
  };

  // if all Pre tax deductions are 0, dont render the section at all
  const shouldRenderPreTaxDeductions = !!Object.keys(preTaxTableMap).filter(
    (key) => preTaxTableMap[key][0] != 0,
  ).length;

  const sumOfPreTaxContributions_annual = Object.keys(preTaxTableMap).reduce(
    (prev, curr) => prev + preTaxTableMap[curr][0],
    0,
  );
  let taxableIncome_annual =
    totalCompensation_annual - sumOfPreTaxContributions_annual;
  // if bonus was not eligible for contributions, add it to taxable income
  if (!bonusEligible) {
    taxableIncome_annual =
      totalCompensation_annual - sumOfPreTaxContributions_annual + bonus;
  }
  taxableIncome_annual = Math.max(0, taxableIncome_annual);
  const taxableIncome_paycheck = convertAnnualAmountToPaySchedule(
    taxableIncome_annual,
    paySchedule,
  );

  // Taxes Withheld, should use taxableIncome_annual over salary
  const federalWithholding_paycheck = getFederalWithholding(
    taxableIncome_paycheck,
    taxClass,
    paySchedule,
  );
  const federalWithholding_annual =
    federalWithholding_paycheck * PAY_SCHEDULE_TO_ANNUM[paySchedule];

  const grossTaxableIncome_annual = salary + bonus;
  const grossTaxableIncome_paycheck = convertAnnualAmountToPaySchedule(
    grossTaxableIncome_annual,
    paySchedule,
  );
  const socialSecurityWithholding_annual = getFICAWithholding(
    grossTaxableIncome_annual,
  );
  let socialSecurityWithholding_paycheck = convertAnnualAmountToPaySchedule(
    socialSecurityWithholding_annual,
    paySchedule,
  );
  const socialSecurityMaxedIcon = "\u2020"; // dagger
  const socialSecurityMaxedNote =
    socialSecurityMaxedIcon +
    " You will pay the maximum Social Security tax of " +
    formatCurrency(maxFICAContribution) +
    " this year. Once you have withheld the maximum, which is after withholding for " +
    Math.ceil(
      maxFICAContribution / (grossTaxableIncome_paycheck * getFICATaxRate),
    ) +
    " paychecks, you will then withhold $0 into this category for the rest of the calendar year.";
  let socialSecurityMaxedAlertTableFooter = <></>;
  let socialSecurity_key = "Social Security";
  const isSocialSecurityMaxed =
    socialSecurityWithholding_annual === maxFICAContribution;
  if (isSocialSecurityMaxed) {
    socialSecurityMaxedAlertTableFooter = (
      <Alert className="mb-3" variant="secondary">
        {socialSecurityMaxedNote}
      </Alert>
    );
    socialSecurity_key = "Social Security" + socialSecurityMaxedIcon;
    socialSecurityWithholding_paycheck = Math.min(
      grossTaxableIncome_paycheck * getFICATaxRate,
      maxFICAContribution,
    );
  }

  const medicareWithholding_annual = getMedicareWithholding(
    grossTaxableIncome_annual,
    taxClass,
  );
  const medicareWithholding_paycheck = convertAnnualAmountToPaySchedule(
    medicareWithholding_annual,
    paySchedule,
  );

  // Marginal and effective rates for the three federal tax types
  const federalMarginalRate = getFederalMarginalRate(
    taxableIncome_paycheck,
    taxClass,
    paySchedule,
  );
  const federalEffectiveRate =
    taxableIncome_annual > 0
      ? federalWithholding_annual / taxableIncome_annual
      : 0;

  const ficaMarginalRate = getFICAMarginalRate(grossTaxableIncome_annual);
  const ficaEffectiveRate =
    grossTaxableIncome_annual > 0
      ? socialSecurityWithholding_annual / grossTaxableIncome_annual
      : 0;

  const medicareMarginalRate = getMedicareMarginalRate(
    grossTaxableIncome_annual,
    taxClass,
  );
  const medicareEffectiveRate =
    grossTaxableIncome_annual > 0
      ? medicareWithholding_annual / grossTaxableIncome_annual
      : 0;

  const formatTaxRate = (rate: number) => (rate * 100).toFixed(2) + "%";

  let stateTaxInvalidAlert = <></>;
  if (instanceOfTaxUnknown(US_STATES_MAP[usState])) {
    stateTaxInvalidAlert = (
      <Alert className="mb-3" variant="danger">
        {US_STATES_MAP[usState].name} State Tax Withholding has not been
        defined! Assuming $0.
      </Alert>
    );
  }
  const stateWithholding_annual = determineStateTaxesWithheld(
    usState,
    taxableIncome_annual,
    taxClass,
  );
  const stateWithholding_paycheck = convertAnnualAmountToPaySchedule(
    stateWithholding_annual,
    paySchedule,
  );
  const stateMarginalRate = getStateMarginalRate(
    usState,
    taxableIncome_annual,
    taxClass,
  );
  const stateEffectiveRate =
    taxableIncome_annual > 0
      ? stateWithholding_annual / taxableIncome_annual
      : 0;
  const stateIsUnknown = instanceOfTaxUnknown(US_STATES_MAP[usState]);
  const stateIsNone = usState === "None";
  const stateIsEstimate = !stateIsNone && !stateIsUnknown;
  const stateEstimateIcon = "\u002A"; // asterisk
  const stateWithholding_key =
    US_STATES_MAP[usState].abbreviation +
    " Withholding" +
    (stateIsEstimate ? stateEstimateIcon : "");
  const stateEstimateTableFooter = stateIsEstimate ? (
    <Alert className="mb-3" variant="secondary">
      {stateEstimateIcon} State withholding may be estimated using income tax
      brackets and standard deduction. See the FAQ for details.
    </Alert>
  ) : (
    <></>
  );

  const localTaxKeys = LOCAL_TAXES_BY_STATE[usState] ?? [];
  const localWithholdings = localTaxKeys
    .filter((key) => localTaxes[key])
    .map((key) => {
      const { paycheck, annual } = getLocalWithholding(
        key,
        taxableIncome_paycheck,
        taxableIncome_annual,
        paySchedule,
        PAY_SCHEDULE_TO_ANNUM[paySchedule],
      );
      const marginal = getLocalMarginalRate(
        key,
        taxableIncome_paycheck,
        paySchedule,
      );
      const effective =
        taxableIncome_annual > 0 ? annual / taxableIncome_annual : 0;
      return { key, paycheck, annual, marginal, effective };
    });
  const totalLocalWithholding_annual = localWithholdings.reduce(
    (sum, lw) => sum + lw.annual,
    0,
  );

  // used to remove tax rows in table with $0 contributions
  // [annual, paycheck, optional rates { marginal, effective }]
  const taxTableMap: { [key: string]: any } = {
    "Federal Withholding": [
      federalWithholding_annual,
      federalWithholding_paycheck,
      { marginal: federalMarginalRate, effective: federalEffectiveRate },
    ],
    [socialSecurity_key]: [
      socialSecurityWithholding_annual,
      socialSecurityWithholding_paycheck,
      { marginal: ficaMarginalRate, effective: ficaEffectiveRate },
    ],
    Medicare: [
      medicareWithholding_annual,
      medicareWithholding_paycheck,
      { marginal: medicareMarginalRate, effective: medicareEffectiveRate },
    ],
    [stateWithholding_key]: [
      stateWithholding_annual,
      stateWithholding_paycheck,
      stateIsEstimate
        ? { marginal: stateMarginalRate, effective: stateEffectiveRate }
        : undefined,
    ],
    ...Object.fromEntries(
      localWithholdings.map(
        ({ key, annual, paycheck, marginal, effective }) => [
          LOCAL_TAXES[key].name + " Withholding",
          [annual, paycheck, { marginal, effective }],
        ],
      ),
    ),
  };

  const netPay_annual =
    taxableIncome_annual -
    federalWithholding_annual -
    socialSecurityWithholding_annual -
    medicareWithholding_annual -
    stateWithholding_annual -
    totalLocalWithholding_annual;
  const netPay_paycheck = convertAnnualAmountToPaySchedule(
    netPay_annual,
    paySchedule,
  );

  // Post Tax, uses totalCompensation_annual for calculations instead of taxableIncome_annual
  const [r401kContribution, changeR401kContribution] = useState(0);
  const r401k_annual = calculateContributionFromPercentage(
    totalCompensation_annual,
    r401kContribution,
  );
  const r401k_paycheck = convertAnnualAmountToPaySchedule(
    r401k_annual,
    paySchedule,
  );

  // After tax 401k
  const [at401kContribution, changeAT401kContribution] = useState(0);
  const at401k_annual = calculateContributionFromPercentage(
    totalCompensation_annual,
    at401kContribution,
  );
  const at401k_paycheck = convertAnnualAmountToPaySchedule(
    at401k_annual,
    paySchedule,
  );

  const [rIRAContribution, changeRIRAContribution] = useState(0);
  const rIRA_annual = calculateContributionFromPercentage(
    totalCompensation_annual,
    rIRAContribution,
  );
  const rIRA_paycheck = convertAnnualAmountToPaySchedule(
    rIRA_annual,
    paySchedule,
  );

  // stock purchase plans which are usually percentages and after tax
  const [sppContribution, changeSPPContribution] = useState(0);
  const stockPurchasePlan_annual = calculateContributionFromPercentage(
    totalCompensation_annual,
    sppContribution,
  );
  const stockPurchasePlan_paycheck = convertAnnualAmountToPaySchedule(
    stockPurchasePlan_annual,
    paySchedule,
  );

  const [otherPostTaxContribution, changeOtherPostTaxContribution] =
    useState(0);
  const [
    otherPostTaxContributionFrequency,
    changeOtherPostTaxContributionFrequency,
  ] = useState(FREQUENCIES.PAYCHECK);
  const otherPostTax_annual = calculateAnnualFromAmountAndFrequency(
    otherPostTaxContribution,
    otherPostTaxContributionFrequency,
    paySchedule,
  );
  const otherPostTax_paycheck = convertAnnualAmountToPaySchedule(
    otherPostTax_annual,
    paySchedule,
  );

  // used to remove post tax rows in table with $0 contributions
  const postTaxTableMap: { [key: string]: any } = {
    "Roth 401k": [r401k_annual, r401k_paycheck],
    "After Tax 401k": [at401k_annual, at401k_paycheck],
    "Roth IRA": [rIRA_annual, rIRA_paycheck],
    "Stock Purchase Plan": [
      stockPurchasePlan_annual,
      stockPurchasePlan_paycheck,
    ],
    "Other Post-Tax": [otherPostTax_annual, otherPostTax_paycheck],
  };

  // if all post tax deductions are 0, dont render the section at all
  const shouldRenderPostTaxDeductions = !!Object.keys(postTaxTableMap).filter(
    (key) => postTaxTableMap[key][0] != 0,
  ).length;

  const sumOfPostTaxContributions_annual = Object.keys(postTaxTableMap).reduce(
    (prev, curr) => prev + postTaxTableMap[curr][0],
    0,
  );

  const takeHomePay_annual = netPay_annual - sumOfPostTaxContributions_annual;
  const takeHomePay_paycheck = convertAnnualAmountToPaySchedule(
    takeHomePay_annual,
    paySchedule,
  );

  // helper map for form fields with custom frequencies
  const customWithholdings: { [key: string]: any } = {
    "Medical Insurance": [
      medicalContribution,
      changeMedicalContribution,
      medicalContributionFrequency,
      changeMedicalContributionFrequency,
    ],
    "Commuter Benefits": [
      commuterContribution,
      changeCommuterContribution,
      commuterContributionFrequency,
      changeCommuterContributionFrequency,
    ],
    "HSA/FSA": [
      hsaContribution,
      changeHSAContribution,
      hsaContributionFrequency,
      changeHSAContributionFrequency,
    ],
    "Other Pre-Tax": [
      otherPreTaxContribution,
      changeOtherPreTaxContribution,
      otherPreTaxContributionFrequency,
      changeOtherPreTaxContributionFrequency,
    ],
    "Other Post-Tax": [
      otherPostTaxContribution,
      changeOtherPostTaxContribution,
      otherPostTaxContributionFrequency,
      changeOtherPostTaxContributionFrequency,
    ],
  };

  const update = (
    e: ChangeEvent<HTMLElement>,
    changeFunction: { (value: SetStateAction<any>): void },
  ) => {
    changeFunction((e.target as HTMLInputElement).value);
  };

  const updateAmount = (
    e: ChangeEvent<HTMLElement>,
    changeFunction: { (value: SetStateAction<any>): void },
  ) => {
    let value = parseFloat((e.target as HTMLInputElement).value);
    if (isNaN(value) || value < 0) {
      value = 0;
    } else if (value > 1000000000) {
      value = 1000000000;
    }
    changeFunction(value);
  };

  const updateContribution = (
    e: ChangeEvent<HTMLElement>,
    changeFunction: { (value: SetStateAction<any>): void },
  ) => {
    let value = parseInt((e.target as HTMLInputElement).value);
    if (isNaN(value) || value < 0) {
      value = 0;
    } else if (value > 90) {
      value = 90;
    }
    changeFunction(value);
  };

  const updateWithEventKey = (
    e: string | null,
    changeFunction: { (value: SetStateAction<any>): void },
  ) => {
    if (e) changeFunction(e);
    else console.log("Null event key");
  };

  return (
    <div className={styles.container}>
      <Header titleName="Paycheck Calculator" />

      <main className={styles.main}>
        <h1>Paycheck Calculator</h1>
        <p>
          Here we will estimate your take home pay (for {PAYROLL_LAST_UPDATED})!
        </p>
      </main>

      <div className={styles.content}>
        <Form className={styles.paycheckForm}>
          <Form.Label>Annual Salary</Form.Label>
          <InputGroup className="mb-3 w-100">
            <InputGroup.Text>$</InputGroup.Text>
            <Form.Control
              type="number"
              onWheel={(e) => e.currentTarget.blur()}
              value={formatStateValue(salary)}
              onChange={(e) => updateAmount(e, changeSalary)}
            />
          </InputGroup>

          <Form.Group className="mb-3">
            <Form.Label className={styles.inlineGroupFormLabel}>
              Annual Bonus
            </Form.Label>
            <div className={styles.inlineGroup}>
              <InputGroup className={styles.inlineChildren}>
                <InputGroup.Text>$</InputGroup.Text>
                <Form.Control
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  value={formatStateValue(bonus)}
                  onChange={(e) => updateAmount(e, changeBonus)}
                />
              </InputGroup>
              <InputGroup className={styles.inlineChildren}>
                <TooltipOnHover
                  text="Check if bonus is eligible for 401k and other contributions. If unchecked, bonus will be added at Taxable Income step."
                  nest={
                    <Form.Check
                      className={styles.width250px}
                      type="checkbox"
                      onChange={() => changeBonusEligible(!bonusEligible)}
                      label="Eligible For Contributions"
                      checked={bonusEligible}
                    />
                  }
                />
              </InputGroup>
            </div>
          </Form.Group>

          <Form.Group
            className="mb-3"
            onChange={(e) => update(e, changePaySchedule)}
          >
            <Form.Label> Paycheck Frequency </Form.Label>
            <br />
            <TooltipOnHover
              text="Every two weeks"
              nest={
                <Form.Check
                  inline
                  defaultChecked
                  label={PAY_SCHEDULE.BIWEEKLY}
                  value={PAY_SCHEDULE.BIWEEKLY}
                  name="paycheck_schedule"
                  type="radio"
                  id="paycheck-schedule-radio-1"
                />
              }
            />
            <TooltipOnHover
              text="Twice a month"
              nest={
                <Form.Check
                  inline
                  label={PAY_SCHEDULE.SEMIMONTHLY}
                  value={PAY_SCHEDULE.SEMIMONTHLY}
                  name="paycheck_schedule"
                  type="radio"
                  id="paycheck-schedule-radio-2"
                />
              }
            />
            <Form.Check
              inline
              label={PAY_SCHEDULE.MONTHLY}
              value={PAY_SCHEDULE.MONTHLY}
              name="paycheck_schedule"
              type="radio"
              id="paycheck-schedule-radio-3"
            />
          </Form.Group>

          <Form.Group
            className="mb-3"
            onChange={(e) => update(e, changeTaxClass)}
          >
            <Form.Label> Tax Filing Status </Form.Label>
            <br />
            <Form.Check
              inline
              label={TAX_CLASSES.SINGLE}
              value={TAX_CLASSES.SINGLE}
              defaultChecked
              name="tax_class"
              type="radio"
              id="tax-class-radio-1"
            />
            <Form.Check
              inline
              label={TAX_CLASSES.MARRIED_FILING_JOINTLY}
              value={TAX_CLASSES.MARRIED_FILING_JOINTLY}
              name="tax_class"
              type="radio"
              id="tax-class-radio-2"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <div
              className={styles.inlineGroup}
              style={{ alignItems: "flex-start" }}
            >
              <div className={styles.inlineChildren}>
                <Form.Label>US State Withholding</Form.Label>
                <DropdownButton
                  id="us-state-dropdown-button"
                  title={US_STATES_MAP[usState].name}
                  variant="secondary"
                  onSelect={(e) => {
                    updateWithEventKey(e, changeUSState);
                    setLocalTaxes({});
                  }}
                >
                  {Object.keys(US_STATES_MAP).map((key) => (
                    <Dropdown.Item eventKey={key} key={key}>
                      {key}
                    </Dropdown.Item>
                  ))}
                </DropdownButton>
              </div>
              {localTaxKeys.length > 0 && (
                <div className={styles.inlineChildren}>
                  <Form.Label>Local Tax</Form.Label>
                  {localTaxKeys.map((key) => {
                    const tax = LOCAL_TAXES[key];
                    const checkbox = (
                      <Form.Check
                        key={key}
                        type="checkbox"
                        label={tax.name}
                        checked={!!localTaxes[key]}
                        onChange={() =>
                          setLocalTaxes((prev) => ({
                            ...prev,
                            [key]: !prev[key],
                          }))
                        }
                      />
                    );
                    return tax.tooltip ? (
                      <TooltipOnHover
                        key={key}
                        text={tax.tooltip}
                        nest={checkbox}
                      />
                    ) : (
                      checkbox
                    );
                  })}
                </div>
              )}
            </div>
          </Form.Group>
          {stateTaxInvalidAlert}

          <Form.Group className="mb-3">
            <Form.Label className={styles.inlineGroupFormLabel}>
              401k Contribution
            </Form.Label>
            <div className={styles.inlineGroup}>
              <TooltipOnHover
                text="% of gross income between 0 and 90."
                nest={
                  <InputGroup className={styles.inlineChildren}>
                    <InputGroup.Text>Traditional:</InputGroup.Text>
                    <Form.Control
                      type="number"
                      onWheel={(e) => e.currentTarget.blur()}
                      value={formatStateValue(t401kContribution)}
                      onChange={(e) =>
                        updateContribution(e, changeT401kContribution)
                      }
                    />
                    <InputGroup.Text>%</InputGroup.Text>
                  </InputGroup>
                }
              />
              <TooltipOnHover
                text="% of gross income between 0 and 90."
                nest={
                  <InputGroup className={styles.inlineChildren}>
                    <InputGroup.Text>Roth:</InputGroup.Text>
                    <Form.Control
                      type="number"
                      onWheel={(e) => e.currentTarget.blur()}
                      value={formatStateValue(r401kContribution)}
                      onChange={(e) =>
                        updateContribution(e, changeR401kContribution)
                      }
                    />
                    <InputGroup.Text>%</InputGroup.Text>
                  </InputGroup>
                }
              />
              <TooltipOnHover
                text="% of gross income between 0 and 90. This is the Mega Backdoor Roth."
                nest={
                  <InputGroup className={styles.inlineChildren}>
                    <InputGroup.Text>After Tax:</InputGroup.Text>
                    <Form.Control
                      type="number"
                      onWheel={(e) => e.currentTarget.blur()}
                      value={formatStateValue(at401kContribution)}
                      onChange={(e) =>
                        updateContribution(e, changeAT401kContribution)
                      }
                    />
                    <InputGroup.Text>%</InputGroup.Text>
                  </InputGroup>
                }
              />
            </div>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className={styles.inlineGroupFormLabel}>
              IRA Contribution
            </Form.Label>
            <div className={styles.inlineGroup}>
              <TooltipOnHover
                text="% of gross income between 0 and 90."
                nest={
                  <InputGroup className={styles.inlineChildren}>
                    <InputGroup.Text>Traditional:</InputGroup.Text>
                    <Form.Control
                      type="number"
                      onWheel={(e) => e.currentTarget.blur()}
                      value={formatStateValue(tIRAContribution)}
                      onChange={(e) =>
                        updateContribution(e, changeTIRAContribution)
                      }
                    />
                    <InputGroup.Text>%</InputGroup.Text>
                  </InputGroup>
                }
              />
              <TooltipOnHover
                text="% of gross income between 0 and 90."
                nest={
                  <InputGroup className={styles.inlineChildren}>
                    <InputGroup.Text>Roth:</InputGroup.Text>
                    <Form.Control
                      type="number"
                      onWheel={(e) => e.currentTarget.blur()}
                      value={formatStateValue(rIRAContribution)}
                      onChange={(e) =>
                        updateContribution(e, changeRIRAContribution)
                      }
                    />
                    <InputGroup.Text>%</InputGroup.Text>
                  </InputGroup>
                }
              />
            </div>
          </Form.Group>

          <Form.Label>Stock Purchase Plan Contribution</Form.Label>
          <TooltipOnHover
            text="% of gross income between 0 and 90."
            nest={
              <InputGroup className="mb-3 w-100">
                <Form.Control
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  value={formatStateValue(sppContribution)}
                  onChange={(e) => updateContribution(e, changeSPPContribution)}
                />
                <InputGroup.Text>%</InputGroup.Text>
              </InputGroup>
            }
          />

          {Object.keys(customWithholdings).map((key) => (
            <div key={key}>
              <Form.Label>{key} Contribution</Form.Label>
              <InputGroup className="mb-3 w-100">
                <InputGroup.Text>$</InputGroup.Text>
                <Form.Control
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  value={formatStateValue(customWithholdings[key][0])}
                  onChange={(e) => updateAmount(e, customWithholdings[key][1])}
                />
                <InputGroup.Text>per</InputGroup.Text>
                <DropdownButton
                  variant="secondary"
                  title={customWithholdings[key][2]}
                  id={key.replace(" ", "-") + "-frequency-dropdown"}
                  onSelect={(e) =>
                    updateWithEventKey(e, customWithholdings[key][3])
                  }
                >
                  {ALL_FREQUENCIES.map((freq) => {
                    let frequencyValue =
                      FREQUENCIES[freq as keyof typeof FREQUENCIES];
                    return (
                      <Dropdown.Item
                        eventKey={frequencyValue}
                        key={frequencyValue}
                      >
                        {frequencyValue}
                      </Dropdown.Item>
                    );
                  })}
                </DropdownButton>
              </InputGroup>
            </div>
          ))}
        </Form>

        <div className={styles.table}>
          <Table hover responsive size="sm" className="mb-3">
            <thead>
              <tr>
                <th></th>
                <th>Annual</th>
                <th className={styles.specialTableHeaderWidth}>
                  Paycheck - {paySchedule}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={styles.thicc}>Gross Income</td>
                <td>{formatCurrency(totalCompensation_annual)}</td>
                <td>
                  {formatCurrency(
                    convertAnnualAmountToPaySchedule(
                      totalCompensation_annual,
                      paySchedule,
                    ),
                  )}
                </td>
              </tr>
              {shouldRenderPreTaxDeductions && (
                <>
                  <tr>
                    <td colSpan={4} className={styles.thicc}>
                      Pre-Tax Deductions
                    </td>
                  </tr>
                  {Object.keys(preTaxTableMap)
                    .filter((key) => preTaxTableMap[key][0] != 0)
                    .map((key) => (
                      <tr key={key}>
                        <td>{key}</td>
                        <td>{formatCurrency(-preTaxTableMap[key][0])}</td>
                        <td>{formatCurrency(-preTaxTableMap[key][1])}</td>
                      </tr>
                    ))}
                </>
              )}
              <tr>
                <td>Taxable Pay</td>
                <td>{formatCurrency(taxableIncome_annual)}</td>
                <td>{formatCurrency(taxableIncome_paycheck)}</td>
              </tr>
              <tr>
                <td colSpan={4} className={styles.thicc}>
                  Tax Withholdings
                </td>
              </tr>
              {Object.keys(taxTableMap)
                .filter((key) => taxTableMap[key][0] != 0)
                .map((key) => {
                  const rates = taxTableMap[key][2];
                  return (
                    <tr key={key}>
                      <td>
                        {key}
                        {rates && (
                          <small className="text-muted d-block">
                            Marginal: {formatTaxRate(rates.marginal)} &middot;{" "}
                            Effective: {formatTaxRate(rates.effective)}
                          </small>
                        )}
                      </td>
                      <td>{formatCurrency(-taxTableMap[key][0])}</td>
                      <td>{formatCurrency(-taxTableMap[key][1])}</td>
                    </tr>
                  );
                })}
              <tr>
                <td>Net Pay</td>
                <td>{formatCurrency(netPay_annual)}</td>
                <td>{formatCurrency(netPay_paycheck)}</td>
              </tr>
              {shouldRenderPostTaxDeductions && (
                <>
                  <tr>
                    <td colSpan={4} className={styles.thicc}>
                      Post-Tax Deductions
                    </td>
                  </tr>
                  {Object.keys(postTaxTableMap)
                    .filter((key) => postTaxTableMap[key][0] != 0)
                    .map((key) => (
                      <tr key={key}>
                        <td>{key}</td>
                        <td>{formatCurrency(-postTaxTableMap[key][0])}</td>
                        <td>{formatCurrency(-postTaxTableMap[key][1])}</td>
                      </tr>
                    ))}
                </>
              )}
              <tr>
                <td className={styles.thicc}>Take Home Pay</td>
                <td>{formatCurrency(takeHomePay_annual)}</td>
                <td>{formatCurrency(takeHomePay_paycheck)}</td>
              </tr>
              {isSocialSecurityMaxed && (
                <tr>
                  <td>
                    Take Home Pay after maxing Social Security
                    {socialSecurityMaxedIcon}
                  </td>
                  <td></td>
                  <td>
                    {formatCurrency(
                      takeHomePay_paycheck + socialSecurityWithholding_paycheck,
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
          {socialSecurityMaxedAlertTableFooter}
          {stateEstimateTableFooter}
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default Paycheck;
