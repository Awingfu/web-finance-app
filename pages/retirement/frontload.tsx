import React from "react";
import { Alert, Form, FormGroup, InputGroup, Table } from "react-bootstrap";
import { Header, Footer, TooltipOnHover } from "../../src/components";
import {
  formatCurrency,
  formatPercent,
  formatStateValue,
} from "../../src/utils";
import { _401k_maximum_contribution_individual } from "../../src/utils/constants";
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
  const [_401kMaximum, change401kMaximum] = React.useState(
    _401k_maximum_contribution_individual
  );
  const [numberOfPayPeriods, changeNumberOfPayPeriods] = React.useState(26);
  const [numberOfPayPeriodsSoFar, changeNumberOfPayPeriodsSoFar] =
    React.useState(0);
  const [amountContributedSoFar, changeAmountContributedSoFar] =
    React.useState(0);
  // make sure to divide minContributionForMatch, maxContributionFromPaycheck, effectiveEmployerMatch by 100 to get percentage
  const [minContributionForMatch, changeMinContributionForMatch] =
    React.useState(6);
  const [maxContributionFromPaycheck, changeMaxContributionFromPaycheck] =
    React.useState(90);
  const [effectiveEmployerBase, changeEffectiveEmployerBase] =
    React.useState(0);
  const [effectiveEmployerMatch, changeEffectiveEmployerMatch] =
    React.useState(50);
  const [effectiveEmployerMatchUpTo, changeEffectiveEmployerMatchUpTo] =
    React.useState(6);

  const [_401kAutoCap, change401kAutoCap] = React.useState(false);
  const [showEmployerMatchInTable, changeShowEmployerMatchInTable] =
    React.useState(false);

  const payPeriodAlreadyPassedIcon = "\u203E"; // overline
  const payPeriodAlreadyPassedText =
    payPeriodAlreadyPassedIcon + " Pay period has already passed";
  const _401kMaxNotReachedIcon = "\u2020"; // dagger
  const _401kMaxNotReachedNote =
    _401kMaxNotReachedIcon +
    " If your employer automatically caps your 401k contribution, bump the last contribution up in order to fully max your 401k.";
  const _401kMaxReachedWithAutoCapNote =
    _401kMaxNotReachedIcon +
    " Since your employer automatically caps your 401k contribution, this last contribution should max out your contributions.";
  const _401kMaxReachedEarlyIcon = "\u2021"; // double dagger
  const _401kMaxReachedEarlyNote =
    _401kMaxReachedEarlyIcon +
    " You will reach your maximum contribution early even with minimum matching available. Congrats. Future contributions for the year will not be possible if your employer caps your contributions";

  let payPeriodAlreadyPassedAlertHTML = <></>;
  let _401kMaxNotReachedAlertHTML = <></>;
  let _401kMaxReachedWithAutoCapAlertHTML = <></>;
  let _401kMaxReachedEarlyAlertHTML = <></>;

  // Calculations
  const payPerPayPeriod = salary / numberOfPayPeriods;

  const maxContributionAmount =
    (maxContributionFromPaycheck / 100) * payPerPayPeriod;
  const contributionAmountForFullMatch =
    (minContributionForMatch / 100) * payPerPayPeriod;

  const numberOfMaxContributions = Math.floor(
    (amountContributedSoFar -
      _401kMaximum +
      contributionAmountForFullMatch *
        (numberOfPayPeriods - numberOfPayPeriodsSoFar)) /
      (contributionAmountForFullMatch - maxContributionAmount)
  );

  if (numberOfPayPeriodsSoFar > 0) {
    payPeriodAlreadyPassedAlertHTML = (
      <Alert className="mb-3" variant="secondary">
        {payPeriodAlreadyPassedText}
      </Alert>
    );
  }

  // console.log(numberOfMaxContributions + " = " +
  // amountContributedSoFar + " - " + _401kMaximum + " + (" + contributionAmountForFullMatch + " * (" + numberOfPayPeriods + " - " + numberOfPayPeriodsSoFar + ")) / (" + contributionAmountForFullMatch + " - " + maxContributionAmount + ")");
  const singleContributionPercent = Math.floor(
    ((_401kMaximum -
      (amountContributedSoFar +
        numberOfMaxContributions * maxContributionAmount +
        (numberOfPayPeriods -
          numberOfMaxContributions -
          numberOfPayPeriodsSoFar -
          1) *
          contributionAmountForFullMatch)) /
      salary) *
      numberOfPayPeriods *
      100
  );
  const singleContributionAmount =
    (singleContributionPercent / 100) * payPerPayPeriod;

  // data for table
  const table_rows: any[][] = [];
  let contributionPercent = 0;
  let contributionAmount = 0;
  let cumulativeAmountIndividual = 0;
  let employerAmount = 0;
  let cumulativeAmountTotal = 0;

  for (let i = 0; i < numberOfPayPeriods; i++) {
    // key for paycheck number. Index start at 1 cuz finance
    let concatKey = (i + 1).toString();

    // base cases to just insert 0 and existing contributions if periods have already passed
    if (i < numberOfPayPeriodsSoFar - 1) {
      concatKey += payPeriodAlreadyPassedIcon;
      table_rows.push([concatKey, payPerPayPeriod, 0, 0, 0, 0, 0]);
      continue;
    } else if (i == numberOfPayPeriodsSoFar - 1) {
      concatKey += payPeriodAlreadyPassedIcon;
      table_rows.push([
        concatKey,
        payPerPayPeriod,
        0,
        amountContributedSoFar,
        amountContributedSoFar,
        0,
        amountContributedSoFar,
      ]);
      continue;
    }

    // set base contribution pct and contribution amount
    contributionPercent = minContributionForMatch / 100;
    contributionAmount = (contributionPercent * salary) / numberOfPayPeriods;

    // do max contributions, then single contribution, then default to min match
    if (i - numberOfPayPeriodsSoFar < numberOfMaxContributions) {
      contributionPercent = maxContributionFromPaycheck / 100;
      contributionAmount = maxContributionAmount;
    } else if (i - numberOfPayPeriodsSoFar === numberOfMaxContributions) {
      contributionPercent = singleContributionPercent / 100;
      contributionAmount = singleContributionAmount;
    }

    // if 401k auto caps, we're at the last row, contribution would not equal max, and new contribution won't exceed max allowed
    // set contribution to max out
    if (
      _401kAutoCap &&
      i == numberOfPayPeriods - 1 &&
      contributionAmount != _401kMaximum - table_rows[i - 1][4] &&
      ((_401kMaximum - table_rows[i - 1][4]) / payPerPayPeriod) * 100 <=
        maxContributionFromPaycheck
    ) {
      contributionAmount = _401kMaximum - table_rows[i - 1][4];
      contributionPercent =
        Math.ceil((contributionAmount / payPerPayPeriod) * 100) / 100;
      _401kMaxReachedWithAutoCapAlertHTML = (
        <Alert className="mb-3" variant="secondary">
          {_401kMaxReachedWithAutoCapNote}
        </Alert>
      );
      concatKey += _401kMaxNotReachedIcon;
    }

    // if prev row exists, add value to period contribution, else use period contribution
    cumulativeAmountIndividual =
      i != 0 ? table_rows[i - 1][4] + contributionAmount : contributionAmount;

    // check for too much comp
    if (Math.floor(cumulativeAmountIndividual) > _401kMaximum) {
      _401kMaxReachedEarlyAlertHTML = (
        <Alert className="mb-3" variant="secondary">
          {_401kMaxReachedEarlyNote}
        </Alert>
      );
      concatKey += _401kMaxReachedEarlyIcon;
      cumulativeAmountIndividual = _401kMaximum;
      contributionAmount =
        i != 0 ? _401kMaximum - table_rows[i - 1][4] : _401kMaximum;
      contributionPercent =
        Math.ceil((contributionAmount / payPerPayPeriod) * 100) / 100;
    }

    // if last paycheck, cumulative is < 401k max, and last match isn't the maximum,
    // with the last check meaning you're unable to hit maximum contribution limit,
    // add dagger to let user know to bump up contribution
    if (
      i === numberOfPayPeriods - 1 &&
      Math.round(cumulativeAmountIndividual) != _401kMaximum &&
      contributionPercent != maxContributionFromPaycheck / 100
    ) {
      _401kMaxNotReachedAlertHTML = (
        <Alert className="mb-3" variant="secondary">
          {_401kMaxNotReachedNote}
        </Alert>
      );
      concatKey += _401kMaxNotReachedIcon;
    }

    // set employer match
    let employerBaseAmount = (effectiveEmployerBase * payPerPayPeriod) / 100;
    let employerMatchAmount =
      ((effectiveEmployerMatch / 100) *
        Math.min(effectiveEmployerMatchUpTo, contributionPercent * 100) *
        payPerPayPeriod) /
      100;
    employerAmount =
      employerBaseAmount + Math.min(contributionAmount, employerMatchAmount);
    cumulativeAmountTotal =
      i == 0
        ? contributionAmount + employerAmount
        : table_rows[i - 1][6] + contributionAmount + employerAmount;

    // row values: key, compensation, match, contribution, cumulative
    table_rows.push([
      concatKey,
      payPerPayPeriod,
      contributionPercent,
      contributionAmount,
      cumulativeAmountIndividual,
      employerAmount,
      cumulativeAmountTotal,
    ]);
  }

  /**
   * @param e event handler
   * @param changeFunction change function that updates float values
   * @param min if event value is NaN or less than min, set to min
   * @param max if event value is greater than max, set to max
   * If changeFunction is changeNumber of PayPeriods,
   * ensure payPeriodsSoFar is less.
   * If payPeriodsSoFar is 0, set amountContributedSoFar to 0
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
        changeAmountContributedSoFar(0);
      }
    }
    if (changeFunction === changeNumberOfPayPeriodsSoFar) {
      if (value === 0) {
        changeAmountContributedSoFar(0);
      }
    }
    changeFunction(value);
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
                updateAmount(e, changeNumberOfPayPeriods, 1, 366)
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
              value={formatStateValue(amountContributedSoFar)}
              onChange={(e) =>
                updateAmount(e, changeAmountContributedSoFar, 0, _401kMaximum)
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
                  value={formatStateValue(_401kMaximum)}
                  onChange={(e) => updateAmount(e, change401kMaximum)}
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
                  value={formatStateValue(minContributionForMatch)}
                  onChange={(e) =>
                    updateContribution(e, changeMinContributionForMatch)
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
                  value={formatStateValue(maxContributionFromPaycheck)}
                  onChange={(e) =>
                    updateContribution(e, changeMaxContributionFromPaycheck)
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
                  onChange={() => change401kAutoCap(!_401kAutoCap)}
                  label="401k Automatically Caps Contributions"
                  checked={_401kAutoCap}
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
              <Form.Label>Employer 401k Base Contribution</Form.Label>
              <TooltipOnHover
                text="% of income between 0 and 100. This is how much your employer contributes regardless of your contributions."
                nest={
                  <InputGroup className="mb-3 w-100">
                    <Form.Control
                      type="number"
                      onWheel={(e) => e.currentTarget.blur()}
                      value={formatStateValue(effectiveEmployerBase)}
                      onChange={(e) =>
                        updateContribution(
                          e,
                          changeEffectiveEmployerBase,
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
                text="% of income between 0 and 100. This is how much your employer contributes dependent on your contributions. This is in the form of X% up to Y% of contributions."
                nest={
                  <div className={styles.inlineGroup}>
                    <InputGroup className={styles.inlineChildren}>
                      <Form.Control
                        type="number"
                        onWheel={(e) => e.currentTarget.blur()}
                        value={formatStateValue(effectiveEmployerMatch)}
                        onChange={(e) =>
                          updateContribution(
                            e,
                            changeEffectiveEmployerMatch,
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
                        value={formatStateValue(effectiveEmployerMatchUpTo)}
                        onChange={(e) =>
                          updateContribution(
                            e,
                            changeEffectiveEmployerMatchUpTo,
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
              {table_rows.map((row) => (
                <tr key={row[0]}>
                  <td className={styles.thicc}>{row[0]}</td>
                  <td>{formatCurrency(row[1])}</td>
                  <td>{formatPercent(row[2])}</td>
                  <td>{formatCurrency(row[3])}</td>
                  {!showEmployerMatchInTable && (
                    <td>{formatCurrency(row[4])}</td>
                  )}
                  {showEmployerMatchInTable && (
                    <td>{formatCurrency(row[5])}</td>
                  )}
                  {showEmployerMatchInTable && (
                    <td>{formatCurrency(row[6])}</td>
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
