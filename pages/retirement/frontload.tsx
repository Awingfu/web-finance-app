import React from "react";
import { Alert, Form, InputGroup, Table } from "react-bootstrap";
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
  const [salary, changeSalary] = React.useState(50000);
  const [_401kMaximum, change401kMaximum] = React.useState(
    _401k_maximum_contribution_individual
  );
  const [numberOfPayPeriods, changeNumberOfPayPeriods] = React.useState(26);
  const [numberOfPayPeriodsSoFar, changeNumberofPayPeriodsSoFar] =
    React.useState(0);
  const [amountContributedSoFar, changeAmountContributedSoFar] =
    React.useState(0);
  // make sure to divide minContributionForMatch and maxContributionFromPaycheck by 100 to get percentage
  const [minContributionForMatch, changeMinContributionForMatch] =
    React.useState(5);
  const [maxContributionFromPaycheck, changeMaxContributionFromPaycheck] =
    React.useState(90);

  const _401kMaxNotReachedIcon = "\u2020"; // dagger
  const _401kMaxNotReachedNote =
    _401kMaxNotReachedIcon +
    " If your company automatically caps your 401k contribution, bump the last contribution up in order to fully max your 401k.";
  const _401kMaxReachedEarlyIcon = "\u2021"; // double dagger
  const _401kMaxReachedEarlyNote =
    _401kMaxReachedEarlyIcon +
    " You will reach your maximum contribution early even with minimum matching available. Congrats. Future contributions for the year will not be possible if your employer caps your contributions";

  let _401kMaxNotReachedAlertHTML = <></>;
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

  const table_rows: any[][] = [];
  for (let i = 0; i < numberOfPayPeriods; i++) {
    // key for paycheck number. Index start at 1 cuz finance
    let concatKey = (i + 1).toString();
    // edge cases to just insert 0
    if (i < numberOfPayPeriodsSoFar - 1) {
      concatKey += " (Already passed)";
      table_rows.push([concatKey, payPerPayPeriod, 0, 0, 0]);
      continue;
    } else if (i == numberOfPayPeriodsSoFar - 1) {
      concatKey += " (Already passed)";
      table_rows.push([
        concatKey,
        payPerPayPeriod,
        0,
        amountContributedSoFar,
        amountContributedSoFar,
      ]);
      continue;
    }

    let match = minContributionForMatch / 100;
    let contributionAmount = (match * salary) / numberOfPayPeriods;

    // do max contributions, then single contribution, then default to min match
    if (i - numberOfPayPeriodsSoFar < numberOfMaxContributions) {
      match = maxContributionFromPaycheck / 100;
      contributionAmount = maxContributionAmount;
    } else if (i - numberOfPayPeriodsSoFar === numberOfMaxContributions) {
      match = singleContributionPercent / 100;
      contributionAmount = singleContributionAmount;
    }

    //if prev row exists, add value to period contribution, else use period contribution
    let cumulativeAmount: number =
      i != 0 ? table_rows[i - 1][4] + contributionAmount : contributionAmount;

    // check for too much comp
    if (Math.floor(cumulativeAmount) > _401kMaximum) {
      _401kMaxReachedEarlyAlertHTML = (
        <Alert className="mb-3" variant="secondary">
          {_401kMaxReachedEarlyNote}
        </Alert>
      );
      concatKey += _401kMaxReachedEarlyIcon;
      cumulativeAmount = _401kMaximum;
      contributionAmount =
        i != 0 ? _401kMaximum - table_rows[i - 1][4] : _401kMaximum;
      match = Math.ceil(contributionAmount / payPerPayPeriod * 100) / 100;
    }

    // if last paycheck, cumulative is < 401k max, and last match isnt the maximum,
    // with the last check meaning you're unable to hit maximum contribution limit,
    // add dagger to let user know to bump up contribution
    if (
      i === numberOfPayPeriods - 1 &&
      Math.round(cumulativeAmount) != _401kMaximum &&
      match != maxContributionFromPaycheck / 100
    ) {
      _401kMaxNotReachedAlertHTML = (
        <Alert className="mb-3" variant="secondary">
          {_401kMaxNotReachedNote}
        </Alert>
      );
      concatKey += _401kMaxNotReachedIcon;
    }

    // row values: key, compensation, match, contribution, cumulative
    table_rows.push([
      concatKey,
      payPerPayPeriod,
      match,
      contributionAmount,
      cumulativeAmount,
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
      changeNumberofPayPeriodsSoFar(value - 1);
      if (value === 1) {
        changeAmountContributedSoFar(0);
      }
    }
    if (changeFunction === changeNumberofPayPeriodsSoFar) {
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
   */
  const updateContribution = (
    e: React.FormEvent<HTMLElement>,
    changeFunction: { (value: React.SetStateAction<any>): void },
    min: number = 0,
    max: number = 100
  ) => {
    let value = parseInt((e.target as HTMLInputElement).value);
    if (isNaN(value) || value < min) {
      value = min;
    } else if (value > max) {
      value = max;
    }
    changeFunction(value);
  };

  return (
    <div className={styles.container}>
      <Header titleName="Frontload Calculator" />

      <main className={styles.main}>
        <h1>Frontload Calculator</h1>
        <p>
          Here we will maximize your 401k contributions by frontloading while ensuring minimum contributions throughout the year.
        </p>
      </main>

      <div className={styles.content}>
        <Form className={styles.form}>
          <Form.Label>Annual Salary</Form.Label>
          <InputGroup className="mb-3 w-100">
            <InputGroup.Text>$</InputGroup.Text>
            <Form.Control
              type="number" onWheel={e => e.currentTarget.blur()}
              value={formatStateValue(salary)}
              onChange={(e) => updateAmount(e, changeSalary)}
            />
          </InputGroup>

          <Form.Label>Number of Pay Periods this year</Form.Label>
          <InputGroup className="mb-3 w-100">
            <Form.Control
              type="number" onWheel={e => e.currentTarget.blur()}
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
              type="number" onWheel={e => e.currentTarget.blur()}
              value={formatStateValue(numberOfPayPeriodsSoFar)}
              onChange={(e) =>
                updateAmount(
                  e,
                  changeNumberofPayPeriodsSoFar,
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
              type="number" onWheel={e => e.currentTarget.blur()}
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
                  type="number" onWheel={e => e.currentTarget.blur()}
                  value={formatStateValue(_401kMaximum)}
                  onChange={(e) => updateAmount(e, change401kMaximum)}
                />
              </InputGroup>
            }
          />

          <Form.Label>
            Minimum Desired Paycheck Contribution
          </Form.Label>
          <TooltipOnHover
            text="% of income between 0 and 100. This is effectively what you want to ensure you get a 401k match per paycheck."
            nest={
              <InputGroup className="mb-3 w-100">
                <Form.Control
                  type="number" onWheel={e => e.currentTarget.blur()}
                  value={formatStateValue(minContributionForMatch)}
                  onChange={(e) =>
                    updateContribution(e, changeMinContributionForMatch)
                  }
                />
                <InputGroup.Text>%</InputGroup.Text>
              </InputGroup>
            }
          />

          <Form.Label>
            Maximum Paycheck Contribution Allowed
          </Form.Label>
          <TooltipOnHover
            text="% of income between 0 and 100. You can also just put the maximum amount you are comfortable contributing."
            nest={
              <InputGroup className="mb-3 w-100">
                <Form.Control
                  type="number" onWheel={e => e.currentTarget.blur()}
                  value={formatStateValue(maxContributionFromPaycheck)}
                  onChange={(e) =>
                    updateContribution(e, changeMaxContributionFromPaycheck)
                  }
                />
                <InputGroup.Text>%</InputGroup.Text>
              </InputGroup>
            }
          />
        </Form>

        <div className={styles.table}>
          <Table hover responsive size="sm" className="mb-3">
            <thead>
              <tr>
                <th>Pay Period</th>
                <th>Compensation</th>
                <th>Match</th>
                <th>Contribution</th>
                <th>Cumulative Contributed</th>
              </tr>
            </thead>
            <tbody>
              {table_rows.map((row) => (
                <tr key={row[0]}>
                  <td className={styles.thicc}>{row[0]}</td>
                  <td>{formatCurrency(row[1])}</td>
                  <td>{formatPercent(row[2])}</td>
                  <td>{formatCurrency(row[3])}</td>
                  <td>{formatCurrency(row[4])}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          {_401kMaxNotReachedAlertHTML}
          {_401kMaxReachedEarlyAlertHTML}
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default Frontload;
