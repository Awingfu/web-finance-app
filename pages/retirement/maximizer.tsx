import React from "react";
import { Alert, Form, InputGroup, Table } from "react-bootstrap";
import { Header, Footer, TooltipOnHover } from "../../src/components";
import {
  formatCurrency,
  formatPercent,
  formatStateValue,
} from "../../src/utils";
import { _401k_maximum_contribution_individual, _401k_maximum_contribution_total } from "../../src/utils/constants";
import styles from "../../styles/Retirement.module.scss";

function Maximizer() {
  const [salary, changeSalary] = React.useState(50000);
  const [_401kMaximumIndividual, change401kMaximumIndividual] = React.useState(
    _401k_maximum_contribution_individual
  );
  const [_401kMaximum, change401kMaximum] = React.useState(
    _401k_maximum_contribution_total
  );
  const [numberOfPayPeriods, changeNumberOfPayPeriods] = React.useState(26);
  const [numberOfPayPeriodsSoFar, changeNumberofPayPeriodsSoFar] =
    React.useState(0);
  const [amountContributedSoFarIndividual, changeAmountContributedSoFarIndividual] =
    React.useState(0);
  const [amountContributedSoFarCompany, changeAmountContributedSoFarCompany] =
    React.useState(0);
  const [amountContributedSoFarMBD, changeAmountContributedSoFarMBD] =
    React.useState(0);
  // make sure to divide minContributionForMaxMatch, maxContributionFromPaycheck, 
  // and companyMatch by 100 to get percentage
  // const [minContributionForMaxMatch, changeMinContributionForMaxMatch] =
  //   React.useState(5);
  const [maxContributionFromPaycheck, changeMaxContributionFromPaycheck] =
    React.useState(90);
  const [companyMatch, changeCompanyMatch] = React.useState(5);

  // Toggle
  const [megabackdoorEligible, changeMegabackdoorEligible] = React.useState(false);
  
  const _401kMaxNotReachedIcon = "\u2020"; // dagger
  const _401kMaxNotReachedNote =
    _401kMaxNotReachedIcon +
    " If your company automatically caps your 401k contribution, bump the last contribution up in order to fully max your 401k.";
  const _401kMaxReachedEarlyIcon = "\u2021"; // double dagger
  const _401kMaxReachedEarlyNote =
    _401kMaxReachedEarlyIcon +
    " You will reach your maximum contribution early even with minimum matching available. Congrats. All future contributions will not be possible if your employer caps your contributions";

  let _401kMaxNotReachedAlertHTML = <></>;
  let _401kMaxReachedEarlyAlertHTML = <></>;

  // Calculations
  const payPerPayPeriod = salary / numberOfPayPeriods;
  const numberOfPayPeriodsLeft = numberOfPayPeriods - numberOfPayPeriodsSoFar;
  const amountLeftToContributeIndividual = _401kMaximumIndividual - amountContributedSoFarIndividual;
  const contributionPerRemainingPeriodIndividual = amountLeftToContributeIndividual / numberOfPayPeriodsLeft;
  // This is rounded down since most companies won't let you select exact percentage
  const matchPercentIndividual = Math.floor((contributionPerRemainingPeriodIndividual / payPerPayPeriod) * 100) / 100;

  // Data for table
  const table_rows: any[][] = [];
  for (let i = 0; i < numberOfPayPeriods; i++) {
    // key for paycheck number. Index start at 1 cuz finance
    let concatKey = (i + 1).toString();

    // edge cases to just insert 0
    if (i < numberOfPayPeriodsSoFar - 1) {
      concatKey += " (Already passed)";
      table_rows.push([concatKey, payPerPayPeriod, 0, 0, 0, 0, 0]);
      continue;
    } else if (i == numberOfPayPeriodsSoFar - 1) {
      concatKey += " (Already passed)";
      table_rows.push([
        concatKey,
        payPerPayPeriod,
        0,
        amountContributedSoFarIndividual,
        amountContributedSoFarIndividual,
        amountContributedSoFarCompany,
        amountContributedSoFarCompany,
        amountContributedSoFarCompany + amountContributedSoFarIndividual,
      ]);
      continue;
    }

    let match = matchPercentIndividual;
    let contributionAmount = (match * salary) / numberOfPayPeriods;

    // TODO Fancy math to ensure it doesnt exceed max
    let companyMatchAmount = companyMatch / 100 * payPerPayPeriod; 

    //if prev row exists, add value to period contribution, else use period contribution
    let cumulativeAmountIndividual: number =
      i != 0 ? table_rows[i - 1][4] + contributionAmount : contributionAmount;

    let cumulativeAmountCompany: number =
      i != 0 ? table_rows[i - 1][6] + companyMatchAmount : companyMatchAmount;

    let cumulativeAmountTotal: number = 
      i != 0 ? table_rows[i - 1][7] + contributionAmount + companyMatchAmount : contributionAmount + companyMatchAmount;

    // if last paycheck, cumulative is < 401k max, and last match isnt the maximum,
    // with the last check meaning you're unable to hit maximum contribution limit,
    // add dagger to let user know to bump up contribution
    if (
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
      companyMatchAmount,
      cumulativeAmountCompany,
      cumulativeAmountTotal
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
      changeNumberofPayPeriodsSoFar(value - 1);
      if (value === 1) {
        changeAmountContributedSoFarIndividual(0);
        changeAmountContributedSoFarCompany(0);
        changeAmountContributedSoFarMBD(0);
      }
    }
    if (changeFunction === changeNumberofPayPeriodsSoFar) {
      if (value === 0) {
        changeAmountContributedSoFarIndividual(0);  
        changeAmountContributedSoFarCompany(0);      
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
      <Header titleName="401k Optimizer" />

      <main className={styles.main}>
        <h1>401k Optimizer</h1>
        <p>
          Here we will maximize your 401k contribution assuming equal period contributions and assuming your plan does not automatically stop contributions.
        </p>
      </main>

      <div className={styles.content}>
        <Form className={styles.form}>

          <TooltipOnHover
              text="Check this if you are able to do an After-Tax Traditional Contribution with In Plan Conversion to Roth."
              nest={
                <InputGroup className="mb-3 w-100">
                <Form.Check type="checkbox" onChange={() => changeMegabackdoorEligible(!megabackdoorEligible)} label="Eligible For Mega Backdoor Roth" checked={megabackdoorEligible} />
                </InputGroup>
              }
            />

          <Form.Label>401k Maximum for Individual Contribution</Form.Label>
            <TooltipOnHover
              text="The maximum in 2023 is $22500. You can decrease this if you have contributed to another 401k."
              nest={
                <InputGroup className="mb-3 w-100">
                  <InputGroup.Text>$</InputGroup.Text>
                  <Form.Control
                    type="number" onWheel={e => e.currentTarget.blur()}
                    value={formatStateValue(_401kMaximumIndividual)}
                    onChange={(e) => updateAmount(e, change401kMaximumIndividual)}
                  />
                </InputGroup>
              }
            />
          
          {megabackdoorEligible &&
          <Form.Group>
          <Form.Label>401k Maximum for Total Contribution</Form.Label>
            <TooltipOnHover
              text="The maximum in 2023 is $66000. You can decrease this if you have contributed to another 401k."
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
            /></Form.Group>
          }

          <Form.Label>Annual Base Salary</Form.Label>
          <TooltipOnHover
              text="Enter your compensation that is eligible for 401k contributions."
              nest={
                <InputGroup className="mb-3 w-100">
                  <InputGroup.Text>$</InputGroup.Text>
                  <Form.Control
                    type="number" onWheel={e => e.currentTarget.blur()}
                    value={formatStateValue(salary)}
                    onChange={(e) => updateAmount(e, changeSalary)}
                  />
                </InputGroup>
              }
            />
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

          <Form.Label>Individual Contributions to 401k so far</Form.Label>
          <InputGroup className="mb-3 w-100">
            <InputGroup.Text>$</InputGroup.Text>
            <Form.Control
              disabled={numberOfPayPeriodsSoFar === 0}
              type="number" onWheel={e => e.currentTarget.blur()}
              value={formatStateValue(amountContributedSoFarIndividual)}
              onChange={(e) =>
                updateAmount(e, changeAmountContributedSoFarIndividual, 0, _401kMaximumIndividual)
              }
            />
          </InputGroup>

          <Form.Label>Company Contributions to 401k so far</Form.Label>
          <InputGroup className="mb-3 w-100">
            <InputGroup.Text>$</InputGroup.Text>
            <Form.Control
              disabled={numberOfPayPeriodsSoFar === 0}
              type="number" onWheel={e => e.currentTarget.blur()}
              value={formatStateValue(amountContributedSoFarCompany)}
              onChange={(e) =>
                updateAmount(e, changeAmountContributedSoFarCompany, 0, _401kMaximum - _401kMaximumIndividual)
              }
            />
          </InputGroup>

          <Form.Label>
            Effective Company 401k Match
          </Form.Label>
          <TooltipOnHover
            text="% of income between 0 and 100."
            nest={
              <InputGroup className="mb-3 w-100">
                <Form.Control
                  type="number" onWheel={e => e.currentTarget.blur()}
                  value={formatStateValue(companyMatch)}
                  onChange={(e) =>
                    updateContribution(e, changeCompanyMatch)
                  }
                />
                <InputGroup.Text>%</InputGroup.Text>
              </InputGroup>
            }
          />

          <Form.Label>
            Maximum Paycheck Contribution Allowed for 401k
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
                <th>Pay</th>
                <th>Individual Contribution %</th>
                <th>Individual Contribution $</th>
                <th>Individual Cumulative Contribution</th>
                <th>Company Contribution $</th>
                <th>Company Cumulative Contribution</th>
                <th>Total Cumulative Contributed</th>
                
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
          {_401kMaxNotReachedAlertHTML}
          {_401kMaxReachedEarlyAlertHTML}
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default Maximizer;
