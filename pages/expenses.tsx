import React from "react";
import { Alert, Form, InputGroup, Table } from "react-bootstrap";
import { Header, Footer, TooltipOnHover } from "../src/components";
import {
  formatCurrency,
  formatPercent,
  formatStateValue,
} from "../src/utils";
import { _401k_maximum_contribution_individual } from "../src/utils/constants";
import styles from "../styles/Retirement.module.scss";

/**
 * Expense Planner
 * TODO: 
 * 1. Make categories more flexible?
 */

function Expenses() {

  // annual numbers
  const [takeHomePay, changeTakeHomePay] = React.useState(50000);
  // Shelter
  const [housing, changeHousing] = React.useState(50000);
  const [utilities, changeUtilities] = React.useState(50000);
  const [homeInsurance, changeHomeInsurance] = React.useState(50000);
  const [transportation, changeTransportation] = React.useState(50000);
  const [otherHousing, changeOtherHousing] = React.useState(50000);

  // Food
  const [groceries, changeGroceries] = React.useState(50000);
  const [dining, changeDining] = React.useState(50000);
  
  // Wellness and Other Necessities
  const [healthcare, changeHealthcare] = React.useState(50000);
  const [loans, changeLoans] = React.useState(50000);
  const [insurance, changeInsurance] = React.useState(50000);
  const [family, changeFamily] = React.useState(50000)

  // Discretionary 
  const [subscriptions, changeSubscriptions] = React.useState(50000);
  const [entertainment, changeEntertainment] = React.useState(50000);
  const [apparel, changeApparel] = React.useState(50000);
  const [donations, changeDonations] = React.useState(50000);
  const [travel, changeTravel] = React.useState(50000);
  const [hobbies, changeHobbies] = React.useState(50000)
  const [other, changeOther] = React.useState(50000)

  const update = (e: React.FormEvent<HTMLElement>, changeFunction: { (value: React.SetStateAction<any>): void; }) => {
    changeFunction((e.target as HTMLInputElement).value);
  };

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
    changeFunction(value);
  };

  return (
    <div className={styles.container}>
      <Header titleName="Expense Planner" />

      <main className={styles.main}>
        <h1>Expense Planner</h1>
        <p>
          Here we will plan your expenses
        </p>
      </main>

      <div className={styles.content}>
        <Form className={styles.form}>
          <Form.Label>Take Home Pay</Form.Label>
          <InputGroup className="mb-3 w-100">
            <InputGroup.Text>$</InputGroup.Text>
            <Form.Control
              type="number"
              value={formatStateValue(takeHomePay)}
              onChange={(e) => updateAmount(e, changeTakeHomePay)}
            />
          </InputGroup>
        </Form>

        {/* <Form.Group className="mb-3" onChange={e => update(e, changePaySchedule)}>
            <Form.Label> Paycheck Frequency </Form.Label>
            <br />
            <TooltipOnHover text="Every two weeks" nest={
              <Form.Check
                inline
                defaultChecked
                label={PAY_SCHEDULE.BIWEEKLY}
                value={PAY_SCHEDULE.BIWEEKLY}
                name="paycheck_schedule"
                type="radio"
                id="paycheck-schedule-radio-1"
              />} />
            <TooltipOnHover text="Twice a month" nest={
              <Form.Check
                inline
                label={PAY_SCHEDULE.BIMONTHLY}
                value={PAY_SCHEDULE.BIMONTHLY}
                name="paycheck_schedule"
                type="radio"
                id="paycheck-schedule-radio-2"
              />} />
            <Form.Check
              inline
              label={PAY_SCHEDULE.MONTHLY}
              value={PAY_SCHEDULE.MONTHLY}
              name="paycheck_schedule"
              type="radio"
              id="paycheck-schedule-radio-3"
            />
          </Form.Group> */}


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
              
            </tbody>
          </Table>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default Expenses;
