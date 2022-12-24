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
  const [numberOfPayPeriods, changeNumberOfPayPeriods] = React.useState(26);
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
  const [employerMatchPercent, changeEmployerMatchPercent] = React.useState(50);
  const [employerMatchUpToPercent, changeEmployerMatchUpToPercent] =
    React.useState(6);

  const [automaticallyCap401k, changeAutomaticallyCap401k] =
    React.useState(false);
  const [prioritizeMegaBackdoor, changePrioritizeMegaBackdoor] =
    React.useState(false);
  const [showEmployerMatchInTable, changeShowEmployerMatchInTable] =
    React.useState(false);
  const [showMegaBackdoor, changeShowMegaBackdoor] = React.useState(false);

  const payPeriodAlreadyPassedIcon = "\u203E"; // overline
  const payPeriodAlreadyPassedText =
    payPeriodAlreadyPassedIcon + " Pay period has already passed";
  const maxNotReachedIcon = "\u2020"; // dagger
  const _401kMaxNotReachedNote =
    maxNotReachedIcon +
    " If your employer automatically caps your 401k contribution, bump the last contribution up in order to fully max your 401k.";
  const _401kMaxReachedWithAutoCapNote =
    maxNotReachedIcon +
    " Since your employer automatically caps your 401k contribution, this last contribution should max out your contributions.";
  const maxReachedEarlyIcon = "\u2021"; // double dagger
  const _401kMaxReachedEarlyNote =
    maxReachedEarlyIcon +
    " You will reach your maximum contribution early even with minimum matching available. Future contributions for the year will not be possible if your employer caps your contributions";

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

  const setAmountsSoFarToZero = () => {
    changeIndividualContributionAmountSoFar(0);
    changeEmployerContributionAmountSoFar(0);
    changeIndividualContributionAfterTaxAmountSoFar(0);
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
        <h1>401k Frontload Calculator</h1>
        <p>
          Here we will maximize your 401k contributions by frontloading while
          ensuring minimum contributions throughout the year.
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

          <Form.Label>Number of Pay Periods this year</Form.Label>
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

          <Form.Label>
            Number of Pay Periods you have received so far
          </Form.Label>
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

          <Form.Label>Amount Contributed to 401k so far</Form.Label>
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

          <Form.Label>401k Maximum for Individual Contribution</Form.Label>
          <TooltipOnHover
            text="The maximum in 2023 is $22500. You can decrease this if you have contributed to another 401k."
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

          <Form.Label>Minimum Desired Paycheck Contribution</Form.Label>
          <TooltipOnHover
            text="% of income between 0 and 100. This is what you want to ensure you get a 401k match per paycheck."
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
            text="% of income between 0 and 100. This is the maximum amount you are comfortable or are allowed to contribute."
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
            text="Check this if your 401k automatically caps individual contributions at limits."
            nest={
              <InputGroup className="mb-3 w-50">
                <Form.Check
                  type="checkbox"
                  onChange={() =>
                    changeAutomaticallyCap401k(!automaticallyCap401k)
                  }
                  label="401k Automatically Caps Contributions"
                  checked={automaticallyCap401k}
                />
              </InputGroup>
            }
          />

          <TooltipOnHover
            text="Check this to show employer match in table. This tool does not cap the match to the true 401k limits."
            nest={
              <InputGroup className="mb-3 w-50">
                <Form.Check
                  type="checkbox"
                  onChange={() =>
                    changeShowEmployerMatchInTable(!showEmployerMatchInTable)
                  }
                  label="Show Employer Match"
                  checked={showEmployerMatchInTable}
                />
              </InputGroup>
            }
          />
          {showEmployerMatchInTable && (
            <FormGroup>
              <Form.Label>Employer Contributions so far</Form.Label>
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
                            100,
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
        </Form>

        <div className={styles.table}>
          <Table hover responsive size="sm" className="mb-3">
            <thead>
              <tr>
                <th>Pay Period</th>
                <th>Pay</th>
                <th>Contribution %</th>
                <th>Contribution Amount</th>
                {showEmployerMatchInTable && <th> Employer Amount </th>}
                <th>Cumulative Amount</th>
              </tr>
            </thead>
            <tbody>
              {table.getTable().map((row: RetirementTableRow) => (
                <tr key={row.rowKey}>
                  <td className={styles.thicc}>{row.rowKey}</td>
                  <td>{formatCurrency(row.payPerPayPeriod)}</td>
                  <td>{formatPercent(row.contributionFraction)}</td>
                  <td>{formatCurrency(row.contributionAmount)}</td>
                  {!showEmployerMatchInTable && (
                    <td>{formatCurrency(row.cumulativeAmountIndividual)}</td>
                  )}
                  {showEmployerMatchInTable && (
                    <td>{formatCurrency(row.employerAmount)}</td>
                  )}
                  {showEmployerMatchInTable && (
                    <td>{formatCurrency(row.cumulativeAmountWithEmployer)}</td>
                  )}
                </tr>
              ))}
            </tbody>
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
