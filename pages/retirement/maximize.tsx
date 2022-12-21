import React from "react";
import { Alert, Form, InputGroup, Table } from "react-bootstrap";
import { Header, Footer, TooltipOnHover } from "../../src/components";
import {
  formatCurrency,
  formatPercent,
  formatStateValue,
} from "../../src/utils";
import {
  _401k_maximum_contribution_individual,
  _401k_maximum_contribution_total,
} from "../../src/utils/constants";
import styles from "../../styles/Retirement.module.scss";

/**
 * TODO's:
 * - allow user to choose between maximize and frontload
 */
function Maximize() {
  const [salary, changeSalary] = React.useState(60000);
  const [_401kMaximumIndividual, change401kMaximumIndividual] = React.useState(
    _401k_maximum_contribution_individual
  );
  const [_401kMaximum, change401kMaximum] = React.useState(
    _401k_maximum_contribution_total
  );
  const [numberOfPayPeriods, changeNumberOfPayPeriods] = React.useState(26);
  const [numberOfPayPeriodsSoFar, changeNumberOfPayPeriodsSoFar] =
    React.useState(0);
  const [
    amountContributedSoFarIndividual,
    changeAmountContributedSoFarIndividual,
  ] = React.useState(0);
  const [amountContributedSoFarEmployer, changeAmountContributedSoFarEmployer] =
    React.useState(0);
  const [amountContributedSoFarMBD, changeAmountContributedSoFarMBD] =
    React.useState(0);
  // make sure to divide minContributionForMaxMatch, maxContributionFromPaycheck,
  // and employerMatch by 100 to get percentage
  // const [minContributionForMaxMatch, changeMinContributionForMaxMatch] =
  //   React.useState(5);
  const [maxContributionFromPaycheck, changeMaxContributionFromPaycheck] =
    React.useState(90);
  const [employerMatch, changeEmployerMatch] = React.useState(6);

  // Toggle
  const [megabackdoorEligible, changeMegabackdoorEligible] =
    React.useState(false);
  const [_401kAutoCap, change401kAutoCap] = React.useState(false);
  const [backloadToggle, changeBackloadToggle] = React.useState(false);

  const payPeriodAlreadyPassedIcon = "\u203E"; // overline
  const payPeriodAlreadyPassedText =
    payPeriodAlreadyPassedIcon + " Pay period has already passed";
  const _401kMaxNotReachedIcon = "\u2020"; // dagger
  const _401kMaxNotReachedNote =
    _401kMaxNotReachedIcon +
    " If your employer automatically caps your 401k contribution, bump the last contribution up in order to fully max your 401k.";
  const _401kMaxReachedEarlyIcon = "\u2021"; // double dagger
  const _401kMaxReachedEarlyNote =
    _401kMaxReachedEarlyIcon +
    " You will reach your maximum contribution early even with minimum matching available. Future contributions for the year will not be possible if your employer caps your contributions. You may miss out on some employer match, but check with your employer if there is an employer true-up match to compensate.";

  let payPeriodAlreadyPassedAlertHTML = <></>;
  let _401kMaxNotReachedAlertHTML = <></>;
  let _401kMaxReachedEarlyAlertHTML = <></>;

  // Calculations
  const payPerPayPeriod = salary / numberOfPayPeriods;
  const numberOfPayPeriodsLeft = numberOfPayPeriods - numberOfPayPeriodsSoFar;
  const amountLeftToContributeIndividual =
    _401kMaximumIndividual - amountContributedSoFarIndividual;
  const contributionPerRemainingPeriodIndividual =
    amountLeftToContributeIndividual / numberOfPayPeriodsLeft;
  // This is rounded down since most companies won't let you select exact percentage
  const matchPercentIndividualRaw =
    (contributionPerRemainingPeriodIndividual / payPerPayPeriod) * 100;
  const matchPercentIndividualRawRounded =
    _401kAutoCap && !backloadToggle
      ? Math.ceil(matchPercentIndividualRaw)
      : Math.floor(matchPercentIndividualRaw);
  const matchPercentIndividual =
    Math.min(matchPercentIndividualRawRounded, maxContributionFromPaycheck) /
    100;

  if (numberOfPayPeriodsSoFar > 0) {
    payPeriodAlreadyPassedAlertHTML = (
      <Alert className="mb-3" variant="secondary">
        {payPeriodAlreadyPassedText}
      </Alert>
    );
  }
  // Data for table
  const table_rows: any[][] = [];

  let match = 0;
  let contributionAmount = 0;
  let employerMatchAmount = 0;
  let cumulativeAmountIndividual: number = 0;
  let cumulativeAmountEmployer: number = 0;
  let cumulativeAmountTotal: number = 0;

  for (let i = 0; i < numberOfPayPeriods; i++) {
    // key for paycheck number. Index start at 1 cuz finance
    let concatKey = (i + 1).toString();
    match = matchPercentIndividual;
    contributionAmount = (match * salary) / numberOfPayPeriods;

    // base cases to just insert 0 if pay period has passed
    if (i < numberOfPayPeriodsSoFar - 1) {
      concatKey += payPeriodAlreadyPassedIcon;
      table_rows.push([concatKey, payPerPayPeriod, 0, 0, 0, 0, 0, 0]);
      continue;
    }
    // base case to add amounts contributed so far
    if (i == numberOfPayPeriodsSoFar - 1) {
      concatKey += payPeriodAlreadyPassedIcon;
      table_rows.push([
        concatKey,
        payPerPayPeriod,
        0,
        amountContributedSoFarIndividual,
        amountContributedSoFarIndividual,
        amountContributedSoFarEmployer,
        amountContributedSoFarEmployer,
        amountContributedSoFarEmployer + amountContributedSoFarIndividual,
      ]);
      continue;
    }

    // if previous row is above max individual contribution, stop
    // else if new contribution will push over the limit and we auto cap, adjust
    if (i > 0 && table_rows[i - 1][4] >= _401kMaximumIndividual) {
      match = 0;
      contributionAmount = 0;
      concatKey += _401kMaxReachedEarlyIcon;
    } else if (
      i > 0 &&
      _401kAutoCap &&
      table_rows[i - 1][4] + contributionAmount >= _401kMaximumIndividual
    ) {
      contributionAmount = Math.max(
        0,
        _401kMaximumIndividual - table_rows[i - 1][4]
      );
      match = Math.ceil((contributionAmount / payPerPayPeriod) * 100) / 100;
      // show note only if it's before the last pay period
      if (i < numberOfPayPeriods - 1) {
        concatKey += _401kMaxReachedEarlyIcon;
        _401kMaxReachedEarlyAlertHTML = (
          <Alert className="mb-3" variant="secondary">
            {_401kMaxReachedEarlyNote}
          </Alert>
        );
      }
    }

    // edge case for last paycheck and autocap and backload is true
    if (_401kAutoCap && backloadToggle && i == numberOfPayPeriods - 1) {
      contributionAmount = Math.min(
        _401k_maximum_contribution_individual - cumulativeAmountIndividual,
        _401k_maximum_contribution_total - cumulativeAmountTotal,
        (maxContributionFromPaycheck / 100) * payPerPayPeriod
      );
      match =
        Math.ceil((contributionAmount / (salary / numberOfPayPeriods)) * 100) /
        100;
    }

    // Employer match cannot exceed contribution amount
    employerMatchAmount = Math.min(
      (employerMatch / 100) * payPerPayPeriod,
      contributionAmount
    );
    if (
      i > 0 &&
      table_rows[i - 1][7] + contributionAmount > _401kMaximum &&
      megabackdoorEligible
    ) {
      employerMatchAmount = 0;
    } else if (
      i > 0 &&
      table_rows[i - 1][7] + employerMatchAmount + contributionAmount >
        _401kMaximum &&
      _401kAutoCap &&
      megabackdoorEligible
    ) {
      employerMatchAmount =
        _401kMaximum - table_rows[i - 1][7] - contributionAmount;
    }

    //if prev row exists, add value to period contribution, else use period contribution
    cumulativeAmountIndividual =
      i != 0 ? table_rows[i - 1][4] + contributionAmount : contributionAmount;

    cumulativeAmountEmployer =
      i != 0 ? table_rows[i - 1][6] + employerMatchAmount : employerMatchAmount;

    cumulativeAmountTotal =
      i != 0
        ? table_rows[i - 1][7] + contributionAmount + employerMatchAmount
        : contributionAmount + employerMatchAmount;

    // if last paycheck, cumulative is < 401k max, and last match isnt the maximum,
    // with the last check meaning you're unable to hit maximum contribution limit,
    // add dagger to let user know to bump up contribution
    if (
      !_401kAutoCap &&
      i === numberOfPayPeriods - 1 &&
      Math.round(cumulativeAmountIndividual) != _401kMaximumIndividual &&
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
      salary / numberOfPayPeriods,
      match,
      contributionAmount,
      cumulativeAmountIndividual,
      employerMatchAmount,
      cumulativeAmountEmployer,
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
   * If payPeriodsSoFar is 0, set amountContributedSoFarIndividual to 0
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
        changeAmountContributedSoFarIndividual(0);
        changeAmountContributedSoFarEmployer(0);
        changeAmountContributedSoFarMBD(0);
      }
    }
    if (changeFunction === changeNumberOfPayPeriodsSoFar) {
      if (value === 0) {
        changeAmountContributedSoFarIndividual(0);
        changeAmountContributedSoFarEmployer(0);
        changeAmountContributedSoFarMBD(0);
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
      <Header titleName="401k Maximize" />

      <main className={styles.main}>
        <h1>401k Maximizer</h1>
        <p>
          Here we will maximize your 401k contribution with equal period
          contributions.
        </p>
        {/* <p>
          We will prioritize individual contributions, employer match, then anything else.
        </p> */}
        <p>
          We will also assume employer match cannot exceed individual
          contributions for any pay period.
        </p>
      </main>

      <div className={styles.content}>
        <Form className={styles.form}>
          <Form.Label>Annual Salary</Form.Label>
          <TooltipOnHover
            text="Enter your compensation that is eligible for 401k contributions."
            nest={
              <InputGroup className="mb-3 w-100">
                <InputGroup.Text>$</InputGroup.Text>
                <Form.Control
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  value={formatStateValue(salary)}
                  onChange={(e) => updateAmount(e, changeSalary, 0)}
                />
              </InputGroup>
            }
          />
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

          <Form.Label>Individual Contributions to 401k so far</Form.Label>
          <InputGroup className="mb-3 w-100">
            <InputGroup.Text>$</InputGroup.Text>
            <Form.Control
              disabled={numberOfPayPeriodsSoFar === 0}
              type="number"
              onWheel={(e) => e.currentTarget.blur()}
              value={formatStateValue(amountContributedSoFarIndividual)}
              onChange={(e) =>
                updateAmount(
                  e,
                  changeAmountContributedSoFarIndividual,
                  0,
                  _401kMaximumIndividual
                )
              }
            />
          </InputGroup>

          <Form.Label>Employer Contributions to 401k so far</Form.Label>
          <InputGroup className="mb-3 w-100">
            <InputGroup.Text>$</InputGroup.Text>
            <Form.Control
              disabled={numberOfPayPeriodsSoFar === 0}
              type="number"
              onWheel={(e) => e.currentTarget.blur()}
              value={formatStateValue(amountContributedSoFarEmployer)}
              onChange={(e) =>
                updateAmount(
                  e,
                  changeAmountContributedSoFarEmployer,
                  0,
                  _401kMaximum - _401kMaximumIndividual
                )
              }
            />
          </InputGroup>

          <Form.Label>Effective Employer 401k Match</Form.Label>
          <TooltipOnHover
            text="% of income between 0 and 100."
            nest={
              <InputGroup className="mb-3 w-100">
                <Form.Control
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  value={formatStateValue(employerMatch)}
                  onChange={(e) => updateContribution(e, changeEmployerMatch)}
                />
                <InputGroup.Text>%</InputGroup.Text>
              </InputGroup>
            }
          />

          <Form.Label>Maximum Paycheck Contribution for 401k</Form.Label>
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

          {/* <TooltipOnHover
              text="Check this if you are able to do an After-Tax Traditional Contribution with In Plan Conversion to Roth."
              nest={
                <InputGroup className="mb-3 w-50">
                <Form.Check type="checkbox" onChange={() => changeMegabackdoorEligible(!megabackdoorEligible)} label="Eligible For Mega Backdoor Roth" checked={megabackdoorEligible} />
                </InputGroup>
              }
            /> */}

          <TooltipOnHover
            text="Check this if your 401k automatically caps contributions at limits."
            nest={
              <InputGroup className="mb-3 w-75">
                <Form.Check
                  type="checkbox"
                  onChange={() => change401kAutoCap(!_401kAutoCap)}
                  label="401k Automatically Caps Contributions"
                  checked={_401kAutoCap}
                />
              </InputGroup>
            }
          />

          {_401kAutoCap && (
            <TooltipOnHover
              text="You may max out contributions early and miss match. Enable this to backload contributions into last pay period."
              nest={
                <InputGroup className="mb-3 w-75">
                  <Form.Check
                    type="checkbox"
                    onChange={() => changeBackloadToggle(!backloadToggle)}
                    label="Backload Contribution For Maxing Out"
                    checked={backloadToggle}
                  />
                </InputGroup>
              }
            />
          )}

          <Form.Label>401k Maximum for Individual Contribution</Form.Label>
          <TooltipOnHover
            text="The maximum in 2023 is $22500. You can decrease this if you have contributed to another 401k."
            nest={
              <InputGroup className="mb-3 w-100">
                <InputGroup.Text>$</InputGroup.Text>
                <Form.Control
                  type="number"
                  onWheel={(e) => e.currentTarget.blur()}
                  value={formatStateValue(_401kMaximumIndividual)}
                  onChange={(e) => updateAmount(e, change401kMaximumIndividual)}
                />
              </InputGroup>
            }
          />

          {megabackdoorEligible && (
            <Form.Group>
              <Form.Label>401k Maximum for Total Contribution</Form.Label>
              <TooltipOnHover
                text="The maximum in 2023 is $66000. You can decrease this if you have contributed to another 401k."
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
            </Form.Group>
          )}
        </Form>

        <div className={styles.table}>
          <Table hover responsive size="sm" className="mb-3">
            <thead>
              <tr>
                <th>Pay Period</th>
                <th>Pay</th>
                <th>Contribution %</th>
                <th>Contribution $</th>
                <th>Cumulative $</th>
                <th>Employer Contribution $</th>
                <th>Employer Cumulative $</th>
                <th>Total Cumulative $</th>
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
                  <td>{formatCurrency(row[5])}</td>
                  <td>{formatCurrency(row[6])}</td>
                  <td>{formatCurrency(row[7])}</td>
                </tr>
              ))}
            </tbody>
          </Table>
          {payPeriodAlreadyPassedAlertHTML}
          {_401kMaxNotReachedAlertHTML}
          {_401kMaxReachedEarlyAlertHTML}
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default Maximize;
