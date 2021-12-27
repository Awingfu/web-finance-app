import React from 'react';
import { Form, FloatingLabel, OverlayTrigger, Tooltip, Table } from 'react-bootstrap';
import styles from '../styles/Paycheck.module.scss';
import Header from '../src/Header';
import Footer from '../src/Footer';

/**
 * TODO: 
 * 1. Create more advanced table
 * 2. perhaps split tool to do a month by month breakdown (e.g. to factor in maxing SSN)
 * 3. Split form and table + functions to separate files
 */

const formatCurrency = (num: number) : string => {
  let formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    // These options are needed to round to whole numbers if that's what you want.
    //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
    //maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
  });

  return formatter.format(num);
};

// All types of Pay schedules
enum PAY_SCHEDULE {
  BIWEEKLY = "Biweekly",
  BIMONTHLY = "Bimonthly",
  MONTHLY = "Monthly"
}

const convertAmountToPaySchedule = (amt: number, paySchedule: string): number => {
  switch(paySchedule) {
    case PAY_SCHEDULE.BIWEEKLY:
      return amt / 26;
    case PAY_SCHEDULE.BIMONTHLY:
      return amt / 24;
    case PAY_SCHEDULE.MONTHLY:
      return amt / 12;
    default:
      console.log("Invalid pay schedule detected");
      return amt;
  }
}

// Tooltips
const renderTooltip = (props: any) => (
  <Tooltip id="button-tooltip" {...props}>
    {props.text}
  </Tooltip>
);

/** enter salary
 * 3 col table
 * Radio button for paycheck frequency
 * $ total HSA conribution
 * company match
 * X% match on Y% of contribution, % base contribution (no match)
 * % selection for 401k, roth 401k, after tax 401k (mega),
 * % selection for tIRA, roth IRA
 * "" | Annual | Paycheck 
 * Gross Pay |
 * 
 * 
 * Net Pay
 * 
 * Next goals:
 * State income tax withholding
 * bonuses -> one time or distribute into paycheck/yr, also whether it contributes to benefits
 * save info to local storage + clear data button -> so we don't lose data on refresh
 * 
 * */ 
function Paycheck() {
  const [salary, changeSalary] = React.useState(50000);
  const [paySchedule, changePaySchedule] = React.useState(PAY_SCHEDULE.BIWEEKLY);

  const update = (e: React.FormEvent<HTMLElement>, changeFunction: { (value: React.SetStateAction<any>): void; }) => {
    changeFunction((e.target as HTMLInputElement).value);
  };

    return (
      <div className={styles.container}>
        <Header titleName='Paycheck Calculator'/>
  
        <main className={styles.main}>
          <h1 className={styles.title}>
            Paycheck Calculator
          </h1>
  
          <p className={styles.description}>
            Here we will estimate your take home pay!
          </p>
        </main>

        <Form className={styles.paycheckForm}>
          <Form.Group className="mb-3" controlId="form.Salary">
            <FloatingLabel
              controlId="floatingInput"
              label="Annual Salary"
              className="mb-3"
            >
              <Form.Control type="number" value={salary} onChange={e => update(e, changeSalary)}/>
            </FloatingLabel>
          </Form.Group>
          <Form.Group className="mb-3" controlId="form.PaycheckSchedule" onChange={e => update(e, changePaySchedule)}>
            <Form.Label> Paycheck Frequency </Form.Label>
            <br/>
            <OverlayTrigger
              placement="bottom"
              delay={{ show: 250, hide: 400 }}
              overlay={renderTooltip({text:"Every two weeks"})}
            >
              <Form.Check
                inline
                defaultChecked
                label={PAY_SCHEDULE.BIWEEKLY}
                value={PAY_SCHEDULE.BIWEEKLY}
                name="paycheck_schedule"
                type="radio"
                id="paycheck-schedule-radio-1"
              />
            </OverlayTrigger>
            <OverlayTrigger
              placement="bottom"
              delay={{ show: 250, hide: 400 }}
              overlay={renderTooltip({text:"Twice a month"})}
            >
              <Form.Check
                inline
                label={PAY_SCHEDULE.BIMONTHLY}
                value={PAY_SCHEDULE.BIMONTHLY}
                name="paycheck_schedule"
                type="radio"
                id="paycheck-schedule-radio-2"
              />
            </OverlayTrigger>
            <Form.Check
              inline
              label={PAY_SCHEDULE.MONTHLY}
              value={PAY_SCHEDULE.MONTHLY}
              name="paycheck_schedule"
              type="radio"
              id="paycheck-schedule-radio-3"
            />
          </Form.Group>
        </Form>

        <div className={styles.table}>
          <Table striped bordered hover responsive size="sm">
            <thead>
              <tr>
                <th></th>
                <th>Annual</th>
                <th>Paycheck - {paySchedule}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Gross Income</td>
                <td>{formatCurrency(salary)}</td>
                <td>{formatCurrency(convertAmountToPaySchedule(salary, paySchedule))}</td>
              </tr>
              <tr>
                <td>2</td>
                <td>Jacob</td>
                <td>Thornton</td>
              </tr>
              <tr>
                <td>3</td>
                <td colSpan={2}>Larry the Bird</td>
              </tr>
            </tbody>
          </Table>
        </div>
        <Footer />
      </div>
    )
}
  
export default Paycheck;
  