import React from "react";
import { Alert, Form, InputGroup, Table } from "react-bootstrap";
import { Header, Footer, TooltipOnHover } from "../../src/components";
import {
  formatCurrency,
  formatPercent,
  formatStateValue,
} from "../../src/utils";
import {
  MONTH_NAMES,
  ALL_MONTH_NAMES,
  _401k_maximum_contribution_individual,
} from "../../src/utils/constants";
import styles from "../../styles/Retirement.module.scss";

/**
 * Future Goals
 * 1. Differing pay periods
 * 2. New inputs: Bonus, Bonus paycheck, new salary (raise) and which paycheck, company match, mega backdoor availability
 * 2. different frontloading strategies inc company match and 401k true limit
 * 3. cost analysis with fv assumption for each strategy
 *
 * Current:
 * Input:
 * Salary,401k Max, 401k max contribution, min contribution to get match
 *
 * @returns
 */

function Frontload() {
  const [salary, changeSalary] = React.useState(50000);
  // const [bonus, changeBonus] = React.useState(0);
  const [_401kMaximum, change401kMaximum] = React.useState(
    _401k_maximum_contribution_individual
  );
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
    " You will reach your maximum contribution early even with minimum matching available. Congrats. All future contributions will not be possible if your employer caps your contributions";
  let isMaxedEarly = false;

  const numberOfPaychecks = 12;

  const month_rows: { [key: string]: any } = {};

  // Calculations
  const maxContributionAmount =
    ((maxContributionFromPaycheck / 100) * salary) / numberOfPaychecks;
  const contributionAmountForFullMatch =
    ((minContributionForMatch / 100) * salary) / numberOfPaychecks;

  // TODO maybe use these in form
  const amountContributedSoFar = 0;
  const numberOfContributionsSoFar = 0;

  const numberOfMaxContributions = Math.floor(
    (amountContributedSoFar -
      _401kMaximum +
      contributionAmountForFullMatch *
        (numberOfPaychecks - numberOfContributionsSoFar)) /
      (contributionAmountForFullMatch - maxContributionAmount)
  );
  // console.log(numberOfMaxContributions + " = " +
  // amountContributedSoFar + " - " + _401kMaximum + " + (" + contributionAmountForFullMatch + " * (" + numberOfPaychecks + " - " + numberOfContributionsSoFar + ")) / (" + contributionAmountForFullMatch + " - " + maxContributionAmount + ")");
  const singleContributionPercent = Math.floor(
    ((_401kMaximum -
      (amountContributedSoFar +
        numberOfMaxContributions * maxContributionAmount +
        (numberOfPaychecks -
          numberOfMaxContributions -
          numberOfContributionsSoFar -
          1) *
          contributionAmountForFullMatch)) /
      salary) *
      numberOfPaychecks *
      100
  );
  const singleContributionAmount =
    ((singleContributionPercent / 100) * salary) / numberOfPaychecks;

  // map for table
  ALL_MONTH_NAMES.forEach((month_key, index) => {
    let match = minContributionForMatch / 100;
    let contributionAmount = (match * salary) / numberOfPaychecks;
    // suffix on key name for notes

    // do max contribution, then single contributions, then default to min for full match
    if (index < numberOfMaxContributions) {
      match = maxContributionFromPaycheck / 100;
      contributionAmount = maxContributionAmount;
    } else if (index == numberOfMaxContributions) {
      match = singleContributionPercent / 100;
      contributionAmount = singleContributionAmount;
    }

    const prevRowKey =
      MONTH_NAMES[ALL_MONTH_NAMES[index - 1] as keyof typeof MONTH_NAMES];
    const key = MONTH_NAMES[month_key as keyof typeof MONTH_NAMES];
    let concatKey = key.toString();
    //if prev row exists, add value to monthly contribution, else use monthly contribution
    let cumulativeAmount = month_rows[prevRowKey]
      ? month_rows[prevRowKey][4] + contributionAmount
      : contributionAmount;

    // check for too much comp
    if (cumulativeAmount > _401kMaximum) {
      isMaxedEarly = true;
      concatKey += _401kMaxReachedEarlyIcon;
      cumulativeAmount = _401kMaximum;
      contributionAmount = month_rows[prevRowKey]
        ? _401kMaximum - month_rows[prevRowKey][4]
        : _401kMaximum;
    }

    // last index check for dagger + note
    const isLastIndex =
      key ===
      MONTH_NAMES[
        ALL_MONTH_NAMES[ALL_MONTH_NAMES.length - 1] as keyof typeof MONTH_NAMES
      ];
    // check numberOfMaxContributions < numberOfPaychecks is true,
    // otherwise you're unable to hit maximum contribution
    if (
      isLastIndex &&
      Math.round(cumulativeAmount) != _401kMaximum &&
      numberOfMaxContributions < numberOfPaychecks
    ) {
      concatKey += _401kMaxNotReachedIcon;
    }

    // Month : compensation, match, contribution, cumulative
    month_rows[key] = [
      concatKey, // for naming purposes
      salary / numberOfPaychecks,
      match,
      contributionAmount,
      cumulativeAmount,
    ];
  });

  let _401kMaxNotReachedAlertHTML = <></>;
  const lastMonth =
    MONTH_NAMES[
      ALL_MONTH_NAMES[ALL_MONTH_NAMES.length - 1] as keyof typeof MONTH_NAMES
    ];
  const is401kMaxed = Math.round(month_rows[lastMonth][4]) == _401kMaximum;
  if (!is401kMaxed && numberOfMaxContributions < numberOfPaychecks) {
    _401kMaxNotReachedAlertHTML = (
      <Alert className="mb-3" variant="secondary">
        {_401kMaxNotReachedNote}
      </Alert>
    );
  }

  let _401kMaxReachedEarlyAlertHTML = <></>;
  if (isMaxedEarly) {
    _401kMaxNotReachedAlertHTML = (
      <Alert className="mb-3" variant="secondary">
        {_401kMaxReachedEarlyNote}
      </Alert>
    );
  }

  const updateAmount = (
    e: React.FormEvent<HTMLElement>,
    changeFunction: { (value: React.SetStateAction<any>): void }
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
    e: React.FormEvent<HTMLElement>,
    changeFunction: { (value: React.SetStateAction<any>): void }
  ) => {
    let value = parseInt((e.target as HTMLInputElement).value);
    if (isNaN(value) || value < 0) {
      value = 0;
    } else if (value > 90) {
      value = 90;
    }
    changeFunction(value);
  };

  return (
    <div className={styles.container}>
      <Header titleName="Frontload Calculator" />

      <main className={styles.main}>
        <h1>Frontload Calculator</h1>
        <p>Here we will optimize your 401k by frontloading and getting full employer matching</p>
      </main>

      <div className={styles.content}>
        <Form className={styles.form}>
          <Form.Label>Annual Salary</Form.Label>
          <InputGroup className="mb-3 w-100">
            <InputGroup.Text>$</InputGroup.Text>
            <Form.Control
              type="number"
              value={formatStateValue(salary)}
              onChange={(e) => updateAmount(e, changeSalary)}
            />
          </InputGroup>

          <Form.Label>401k Maximum for Individual Contribution</Form.Label>
          <InputGroup className="mb-3 w-100">
            <InputGroup.Text>$</InputGroup.Text>
            <Form.Control
              type="number"
              value={formatStateValue(_401kMaximum)}
              onChange={(e) => updateAmount(e, change401kMaximum)}
            />
          </InputGroup>

          <Form.Label>401k Contribution for Full Employer Match</Form.Label>
          <TooltipOnHover
            text="% of gross income between 0 and 90."
            nest={
              <InputGroup className="mb-3 w-100">
                <Form.Control
                  type="number"
                  value={formatStateValue(minContributionForMatch)}
                  onChange={(e) =>
                    updateContribution(e, changeMinContributionForMatch)
                  }
                />
                <InputGroup.Text>%</InputGroup.Text>
              </InputGroup>
            }
          />

          <Form.Label>Maximum Paycheck Contribution for 401k</Form.Label>
          <TooltipOnHover
            text="% of gross income between 0 and 90."
            nest={
              <InputGroup className="mb-3 w-100">
                <Form.Control
                  type="number"
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
                <th>Month</th>
                <th>Monthly Salary</th>
                <th>Match</th>
                <th>Amount per Month</th>
                <th>Cumulative Contributed</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(month_rows).map((key) => (
                <tr key={key}>
                  <td className={styles.thicc}>{month_rows[key][0]}</td>
                  <td>{formatCurrency(month_rows[key][1])}</td>
                  <td>{formatPercent(month_rows[key][2])}</td>
                  <td>{formatCurrency(month_rows[key][3])}</td>
                  <td>{formatCurrency(month_rows[key][4])}</td>
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
