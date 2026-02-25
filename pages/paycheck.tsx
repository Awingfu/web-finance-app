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
  ALL_FREQUENCIES,
  PAY_SCHEDULE,
} from "../src/utils/constants";
import {
  US_STATES_MAP,
  formatCurrency,
  formatStateValue,
  LOCAL_TAXES,
} from "../src/utils";
import { PAYROLL_LAST_UPDATED } from "../src/utils/withholdings_federal";
import { computePaycheck, formatTaxRate } from "../src/utils/paycheck_utils";

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

function Paycheck() {
  // Form States
  const [salary, changeSalary] = useState(60000);
  const [bonus, changeBonus] = useState(0);
  const [bonusEligible, changeBonusEligible] = useState(false);

  const [paySchedule, changePaySchedule] = useState(PAY_SCHEDULE.BIWEEKLY);
  const [taxClass, changeTaxClass] = useState(TAX_CLASSES.SINGLE);
  const [usState, changeUSState] = useState(US_STATES_MAP["None"].abbreviation);
  const [localTaxes, setLocalTaxes] = useState<Record<string, boolean>>({});

  // Pre Tax
  const [t401kContribution, changeT401kContribution] = useState(0);
  const [tIRAContribution, changeTIRAContribution] = useState(0);

  const [medicalContribution, changeMedicalContribution] = useState(0);
  const [medicalContributionFrequency, changeMedicalContributionFrequency] =
    useState(FREQUENCIES.PAYCHECK);

  const [commuterContribution, changeCommuterContribution] = useState(0);
  const [commuterContributionFrequency, changeCommuterContributionFrequency] =
    useState(FREQUENCIES.PAYCHECK);

  const [hsaContribution, changeHSAContribution] = useState(0);
  const [hsaContributionFrequency, changeHSAContributionFrequency] = useState(
    FREQUENCIES.PAYCHECK,
  );

  const [otherPreTaxContribution, changeOtherPreTaxContribution] = useState(0);
  const [
    otherPreTaxContributionFrequency,
    changeOtherPreTaxContributionFrequency,
  ] = useState(FREQUENCIES.PAYCHECK);

  // Post Tax
  const [r401kContribution, changeR401kContribution] = useState(0);
  const [at401kContribution, changeAT401kContribution] = useState(0);
  const [rIRAContribution, changeRIRAContribution] = useState(0);
  const [sppContribution, changeSPPContribution] = useState(0);

  const [otherPostTaxContribution, changeOtherPostTaxContribution] =
    useState(0);
  const [
    otherPostTaxContributionFrequency,
    changeOtherPostTaxContributionFrequency,
  ] = useState(FREQUENCIES.PAYCHECK);

  // Derived calculations
  const results = computePaycheck({
    salary,
    bonus,
    bonusEligible,
    paySchedule,
    taxClass,
    usState,
    localTaxes,
    t401kContribution,
    tIRAContribution,
    medicalContribution,
    medicalContributionFrequency,
    commuterContribution,
    commuterContributionFrequency,
    hsaContribution,
    hsaContributionFrequency,
    otherPreTaxContribution,
    otherPreTaxContributionFrequency,
    r401kContribution,
    at401kContribution,
    rIRAContribution,
    sppContribution,
    otherPostTaxContribution,
    otherPostTaxContributionFrequency,
  });

  // JSX alerts constructed from results data
  const stateTaxInvalidAlert = results.stateIsUnknown ? (
    <Alert className="mb-3" variant="danger">
      {US_STATES_MAP[usState].name} State Tax Withholding has not been defined!
      Assuming $0.
    </Alert>
  ) : (
    <></>
  );

  const stateEstimateTableFooter = results.stateIsEstimate ? (
    <Alert className="mb-3" variant="secondary">
      {results.stateEstimateIcon} State withholding may be estimated using
      income tax brackets and standard deduction. See the FAQ for details.
    </Alert>
  ) : (
    <></>
  );

  const socialSecurityMaxedAlertTableFooter = results.isSocialSecurityMaxed ? (
    <Alert className="mb-3" variant="secondary">
      {results.socialSecurityMaxedNote}
    </Alert>
  ) : (
    <></>
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
              {results.localTaxKeys.length > 0 && (
                <div className={styles.inlineChildren}>
                  <Form.Label>Local Tax</Form.Label>
                  {results.localTaxKeys.map((key) => {
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
                <td>{formatCurrency(results.totalCompensation_annual)}</td>
                <td>{formatCurrency(results.totalCompensation_paycheck)}</td>
              </tr>
              {results.shouldRenderPreTaxDeductions && (
                <>
                  <tr>
                    <td colSpan={4} className={styles.thicc}>
                      Pre-Tax Deductions
                    </td>
                  </tr>
                  {Object.keys(results.preTaxTableMap)
                    .filter((key) => results.preTaxTableMap[key][0] != 0)
                    .map((key) => (
                      <tr key={key}>
                        <td>{key}</td>
                        <td>
                          {formatCurrency(-results.preTaxTableMap[key][0])}
                        </td>
                        <td>
                          {formatCurrency(-results.preTaxTableMap[key][1])}
                        </td>
                      </tr>
                    ))}
                </>
              )}
              <tr>
                <td>Taxable Pay</td>
                <td>{formatCurrency(results.taxableIncome_annual)}</td>
                <td>{formatCurrency(results.taxableIncome_paycheck)}</td>
              </tr>
              <tr>
                <td colSpan={4} className={styles.thicc}>
                  Tax Withholdings
                </td>
              </tr>
              {Object.keys(results.taxTableMap)
                .filter((key) => results.taxTableMap[key][0] != 0)
                .map((key) => {
                  const rates = results.taxTableMap[key][2];
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
                      <td>{formatCurrency(-results.taxTableMap[key][0])}</td>
                      <td>{formatCurrency(-results.taxTableMap[key][1])}</td>
                    </tr>
                  );
                })}
              <tr>
                <td>Net Pay</td>
                <td>{formatCurrency(results.netPay_annual)}</td>
                <td>{formatCurrency(results.netPay_paycheck)}</td>
              </tr>
              {results.shouldRenderPostTaxDeductions && (
                <>
                  <tr>
                    <td colSpan={4} className={styles.thicc}>
                      Post-Tax Deductions
                    </td>
                  </tr>
                  {Object.keys(results.postTaxTableMap)
                    .filter((key) => results.postTaxTableMap[key][0] != 0)
                    .map((key) => (
                      <tr key={key}>
                        <td>{key}</td>
                        <td>
                          {formatCurrency(-results.postTaxTableMap[key][0])}
                        </td>
                        <td>
                          {formatCurrency(-results.postTaxTableMap[key][1])}
                        </td>
                      </tr>
                    ))}
                </>
              )}
              <tr>
                <td className={styles.thicc}>Take Home Pay</td>
                <td>{formatCurrency(results.takeHomePay_annual)}</td>
                <td>{formatCurrency(results.takeHomePay_paycheck)}</td>
              </tr>
              {results.isSocialSecurityMaxed && (
                <tr>
                  <td>
                    Take Home Pay after maxing Social Security
                    {results.socialSecurityMaxedIcon}
                  </td>
                  <td></td>
                  <td>
                    {formatCurrency(
                      results.takeHomePay_paycheck +
                        results.socialSecurityWithholding_paycheck,
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
