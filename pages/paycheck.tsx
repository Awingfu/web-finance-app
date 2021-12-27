import React from 'react';
import { Form, OverlayTrigger, Tooltip, Table, InputGroup} from 'react-bootstrap';
import styles from '../styles/Paycheck.module.scss';
import Header from '../src/Header';
import Footer from '../src/Footer';

/**
 * TODO: 
 * 1. Create more advanced table
 *  - bonuses -> one time or distribute into paycheck/yr, also whether it contributes to benefits
 *  - Company match
 *  - Other tax deductions, company match on HSA/FSA
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
 * % selection for 401k, roth 401k, after tax 401k (mega),
 * % selection for tIRA, roth IRA
 * Table formatting in globals.scss
 * 
 * Next goals:
 * State income tax withholding
 * save info to local storage + clear data button -> so we don't lose data on refresh
 * 
 * */ 
function Paycheck() {
  const [salary, changeSalary] = React.useState(50000);
  const [paySchedule, changePaySchedule] = React.useState(PAY_SCHEDULE.BIWEEKLY);
  const [t401kContribution, changeT401kContribution] = React.useState(0);
  const [r401kContribution, changeR401kContribution] = React.useState(0);
  const [tIRAContribution, changeTIRAContribution] = React.useState(0);
  const [rIRAContribution, changeRIRAContribution] = React.useState(0);

  const update = (e: React.FormEvent<HTMLElement>, changeFunction: { (value: React.SetStateAction<any>): void; }) => {
    if (changeFunction === changeSalary) {
      let value = parseFloat((e.target as HTMLInputElement).value); 
      if (isNaN(value) || value < 0) {
        value = 0;
      }
      changeFunction(value);
    } else {
      changeFunction((e.target as HTMLInputElement).value);
    }
  };

  const updateContribution = (e: React.FormEvent<HTMLElement>, changeFunction: { (value: React.SetStateAction<any>): void; }) => {
    let value = parseInt((e.target as HTMLInputElement).value); 
    if (value < 0) {
      value = 0;
    } else if (value > 90) {
      value = 90;
    }
    changeFunction(value);
  };

    return (
      <div className={styles.container}>
        <Header titleName='Paycheck Calculator'/>
  
        <main className={styles.main}>
          <h1 className={styles.title}>
            Paycheck Calculator
          </h1>
  
          <p className={styles.description}>
            Here we will estimate your take home pay (for 2022)!
          </p>
        </main>

        <Form className={styles.paycheckForm}>
          <Form.Label>Annual Salary</Form.Label>
          <InputGroup className="mb-3 w-100"> 
            <InputGroup.Text>$</InputGroup.Text>
            <Form.Control type="number" value={salary} onChange={e => update(e, changeSalary)}/>
          </InputGroup>

          <Form.Group className="mb-3" onChange={e => update(e, changePaySchedule)}>
            <Form.Label> Paycheck Frequency </Form.Label>
            <br/>
            <OverlayTrigger
              placement="bottom"
              delay={{ show: 150, hide: 200 }}
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
              delay={{ show: 150, hide: 200 }}
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

          <Form.Label>401k Contribution</Form.Label>
          <OverlayTrigger
              placement="bottom"
              delay={{ show: 150, hide: 200 }}
              overlay={renderTooltip({text:"Integer between 0 and 90"})}
            >
          <InputGroup className="mb-3 w-100"> 
            <InputGroup.Text>Traditional:</InputGroup.Text>
            <Form.Control type="number" value={t401kContribution} onChange={e => updateContribution(e, changeT401kContribution)}/>
            <InputGroup.Text>%</InputGroup.Text>
          </InputGroup>
          </OverlayTrigger>
          <OverlayTrigger
              placement="bottom"
              delay={{ show: 150, hide: 200 }}
              overlay={renderTooltip({text:"Integer between 0 and 90"})}
            >
          <InputGroup className="mb-3 w-100"> 
            <InputGroup.Text>Roth:</InputGroup.Text>
            <Form.Control type="number" value={r401kContribution} onChange={e => updateContribution(e, changeR401kContribution)}/>
            <InputGroup.Text>%</InputGroup.Text>
          </InputGroup>
          </OverlayTrigger>

          <Form.Label>IRA Contribution</Form.Label>
          <OverlayTrigger
              placement="bottom"
              delay={{ show: 150, hide: 200 }}
              overlay={renderTooltip({text:"Integer between 0 and 90"})}
            >
          <InputGroup className="mb-3 w-100"> 
            <InputGroup.Text>Traditional:</InputGroup.Text>
            <Form.Control type="number" value={tIRAContribution} onChange={e => updateContribution(e, changeTIRAContribution)}/>
            <InputGroup.Text>%</InputGroup.Text>
          </InputGroup>
          </OverlayTrigger>
          <OverlayTrigger
              placement="bottom"
              delay={{ show: 150, hide: 200 }}
              overlay={renderTooltip({text:"Integer between 0 and 90"})}
            >
          <InputGroup className="mb-3 w-100"> 
            <InputGroup.Text>Roth:</InputGroup.Text>
            <Form.Control type="number" value={rIRAContribution} onChange={e => updateContribution(e, changeRIRAContribution)}/>
            <InputGroup.Text>%</InputGroup.Text>
          </InputGroup>
          </OverlayTrigger>
        </Form>

        <div className={styles.table}>
          <Table hover responsive size="sm">
            <thead>
              <tr>
                <th></th>
                <th>Annual</th>
                <th className={styles.specialHeaderWidth}>Paycheck - {paySchedule}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={styles.thicc}>Gross Income</td>
                <td>{formatCurrency(salary)}</td>
                <td>{formatCurrency(convertAmountToPaySchedule(salary, paySchedule))}</td>
              </tr>
              <tr>
                <td colSpan={3} className={styles.thicc}>Pre-Tax Deductions</td>
              </tr>
              <tr>
                <td>Traditional 401k</td>
                <td>placeholder</td>
                <td>placeholder</td>
              </tr>
              <tr>
                <td>Traditional IRA</td>
                <td>placeholder</td>
                <td>placeholder</td>
              </tr>
              <tr>
                <td>Medical Insurance</td>
                <td>placeholder</td>
                <td>placeholder</td>
              </tr>
              <tr>
                <td>Commuter Benefits</td>
                <td>placeholder</td>
                <td>placeholder</td>
              </tr>
              <tr>
                <td>HSA/FSA</td>
                <td>placeholder</td>
                <td>placeholder</td>
              </tr>
              <tr>
                <td>Taxable Pay</td>
                <td>placeholder</td>
                <td>placeholder</td>
              </tr>
              <tr>
                <td colSpan={3} className={styles.thicc}>Tax Withholdings</td>
              </tr>
              <tr>
                <td>Federal Withholding</td>
                <td>placeholder</td>
                <td>placeholder</td>
              </tr>
              <tr>
                <td>FICA</td>
                <td>placeholder</td>
                <td>placeholder</td>
              </tr>
              <tr>
                <td>Medicare</td>
                <td>placeholder</td>
                <td>placeholder</td>
              </tr>
              <tr>
                <td>State Withholding</td>
                <td>placeholder</td>
                <td>placeholder</td>
              </tr>
              <tr>
                <td>Net Pay</td>
                <td>placeholder</td>
                <td>placeholder</td>
              </tr>
              <tr>
                <td colSpan={3} className={styles.thicc}>Post-Tax Deductions</td>
              </tr>
              <tr>
                <td>Roth 401k</td>
                <td>placeholder</td>
                <td>placeholder</td>
              </tr>
              <tr>
                <td>Roth IRA</td>
                <td>placeholder</td>
                <td>placeholder</td>
              </tr>
              <tr>
                <td className={styles.thicc}>Take Home Pay</td>
                <td>placeholder</td>
                <td>placeholder</td>
              </tr>
            </tbody>
          </Table>
        </div>
        <Footer />
      </div>
    )
}
  
export default Paycheck;
  