import React, { useState, useMemo } from "react";
import { Alert, Form, FormGroup, InputGroup, Table } from "react-bootstrap";
import { Header, Footer, TooltipOnHover } from "../src/components";
import {
  formatCurrency,
  formatPercent,
  formatStateValue,
  RetirementTable,
  RetirementTableRow,
  RetirementTableStrategy,
} from "../src/utils";
import {
  _401k_maximum_contribution_individual,
  _401k_maximum_contribution_total,
} from "../src/utils/constants";
import styles from "../styles/Retirement.module.scss";
import { FinanceState, PreferencesState } from "../src/utils/types";

const payPeriodAlreadyPassedIcon = "\u203E"; // overline
const payPeriodAlreadyPassedText =
  payPeriodAlreadyPassedIcon + " Pay period has already passed";
const maxNotReachedIcon = "\u2020"; // dagger
const _401kMaxNotReachedNote =
  maxNotReachedIcon +
  " If your employer limits your 401k contribution, bump the last contribution up in order to max your 401k.";
const _401kMaxReachedWithAutoCapNote =
  maxNotReachedIcon +
  " Since your employer limits your 401k contribution, this last contribution should max your contributions.";
const maxReachedEarlyIcon = "\u2021"; // double dagger
const _401kMaxReachedEarlyNote =
  maxReachedEarlyIcon +
  " You will reach your maximum contribution early even with minimum matching available. Future contributions for the year will not be possible if your employer limits your contributions";

/**
 * Future Goals
 * 1. New inputs: Bonus, Bonus paycheck, new salary (raise) and which paycheck, company match, mega backdoor availability
 * 2. different frontloading strategies inc company match and 401k true limit
 * a. max, then match. (current) b. flat amount. c. pure max and ignore match
 * 3. cost analysis with fv assumption for each strategy
 */

function RetirementSavings() {
  const [finance, setFinance] = useState<FinanceState>({
    salary: 60000,
    max401kIndividualAmount: _401k_maximum_contribution_individual,
    max401kTotalAmount: _401k_maximum_contribution_total,
    numberOfPayPeriods: 24,
    numberOfPayPeriodsSoFar: 0,
    individualContributionAmountSoFar: 0,
    employerContributionAmountSoFar: 0,
    individualContributionAfterTaxAmountSoFar: 0,
    minIndividualContributionPercent: 6,
    maxContributionPercent: 90,
    employerMatchBasePercent: 0,
    employerMatchPercent: 0,
    employerMatchUpToPercent: 6,
  });

  const [preferences, setPreferences] = useState<PreferencesState>({
    automaticallyCap401k: false,
    contributionStrategy: RetirementTableStrategy.FRONTLOAD,
    addExistingContributions: false,
    update401kLimits: false,
    showEmployerMatch: false,
    showMegaBackdoor: false,
  });

  const table = useMemo(
    () =>
      new RetirementTable({
        ...finance,
        payPeriodAlreadyPassedIcon: "\u203E",
        maxNotReachedIcon: "\u2020",
        maxReachedEarlyIcon: "\u2021",
        ...preferences,
      }),
    [finance, preferences]
  );

  const setFinanceValue = (key: string, value: number) => {
    setFinance((prev) => ({ ...prev, [key]: value }));
  };

  const setPreferenceValue = (
    key: string,
    value: boolean | RetirementTableStrategy
  ) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
  };

  const updateAmount = (
    e: React.FormEvent<HTMLElement>,
    key: string,
    min: number = 0,
    max: number = 1000000000
  ) => {
    let value = parseFloat((e.target as HTMLInputElement).value);
    if (isNaN(value) || value < min) {
      value = min;
    } else if (value > max) {
      value = max;
    }
    if (
      key === "numberOfPayPeriods" &&
      value <= finance.numberOfPayPeriodsSoFar
    ) {
      setFinanceValue("numberOfPayPeriodsSoFar", value - 1);
      if (value === 1) {
        setAmountsSoFarToZero();
      }
    }
    if (key === "numberOfPayPeriodsSoFar") {
      if (value === 0) {
        setAmountsSoFarToZero();
      }
    }
    setFinanceValue(key, value);
  };

  const updateContribution = (
    e: React.FormEvent<HTMLElement>,
    key: string,
    min: number = 0,
    max: number = 100,
    allowDecimal: boolean = false
  ) => {
    const inputValue = (e.target as HTMLInputElement).value;
    let value = allowDecimal
      ? Math.round(parseFloat(inputValue) * 100) / 100
      : parseInt(inputValue);
    if (isNaN(value) || value < min) {
      value = min;
    } else if (value > max) {
      value = max;
    }
    setFinanceValue(key, value);
  };

  const updateToggle = (e: React.FormEvent<HTMLElement>, key: string) => {
    setPreferenceValue(key, (e.target as HTMLInputElement).checked);
  };

  const alerts: { [key: string]: boolean } = {
    payPeriodAlreadyPassed: finance.numberOfPayPeriodsSoFar > 0,
    _401kMaxReachedEarly: table.maxReachedEarly,
    _401kMaxNotReached: table.maxNotReached,
    _401kMaxReachedWithAutoCap: table.maxReachedWithAutomaticCap,
  };

  const alertMessages: { [key: string]: string } = {
    payPeriodAlreadyPassed: payPeriodAlreadyPassedText,
    _401kMaxReachedEarly: _401kMaxReachedEarlyNote,
    _401kMaxNotReached: _401kMaxNotReachedNote,
    _401kMaxReachedWithAutoCap: _401kMaxReachedWithAutoCapNote,
  };

  const generatedAlerts = Object.keys(alerts).reduce(
    (acc: { [key: string]: JSX.Element }, alertKey) => {
      if (alerts[alertKey]) {
        acc[alertKey] = (
          <Alert className="mb-3" variant="secondary">
            {alertMessages[alertKey]}
          </Alert>
        );
      }
      return acc;
    },
    {}
  );

  const setAmountsSoFarToZero = () => {
    setFinanceValue("individualContributionAmountSoFar", 0);
    setFinanceValue("employerContributionAmountSoFar", 0);
    setFinanceValue("individualContributionAfterTaxAmountSoFar", 0);
  };

  const set401kLimitsToDefault = () => {
    setFinanceValue(
      "max401kIndividualAmount",
      _401k_maximum_contribution_individual
    );
    setFinanceValue("max401kTotalAmount", _401k_maximum_contribution_total);
  };

  const setEmployerMatchToDefault = () => {
    setFinanceValue("employerMatchBasePercent", 0);
    setFinanceValue("changeEmployerMatchPercent", 0);
  };

  return (
    <div className={styles.container}>
      <Header titleName="401k Frontload" />

      <main className={styles.main}>
        <h1>401k Frontloader</h1>
        <p>
          Maximize your 401k contributions by frontloading while ensuring
          minimum contributions throughout the year.
        </p>
      </main>

      <div className={styles.content}>
        <Form className={styles.form}>
          <Form.Label>Contribution Strategy</Form.Label>
          <InputGroup className="mb-3 w-100">
            <Form.Select
              onChange={(e) =>
                setPreferenceValue(
                  "contributionStrategy",
                  e.target.value as RetirementTableStrategy
                )
              }
            >
              <option key="frontload">
                {RetirementTableStrategy.FRONTLOAD}
              </option>
              <option key="equal">{RetirementTableStrategy.EQUAL}</option>
            </Form.Select>
          </InputGroup>

          <Form.Label>Annual Salary</Form.Label>
          <InputGroup className="mb-3 w-100">
            <InputGroup.Text>$</InputGroup.Text>
            <Form.Control
              type="number"
              onWheel={(e) => e.currentTarget.blur()}
              value={formatStateValue(finance.salary)}
              onChange={(e) => updateAmount(e, "salary")}
            />
          </InputGroup>

          <Form.Label>Number of Pay Periods this Year</Form.Label>
          <InputGroup className="mb-3 w-100">
            <Form.Control
              type="number"
              onWheel={(e) => e.currentTarget.blur()}
              value={formatStateValue(finance.numberOfPayPeriods)}
              onChange={(e) => updateAmount(e, "numberOfPayPeriods", 1, 260)}
            />
          </InputGroup>

          <Form.Label>Minimum Desired Paycheck Contribution</Form.Label>
          <TooltipOnHover
            text="% of income between 0 and 100. Set this to ensure your employer will match your contributions if they calculate the match based on each pay period instead of the whole year."
            nest={
              <InputGroup className="mb-3 w-100">
                <Form.Control
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  value={formatStateValue(
                    finance.minIndividualContributionPercent
                  )}
                  onChange={(e) =>
                    updateContribution(
                      e,
                      "minIndividualContributionPercent",
                      0,
                      100
                    )
                  }
                />
                <InputGroup.Text>%</InputGroup.Text>
              </InputGroup>
            }
          />

          <Form.Label>Maximum Paycheck Contribution</Form.Label>
          <TooltipOnHover
            text="% of income between 0 and 100. This is the maximum amount you are comfortable or allowed to contribute."
            nest={
              <InputGroup className="mb-3 w-100">
                <Form.Control
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  value={formatStateValue(finance.maxContributionPercent)}
                  onChange={(e) =>
                    updateContribution(e, "maxContributionPercent")
                  }
                />
                <InputGroup.Text>%</InputGroup.Text>
              </InputGroup>
            }
          />

          <TooltipOnHover
            text="Check this if your 401k automatically limits individual contributions."
            nest={
              <InputGroup className={styles.checkbox}>
                <Form.Check
                  type="checkbox"
                  onChange={(e) => updateToggle(e, "automaticallyCap401k")}
                  label="401k Limits Contributions"
                  checked={preferences.automaticallyCap401k}
                />
              </InputGroup>
            }
          />

          <TooltipOnHover
            text="Check this to add contributions in past pay periods in the year."
            nest={
              <InputGroup className={styles.checkbox}>
                <Form.Check
                  type="checkbox"
                  onChange={(e) => updateToggle(e, "addExistingContributions")}
                  label="Add Existing Contributions"
                  checked={preferences.addExistingContributions}
                />
              </InputGroup>
            }
          />
          {preferences.addExistingContributions && (
            <FormGroup>
              <Form.Label>Number of Pay Periods So Far</Form.Label>
              <InputGroup className="mb-3 w-100">
                <Form.Control
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  value={formatStateValue(finance.numberOfPayPeriodsSoFar)}
                  onChange={(e) =>
                    updateAmount(
                      e,
                      "numberOfPayPeriodsSoFar",
                      0,
                      finance.numberOfPayPeriods - 1
                    )
                  }
                />
              </InputGroup>

              <Form.Label>Amount Contributed to 401k So Far</Form.Label>
              <InputGroup className="mb-3 w-100">
                <InputGroup.Text>$</InputGroup.Text>
                <Form.Control
                  disabled={finance.numberOfPayPeriodsSoFar === 0}
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  value={formatStateValue(
                    finance.individualContributionAmountSoFar
                  )}
                  onChange={(e) =>
                    updateAmount(
                      e,
                      "individualContributionAmountSoFar",
                      0,
                      finance.max401kIndividualAmount
                    )
                  }
                />
              </InputGroup>
            </FormGroup>
          )}

          <TooltipOnHover
            text="This tool does not limit employer contributions to the total 401k limit."
            nest={
              <InputGroup className={styles.checkbox}>
                <Form.Check
                  type="checkbox"
                  onChange={(e) => updateToggle(e, "showEmployerMatch")}
                  label="Employer Contributions"
                  checked={preferences.showEmployerMatch}
                />
              </InputGroup>
            }
          />
          {preferences.showEmployerMatch && (
            <FormGroup>
              {preferences.addExistingContributions && (
                <>
                  <Form.Label>Employer Contributions So Far</Form.Label>
                  <InputGroup className="mb-3 w-100">
                    <InputGroup.Text>$</InputGroup.Text>
                    <Form.Control
                      disabled={finance.numberOfPayPeriodsSoFar === 0}
                      type="number"
                      onWheel={(e) => e.currentTarget.blur()}
                      value={formatStateValue(
                        finance.employerContributionAmountSoFar
                      )}
                      onChange={(e) =>
                        updateAmount(
                          e,
                          "employerContributionAmountSoFar",
                          0,
                          finance.max401kTotalAmount -
                            finance.max401kIndividualAmount
                        )
                      }
                    />
                  </InputGroup>
                </>
              )}

              <Form.Label>Employer 401k Base Contribution</Form.Label>
              <TooltipOnHover
                text="This is how much your employer contributes regardless of your contributions."
                nest={
                  <InputGroup className="mb-3 w-100">
                    <Form.Control
                      type="number"
                      onWheel={(e) => e.currentTarget.blur()}
                      value={formatStateValue(finance.employerMatchBasePercent)}
                      onChange={(e) =>
                        updateContribution(
                          e,
                          "employerMatchBasePercent",
                          0,
                          100,
                          true
                        )
                      }
                    />
                    <InputGroup.Text>%</InputGroup.Text>
                  </InputGroup>
                }
              />
              <Form.Label className={styles.inlineGroupFormLabel}>
                Employer 401k Match
              </Form.Label>
              <TooltipOnHover
                text="This is how much your employer contributes dependent on your contributions."
                nest={
                  <div className={styles.inlineGroup}>
                    <InputGroup className={styles.inlineChildren}>
                      <Form.Control
                        type="number"
                        onWheel={(e) => e.currentTarget.blur()}
                        value={formatStateValue(finance.employerMatchPercent)}
                        onChange={(e) =>
                          updateContribution(
                            e,
                            "employerMatchPercent",
                            0,
                            500,
                            true
                          )
                        }
                      />
                      <InputGroup.Text>%</InputGroup.Text>
                    </InputGroup>
                    <p className="styles."> Up To </p>
                    <InputGroup className={styles.inlineChildren}>
                      <Form.Control
                        type="number"
                        onWheel={(e) => e.currentTarget.blur()}
                        value={formatStateValue(
                          finance.employerMatchUpToPercent
                        )}
                        onChange={(e) =>
                          updateContribution(
                            e,
                            "employerMatchUpToPercent",
                            0,
                            100,
                            true
                          )
                        }
                      />
                      <InputGroup.Text>%</InputGroup.Text>
                    </InputGroup>
                  </div>
                }
              />
            </FormGroup>
          )}

          <TooltipOnHover
            text="A.K.A. Mega Backdoor Roth. This tool assumes your plan cannot limit this amount and may round down the after-tax contribution. This tool will prioritize individual over after-tax contributions."
            nest={
              <InputGroup className={styles.checkbox}>
                <Form.Check
                  type="checkbox"
                  onChange={(e) => updateToggle(e, "showMegaBackdoor")}
                  label="Show After-Tax 401k"
                  checked={preferences.showMegaBackdoor}
                />
              </InputGroup>
            }
          />
          {preferences.addExistingContributions &&
            preferences.showMegaBackdoor && (
              <>
                <Form.Label>After-Tax Contributions So Far</Form.Label>
                <InputGroup className="mb-3 w-100">
                  <InputGroup.Text>$</InputGroup.Text>
                  <Form.Control
                    disabled={finance.numberOfPayPeriodsSoFar === 0}
                    type="number"
                    onWheel={(e) => e.currentTarget.blur()}
                    value={formatStateValue(
                      finance.individualContributionAfterTaxAmountSoFar
                    )}
                    onChange={(e) =>
                      updateAmount(
                        e,
                        "individualContributionAfterTaxAmountSoFar",
                        0,
                        table.maxAfterTaxAmount
                      )
                    }
                  />
                </InputGroup>
              </>
            )}
          {preferences.showMegaBackdoor && (
            <>
              <Form.Label>Estimated Maximum Employer Contribution</Form.Label>
              <InputGroup className="mb-3 w-100">
                <InputGroup.Text>$</InputGroup.Text>
                <Form.Control
                  disabled={true}
                  type="number"
                  value={table.maxEmployerAmount}
                />
              </InputGroup>
              <Form.Label>Maximum After-Tax Contribution</Form.Label>
              <TooltipOnHover
                text={`This is the result of (Total - Individual - Employer) Contribution Maximums = ${finance.max401kTotalAmount} - ${finance.max401kIndividualAmount} - ${table.maxEmployerAmount}.`}
                nest={
                  <InputGroup className="mb-3 w-100">
                    <InputGroup.Text>$</InputGroup.Text>
                    <Form.Control
                      disabled={true}
                      type="number"
                      onWheel={(e) => e.currentTarget.blur()}
                      value={table.maxAfterTaxAmount}
                    />
                  </InputGroup>
                }
              />
            </>
          )}

          <InputGroup className={styles.checkbox}>
            <Form.Check
              type="checkbox"
              onChange={(e) => updateToggle(e, "update401kLimits")}
              label="Update 401k Limits"
              checked={preferences.update401kLimits}
            />
          </InputGroup>
          {preferences.update401kLimits && (
            <>
              <Form.Label>401k Maximum for Individual Contribution</Form.Label>
              <TooltipOnHover
                text="The maximum in 2023 is $22,500."
                nest={
                  <InputGroup className="mb-3 w-100">
                    <InputGroup.Text>$</InputGroup.Text>
                    <Form.Control
                      type="number"
                      onWheel={(e) => e.currentTarget.blur()}
                      value={formatStateValue(finance.max401kIndividualAmount)}
                      onChange={(e) =>
                        updateAmount(e, "max401kIndividualAmount")
                      }
                    />
                  </InputGroup>
                }
              />
            </>
          )}
          {preferences.update401kLimits && preferences.showMegaBackdoor && (
            <>
              <Form.Label>401k Total Maximum</Form.Label>
              <TooltipOnHover
                text="The maximum in 2023 is $66,000."
                nest={
                  <InputGroup className="mb-3 w-100">
                    <InputGroup.Text>$</InputGroup.Text>
                    <Form.Control
                      type="number"
                      onWheel={(e) => e.currentTarget.blur()}
                      value={formatStateValue(finance.max401kTotalAmount)}
                      onChange={(e) => updateAmount(e, "max401kTotalAmount")}
                    />
                  </InputGroup>
                }
              />
            </>
          )}
        </Form>

        <div className={styles.table}>
          <Table hover responsive size="sm" className="mb-3">
            <thead>
              <tr>
                <th>Pay Period</th>
                <th>Gross Pay ($)</th>
                <th>Contribution (%)</th>
                <th>Contribution ($)</th>
                {preferences.showEmployerMatch && (
                  <th> Employer Contribution ($) </th>
                )}
                {preferences.showMegaBackdoor && (
                  <th> After-Tax Contribution (%) </th>
                )}
                {preferences.showMegaBackdoor && (
                  <th> After-Tax Contribution ($) </th>
                )}
                <th>Cumulative ($)</th>
              </tr>
            </thead>
            <tbody>
              {table.getTable().map((row: RetirementTableRow) => (
                <tr key={row.rowKey}>
                  <td className={styles.thicc}>{row.rowKey}</td>
                  <td>{formatCurrency(row.payPerPayPeriod)}</td>
                  <td>{formatPercent(row.contributionFraction)}</td>
                  <td>{formatCurrency(row.contributionAmount)}</td>
                  {preferences.showEmployerMatch && (
                    <td>{formatCurrency(row.employerAmount)}</td>
                  )}
                  {preferences.showMegaBackdoor && (
                    <td>{formatPercent(row.afterTaxPercent)}</td>
                  )}
                  {preferences.showMegaBackdoor && (
                    <td>{formatCurrency(row.afterTaxAmount)}</td>
                  )}
                  <td>{formatCurrency(row.cumulativeAmountTotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Total</td>
                <td>{formatCurrency(table.salaryRemaining)}</td>
                <td></td>
                <td>
                  {formatCurrency(
                    table.getTable()[finance.numberOfPayPeriods - 1]
                      .cumulativeIndividualAmount
                  )}
                </td>
                {preferences.showEmployerMatch && (
                  <td>
                    {formatCurrency(
                      table.getTable()[finance.numberOfPayPeriods - 1]
                        .cumulativeEmployerAmount
                    )}
                  </td>
                )}
                {preferences.showMegaBackdoor && <td></td>}
                {preferences.showMegaBackdoor && (
                  <td>
                    {formatCurrency(
                      table.getTable()[finance.numberOfPayPeriods - 1]
                        .cumulativeAfterTaxAmount
                    )}
                  </td>
                )}
                <td>
                  {formatCurrency(
                    table.getTable()[finance.numberOfPayPeriods - 1]
                      .cumulativeAmountTotal
                  )}
                </td>
              </tr>
            </tfoot>
          </Table>
          {Object.values(generatedAlerts).map((alert, index) => (
            <React.Fragment key={index}>{alert}</React.Fragment>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default RetirementSavings;
