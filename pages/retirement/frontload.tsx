import React from "react";
import { Alert, Form, FormGroup, InputGroup, Table } from "react-bootstrap";
import { Header, Footer, TooltipOnHover } from "../../src/components";
import {
  formatCurrency,
  formatPercent,
  formatStateValue,
  RetirementTable,
  RetirementTableRow,
} from "../../src/utils";
import {
  _401k_maximum_contribution_individual,
  _401k_maximum_contribution_total,
} from "../../src/utils/constants";
import styles from "../../styles/Retirement.module.scss";

/**
 * Future Goals
 * 1. New inputs: Bonus, Bonus paycheck, new salary (raise) and which paycheck, company match, mega backdoor availability
 * 2. different frontloading strategies inc company match and 401k true limit
 * a. max, then match. (current) b. flat amount. c. pure max and ignore match
 * 3. cost analysis with fv assumption for each strategy
 */

function Frontload() {
  const [salary, changeSalary] = React.useState(60000);
  const [max401kIndividualAmount, changeMax401kIndividualAmount] =
    React.useState(_401k_maximum_contribution_individual);
  const [max401kTotalAmount, changeMax401kTotalAmount] = React.useState(
    _401k_maximum_contribution_total
  );
  const [numberOfPayPeriods, changeNumberOfPayPeriods] = React.useState(24);
  const [numberOfPayPeriodsSoFar, changeNumberOfPayPeriodsSoFar] =
    React.useState(0);
  const [
    individualContributionAmountSoFar,
    changeIndividualContributionAmountSoFar,
  ] = React.useState(0);
  const [
    employerContributionAmountSoFar,
    changeEmployerContributionAmountSoFar,
  ] = React.useState(0);
  const [
    individualContributionAfterTaxAmountSoFar,
    changeIndividualContributionAfterTaxAmountSoFar,
  ] = React.useState(0);
  // make sure to divide minIndividualContributionPercent, maxContributionPercent, employerMatchPercent by 100 to get percentage
  const [
    minIndividualContributionPercent,
    changeMinIndividualContributionPercent,
  ] = React.useState(6);
  const [maxContributionPercent, changeMaxContributionPercent] =
    React.useState(90);
  const [employerMatchBasePercent, changeEmployerMatchBasePercent] =
    React.useState(0);
  const [employerMatchPercent, changeEmployerMatchPercent] = React.useState(0);
  const [employerMatchUpToPercent, changeEmployerMatchUpToPercent] =
    React.useState(6);

  // customization options
  const [automaticallyCap401k, toggleAutomaticallyCap401k] =
    React.useState(false);
  // TODO; add this toggle then update retirement table logic
  const [prioritizeMegaBackdoor, togglePrioritizeMegaBackdoor] =
    React.useState(false);

  // form options
  const [addExistingContributions, toggleAddExistingContributions] =
    React.useState(false);
  const [update401kLimits, toggleUpdate401kLimits] = React.useState(false);
  const [showEmployerMatch, toggleShowEmployerMatch] = React.useState(false);
  const [showMegaBackdoor, toggleShowMegaBackdoor] = React.useState(false);

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

  let payPeriodAlreadyPassedAlertHTML = <></>;
  let _401kMaxNotReachedAlertHTML = <></>;
  let _401kMaxReachedWithAutoCapAlertHTML = <></>;
  let _401kMaxReachedEarlyAlertHTML = <></>;

  const table = new RetirementTable(
    salary,
    numberOfPayPeriods,
    numberOfPayPeriodsSoFar,
    individualContributionAmountSoFar,
    employerContributionAmountSoFar,
    individualContributionAfterTaxAmountSoFar,
    max401kIndividualAmount,
    max401kTotalAmount,
    minIndividualContributionPercent,
    maxContributionPercent,
    employerMatchBasePercent,
    employerMatchPercent,
    employerMatchUpToPercent,
    payPeriodAlreadyPassedIcon,
    maxNotReachedIcon,
    maxReachedEarlyIcon,
    automaticallyCap401k,
    showMegaBackdoor,
    prioritizeMegaBackdoor
  );

  if (numberOfPayPeriodsSoFar > 0) {
    payPeriodAlreadyPassedAlertHTML = (
      <Alert className="mb-3" variant="secondary">
        {payPeriodAlreadyPassedText}
      </Alert>
    );
  }

  if (table.maxReachedEarly) {
    _401kMaxReachedEarlyAlertHTML = (
      <Alert className="mb-3" variant="secondary">
        {_401kMaxReachedEarlyNote}
      </Alert>
    );
  }

  if (table.maxNotReached) {
    _401kMaxNotReachedAlertHTML = (
      <Alert className="mb-3" variant="secondary">
        {_401kMaxNotReachedNote}
      </Alert>
    );
  }

  if (table.maxReachedWithAutomaticCap) {
    _401kMaxReachedWithAutoCapAlertHTML = (
      <Alert className="mb-3" variant="secondary">
        {_401kMaxReachedWithAutoCapNote}
      </Alert>
    );
  }

  /**
   * @param e event handler
   * @param changeFunction change function that updates float values
   * @param min if event value is NaN or less than min, set to min
   * @param max if event value is greater than max, set to max
   * If changeFunction is changeNumber of PayPeriods,
   * ensure payPeriodsSoFar is less.
   * If payPeriodsSoFar is 0, set contribution amounts so far to 0
   */
  const updateAmount = (
    e: React.FormEvent<HTMLElement>,
    changeFunction: { (value: React.SetStateAction<any>): void },
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
      changeFunction === changeNumberOfPayPeriods &&
      value <= numberOfPayPeriodsSoFar
    ) {
      changeNumberOfPayPeriodsSoFar(value - 1);
      if (value === 1) {
        setAmountsSoFarToZero();
      }
    }
    if (changeFunction === changeNumberOfPayPeriodsSoFar) {
      if (value === 0) {
        setAmountsSoFarToZero();
      }
    }
    changeFunction(value);
  };

  const updateToggle = (
    e: React.FormEvent<HTMLElement>,
    toggleFunction: { (value: React.SetStateAction<any>): void }
  ) => {
    let value = (e.target as HTMLInputElement).checked;
    if (toggleFunction === toggleAddExistingContributions && !value) {
      changeNumberOfPayPeriodsSoFar(0);
      setAmountsSoFarToZero();
    }
    if (toggleFunction === toggleUpdate401kLimits) {
      set401kLimitsToDefault();
    }
    if (toggleFunction === toggleShowEmployerMatch) {
      setEmployerMatchToDefault();
    }
    toggleFunction(value);
  };

  const setAmountsSoFarToZero = () => {
    changeIndividualContributionAmountSoFar(0);
    changeEmployerContributionAmountSoFar(0);
    changeIndividualContributionAfterTaxAmountSoFar(0);
  };

  const set401kLimitsToDefault = () => {
    changeMax401kIndividualAmount(_401k_maximum_contribution_individual);
    changeMax401kTotalAmount(_401k_maximum_contribution_total);
  };

  const setEmployerMatchToDefault = () => {
    changeEmployerMatchBasePercent(0);
    changeEmployerMatchPercent(0);
  };

  /**
   * @param e event handler
   * @param changeFunction change function that updates integer values
   * @param min if event value is NaN or less than min, set to min
   * @param max if event value is greater than max, set to max
   * @param allowDecimal allows decimal input rounded to 2 places
   */
  const updateContribution = (
    e: React.FormEvent<HTMLElement>,
    changeFunction: { (value: React.SetStateAction<any>): void },
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
    changeFunction(value);
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

          <Form.Label>Number of Pay Periods this Year</Form.Label>
          <InputGroup className="mb-3 w-100">
            <Form.Control
              type="number"
              onWheel={(e) => e.currentTarget.blur()}
              value={formatStateValue(numberOfPayPeriods)}
              onChange={(e) =>
                updateAmount(e, changeNumberOfPayPeriods, 1, 260)
              }
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
                  value={formatStateValue(minIndividualContributionPercent)}
                  onChange={(e) =>
                    updateContribution(
                      e,
                      changeMinIndividualContributionPercent
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
                  value={formatStateValue(maxContributionPercent)}
                  onChange={(e) =>
                    updateContribution(e, changeMaxContributionPercent)
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
                  onChange={() =>
                    toggleAutomaticallyCap401k(!automaticallyCap401k)
                  }
                  label="401k Limits Contributions"
                  checked={automaticallyCap401k}
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
                  onChange={(e) =>
                    updateToggle(e, toggleAddExistingContributions)
                  }
                  label="Add Existing Contributions"
                  checked={addExistingContributions}
                />
              </InputGroup>
            }
          />
          {addExistingContributions && (
            <FormGroup>
              <Form.Label>Number of Pay Periods So Far</Form.Label>
              <InputGroup className="mb-3 w-100">
                <Form.Control
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  value={formatStateValue(numberOfPayPeriodsSoFar)}
                  onChange={(e) =>
                    updateAmount(
                      e,
                      changeNumberOfPayPeriodsSoFar,
                      0,
                      numberOfPayPeriods - 1
                    )
                  }
                />
              </InputGroup>

              <Form.Label>Amount Contributed to 401k So Far</Form.Label>
              <InputGroup className="mb-3 w-100">
                <InputGroup.Text>$</InputGroup.Text>
                <Form.Control
                  disabled={numberOfPayPeriodsSoFar === 0}
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  value={formatStateValue(individualContributionAmountSoFar)}
                  onChange={(e) =>
                    updateAmount(
                      e,
                      changeIndividualContributionAmountSoFar,
                      0,
                      max401kIndividualAmount
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
                  onChange={(e) => updateToggle(e, toggleShowEmployerMatch)}
                  label="Employer Contributions"
                  checked={showEmployerMatch}
                />
              </InputGroup>
            }
          />
          {showEmployerMatch && (
            <FormGroup>
              {addExistingContributions && (
                <>
                  <Form.Label>Employer Contributions So Far</Form.Label>
                  <InputGroup className="mb-3 w-100">
                    <InputGroup.Text>$</InputGroup.Text>
                    <Form.Control
                      disabled={numberOfPayPeriodsSoFar === 0}
                      type="number"
                      onWheel={(e) => e.currentTarget.blur()}
                      value={formatStateValue(employerContributionAmountSoFar)}
                      onChange={(e) =>
                        updateAmount(
                          e,
                          changeEmployerContributionAmountSoFar,
                          0,
                          max401kTotalAmount - max401kIndividualAmount
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
                      value={formatStateValue(employerMatchBasePercent)}
                      onChange={(e) =>
                        updateContribution(
                          e,
                          changeEmployerMatchBasePercent,
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
                        value={formatStateValue(employerMatchPercent)}
                        onChange={(e) =>
                          updateContribution(
                            e,
                            changeEmployerMatchPercent,
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
                        value={formatStateValue(employerMatchUpToPercent)}
                        onChange={(e) =>
                          updateContribution(
                            e,
                            changeEmployerMatchUpToPercent,
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
                  onChange={(e) => updateToggle(e, toggleShowMegaBackdoor)}
                  label="Show After-Tax 401k"
                  checked={showMegaBackdoor}
                />
              </InputGroup>
            }
          />
          {addExistingContributions && showMegaBackdoor && (
            <>
              <Form.Label>After-Tax Contributions So Far</Form.Label>
              <InputGroup className="mb-3 w-100">
                <InputGroup.Text>$</InputGroup.Text>
                <Form.Control
                  disabled={numberOfPayPeriodsSoFar === 0}
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  value={formatStateValue(
                    individualContributionAfterTaxAmountSoFar
                  )}
                  onChange={(e) =>
                    updateAmount(
                      e,
                      changeIndividualContributionAfterTaxAmountSoFar,
                      0,
                      table.maxAfterTaxAmount
                    )
                  }
                />
              </InputGroup>
            </>
          )}
          {showMegaBackdoor && (
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
                text={`This is the result of (Total - Individual - Employer) Contribution Maximums = ${max401kTotalAmount} - ${max401kIndividualAmount} - ${table.maxEmployerAmount}.`}
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
              onChange={(e) => updateToggle(e, toggleUpdate401kLimits)}
              label="Update 401k Limits"
              checked={update401kLimits}
            />
          </InputGroup>
          {update401kLimits && (
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
                      value={formatStateValue(max401kIndividualAmount)}
                      onChange={(e) =>
                        updateAmount(e, changeMax401kIndividualAmount)
                      }
                    />
                  </InputGroup>
                }
              />
            </>
          )}
          {update401kLimits && showMegaBackdoor && (
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
                      value={formatStateValue(max401kTotalAmount)}
                      onChange={(e) =>
                        updateAmount(e, changeMax401kTotalAmount)
                      }
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
                {showEmployerMatch && <th> Employer Contribution ($) </th>}
                {showMegaBackdoor && <th> After-Tax Contribution (%) </th>}
                {showMegaBackdoor && <th> After-Tax Contribution ($) </th>}
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
                  {showEmployerMatch && (
                    <td>{formatCurrency(row.employerAmount)}</td>
                  )}
                  {showMegaBackdoor && (
                    <td>{formatPercent(row.afterTaxPercent)}</td>
                  )}
                  {showMegaBackdoor && (
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
                    table.getTable()[numberOfPayPeriods - 1]
                      .cumulativeIndividualAmount
                  )}
                </td>
                {showEmployerMatch && (
                  <td>
                    {formatCurrency(
                      table.getTable()[numberOfPayPeriods - 1]
                        .cumulativeEmployerAmount
                    )}
                  </td>
                )}
                {showMegaBackdoor && <td></td>}
                {showMegaBackdoor && (
                  <td>
                    {formatCurrency(
                      table.getTable()[numberOfPayPeriods - 1]
                        .cumulativeAfterTaxAmount
                    )}
                  </td>
                )}
                <td>
                  {formatCurrency(
                    table.getTable()[numberOfPayPeriods - 1]
                      .cumulativeAmountTotal
                  )}
                </td>
              </tr>
            </tfoot>
          </Table>
          {payPeriodAlreadyPassedAlertHTML}
          {_401kMaxNotReachedAlertHTML}
          {_401kMaxReachedWithAutoCapAlertHTML}
          {_401kMaxReachedEarlyAlertHTML}
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default Frontload;
