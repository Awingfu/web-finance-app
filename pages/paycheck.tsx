import React from 'react';
import { Form, OverlayTrigger, Tooltip, Table, InputGroup, DropdownButton, Dropdown } from 'react-bootstrap';
import styles from '../styles/Paycheck.module.scss';
import Header from '../src/Header';
import Footer from '../src/Footer';

/**
 * TODO: 
 * 1. Create more advanced table
 *  - bonuses -> one time or distribute into paycheck/yr, also whether it contributes to benefits
 *  - Company match
 *  - Other tax deductions, company match on HSA/FSA
 *  - multiple states
 *  - accounting format to have withholdings show as red and in parentheses
 *  - side by side view
 * 2. perhaps split tool to do a month by month breakdown (e.g. to factor in maxing SSN)
 * 3. Split form and table + functions to separate files
 */

const formatCurrency = (num: number): string => {
  let formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    // These options are needed to round to whole numbers if that's what you want.
    //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
    //maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
  });

  return formatter.format(num);
};

// Contribution frequencies
enum FREQUENCIES {
  PAYCHECK = "Paycheck",
  DAY = "Day",
  WEEK = "Week",
  MONTH = "Month",
  ANNUM = "Annum",
}

const FREQUENCY_TO_ANNUM = {
  [FREQUENCIES.PAYCHECK]: 0, // this shouldn't be used
  [FREQUENCIES.DAY]: 365, // simple assumption
  [FREQUENCIES.WEEK]: 52,
  [FREQUENCIES.MONTH]: 12,
  [FREQUENCIES.ANNUM]: 1,
}

const ALL_FREQUENCIES = Object.keys(FREQUENCIES);
// console.log(ALL_FREQUENCIES)

// Types of pay schedules
enum PAY_SCHEDULE {
  WEEKLY = "Weekly",
  BIWEEKLY = "Biweekly",
  BIMONTHLY = "Bimonthly",
  MONTHLY = "Monthly",
}

const PAY_SCHEDULE_TO_ANNUM = {
  [PAY_SCHEDULE.WEEKLY]: 52,
  [PAY_SCHEDULE.BIWEEKLY]: 26,
  [PAY_SCHEDULE.BIMONTHLY]: 24,
  [PAY_SCHEDULE.MONTHLY]: 12,
}

const ALL_PAY_SCHEDULES = Object.keys(PAY_SCHEDULE);

const calculateContributionFromPercentage = (salary: number, contributionPercentage: number): number => {
  return salary * (contributionPercentage / 100);
}

const convertAnnualAmountToPaySchedule = (amount: number, paySchedule: PAY_SCHEDULE): number => {
  return amount / PAY_SCHEDULE_TO_ANNUM[paySchedule];
}

const calculateAnnualFromAmountAndFrequency = (contributionAmount: number,
  frequency: FREQUENCIES = FREQUENCIES.ANNUM,
  paySchedule: PAY_SCHEDULE = PAY_SCHEDULE.BIWEEKLY): number => {
  if (frequency === FREQUENCIES.PAYCHECK) {
    return contributionAmount * PAY_SCHEDULE_TO_ANNUM[paySchedule];
  } else {
    return contributionAmount * FREQUENCY_TO_ANNUM[frequency]
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
  // Form States
  const [salary, changeSalary] = React.useState(50000);
  const [paySchedule, changePaySchedule] = React.useState(PAY_SCHEDULE.BIWEEKLY);

  // Pre Tax
  const [t401kContribution, changeT401kContribution] = React.useState(0);
  const t401k_annual = calculateContributionFromPercentage(salary, t401kContribution);
  const t401k_paycheck = convertAnnualAmountToPaySchedule(t401k_annual, paySchedule);

  const [tIRAContribution, changeTIRAContribution] = React.useState(0);
  const tIRA_annual = calculateContributionFromPercentage(salary, tIRAContribution);
  const tIRA_paycheck = convertAnnualAmountToPaySchedule(tIRA_annual, paySchedule);

  const [medicalContribution, changeMedicalContribution] = React.useState(0);
  const [medicalContributionFrequency, changeMedicalContributionFrequency] = React.useState(FREQUENCIES.PAYCHECK);
  const medical_annual = calculateAnnualFromAmountAndFrequency(medicalContribution, medicalContributionFrequency, paySchedule);
  const medical_paycheck = convertAnnualAmountToPaySchedule(medical_annual, paySchedule);

  const [commuterContribution, changeCommuterContribution] = React.useState(0);
  const [commuterContributionFrequency, changeCommuterContributionFrequency] = React.useState(FREQUENCIES.PAYCHECK);
  const commuter_annual = calculateAnnualFromAmountAndFrequency(commuterContribution, commuterContributionFrequency, paySchedule);
  const commuter_paycheck = convertAnnualAmountToPaySchedule(commuter_annual, paySchedule);

  const [hsaContribution, changeHSAContribution] = React.useState(0);
  const [hsaContributionFrequency, changeHSAContributionFrequency] = React.useState(FREQUENCIES.PAYCHECK);
  const hsa_annual = calculateAnnualFromAmountAndFrequency(hsaContribution, hsaContributionFrequency, paySchedule);
  const hsa_paycheck = convertAnnualAmountToPaySchedule(hsa_annual, paySchedule);

  const [otherPreTaxContribution, changeOtherPreTaxContribution] = React.useState(0);
  const [otherPreTaxContributionFrequency, changeOtherPreTaxContributionFrequency] = React.useState(FREQUENCIES.PAYCHECK);
  const otherPreTax_annual = calculateAnnualFromAmountAndFrequency(otherPreTaxContribution, otherPreTaxContributionFrequency, paySchedule);
  const otherPreTax_paycheck = convertAnnualAmountToPaySchedule(otherPreTax_annual, paySchedule);

  // used to remove pre tax rows in table with $0 contributions
  const preTaxTableMap: { [key: string]: any } = {
    "Traditional 401k": [t401k_annual, t401k_paycheck],
    "Traditional IRA": [tIRA_annual, tIRA_paycheck],
    "Medical Insurance": [medical_annual, medical_paycheck],
    "Commuter Benefits": [commuter_annual, commuter_paycheck],
    "HSA/FSA": [hsa_annual, hsa_paycheck],
    "Other Pre-Tax": [otherPreTax_annual, otherPreTax_paycheck],
  }

  const taxableIncome_annual = salary - t401k_annual - tIRA_annual - medical_annual - commuter_annual - hsa_annual - otherPreTax_annual;
  const taxableIncome_paycheck = convertAnnualAmountToPaySchedule(taxableIncome_annual, paySchedule);

  // Post Tax
  const [r401kContribution, changeR401kContribution] = React.useState(0);
  const r401k_annual = calculateContributionFromPercentage(salary, r401kContribution);
  const r401k_paycheck = convertAnnualAmountToPaySchedule(r401k_annual, paySchedule);

  const [rIRAContribution, changeRIRAContribution] = React.useState(0);
  const rIRA_annual = calculateContributionFromPercentage(salary, rIRAContribution);
  const rIRA_paycheck = convertAnnualAmountToPaySchedule(rIRA_annual, paySchedule);

  const [otherPostTaxContribution, changeOtherPostTaxContribution] = React.useState(0);
  const [otherPostTaxContributionFrequency, changeOtherPostTaxContributionFrequency] = React.useState(FREQUENCIES.PAYCHECK);
  const otherPostTax_annual = calculateAnnualFromAmountAndFrequency(otherPostTaxContribution, otherPostTaxContributionFrequency, paySchedule);
  const otherPostTax_paycheck = convertAnnualAmountToPaySchedule(otherPostTax_annual, paySchedule);

  // used to remove post tax rows in table with $0 contributions
  const postTaxTableMap: { [key: string]: any } = {
    "Roth 401k": [r401k_annual, r401k_paycheck],
    "Roth IRA": [rIRA_annual, rIRA_paycheck],
    "Other Post-Tax": [otherPostTax_annual, otherPostTax_paycheck],
  }

  // helper map for forms with custom frequencies
  const customWithholdings: { [key: string]: any } = {
    "Medical Insurance": [medicalContribution, changeMedicalContribution, medicalContributionFrequency, changeMedicalContributionFrequency],
    "Commuter Benefits": [commuterContribution, changeCommuterContribution, commuterContributionFrequency, changeCommuterContributionFrequency],
    "HSA/FSA": [hsaContribution, changeHSAContribution, hsaContributionFrequency, changeHSAContributionFrequency],
    "Other Pre-Tax": [otherPreTaxContribution, changeOtherPreTaxContribution, otherPreTaxContributionFrequency, changeOtherPreTaxContributionFrequency],
    "Other Post-Tax": [otherPostTaxContribution, changeOtherPostTaxContribution, otherPostTaxContributionFrequency, changeOtherPostTaxContributionFrequency],
  }

  const update = (e: React.FormEvent<HTMLElement>, changeFunction: { (value: React.SetStateAction<any>): void; }) => {
    changeFunction((e.target as HTMLInputElement).value);
  };

  const updateAmount = (e: React.FormEvent<HTMLElement>, changeFunction: { (value: React.SetStateAction<any>): void; }) => {
    let value = parseFloat((e.target as HTMLInputElement).value);
    if (isNaN(value) || value < 0) {
      value = 0;
    }
    changeFunction(value);
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

  const updateWithEventKey = (e: string | null, changeFunction: { (value: React.SetStateAction<any>): void; }) => {
    console.log("Updating with event key: " + e)
    if (e)
      changeFunction(e);
    else console.log("Null event key");
  }

  return (
    <div className={styles.container}>
      <Header titleName='Paycheck Calculator' />

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
          <Form.Control type="number" value={salary} onChange={e => updateAmount(e, changeSalary)} />
        </InputGroup>

        <Form.Group className="mb-3" onChange={e => update(e, changePaySchedule)}>
          <Form.Label> Paycheck Frequency </Form.Label>
          <br />
          <OverlayTrigger
            placement="bottom"
            delay={{ show: 150, hide: 200 }}
            overlay={renderTooltip({ text: "Every two weeks" })}
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
            overlay={renderTooltip({ text: "Twice a month" })}
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
          overlay={renderTooltip({ text: "% of gross income between 0 and 90." })}
        >
          <InputGroup className="mb-3 w-100">
            <InputGroup.Text>Traditional:</InputGroup.Text>
            <Form.Control type="number" value={t401kContribution} onChange={e => updateContribution(e, changeT401kContribution)} />
            <InputGroup.Text>%</InputGroup.Text>
          </InputGroup>
        </OverlayTrigger>
        <OverlayTrigger
          placement="bottom"
          delay={{ show: 150, hide: 200 }}
          overlay={renderTooltip({ text: "% of gross income between 0 and 90." })}
        >
          <InputGroup className="mb-3 w-100">
            <InputGroup.Text>Roth:</InputGroup.Text>
            <Form.Control type="number" value={r401kContribution} onChange={e => updateContribution(e, changeR401kContribution)} />
            <InputGroup.Text>%</InputGroup.Text>
          </InputGroup>
        </OverlayTrigger>

        <Form.Label>IRA Contribution</Form.Label>
        <OverlayTrigger
          placement="bottom"
          delay={{ show: 150, hide: 200 }}
          overlay={renderTooltip({ text: "% of gross income between 0 and 90." })}
        >
          <InputGroup className="mb-3 w-100">
            <InputGroup.Text>Traditional:</InputGroup.Text>
            <Form.Control type="number" value={tIRAContribution} onChange={e => updateContribution(e, changeTIRAContribution)} />
            <InputGroup.Text>%</InputGroup.Text>
          </InputGroup>
        </OverlayTrigger>
        <OverlayTrigger
          placement="bottom"
          delay={{ show: 150, hide: 200 }}
          overlay={renderTooltip({ text: "% of gross income between 0 and 90." })}
        >
          <InputGroup className="mb-3 w-100">
            <InputGroup.Text>Roth:</InputGroup.Text>
            <Form.Control type="number" value={rIRAContribution} onChange={e => updateContribution(e, changeRIRAContribution)} />
            <InputGroup.Text>%</InputGroup.Text>
          </InputGroup>
        </OverlayTrigger>

        {Object.keys(customWithholdings).map((key) => (
          <>
            <Form.Label>{key} Contribution</Form.Label>
            <InputGroup className="mb-3 w-100">
              <InputGroup.Text>$</InputGroup.Text>
              <Form.Control type="number" value={customWithholdings[key][0]} onChange={e => updateAmount(e, customWithholdings[key][1])} />
              <InputGroup.Text>per</InputGroup.Text>
              <DropdownButton
                variant="secondary"
                title={customWithholdings[key][2]}
                id={key.replace(' ', '-') + "-frequency-dropdown"}
                onSelect={e => updateWithEventKey(e, customWithholdings[key][3])}
              >
                {ALL_FREQUENCIES.map((freq) => {
                  let frequencyValue = FREQUENCIES[freq as keyof typeof FREQUENCIES];
                  return (
                    <Dropdown.Item eventKey={frequencyValue} key={frequencyValue}>{frequencyValue}</Dropdown.Item>
                  )
                })}
              </DropdownButton>
            </InputGroup>
          </>
        ))}

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
              <td>{formatCurrency(convertAnnualAmountToPaySchedule(salary, paySchedule))}</td>
            </tr>
            <tr>
              <td colSpan={3} className={styles.thicc}>Pre-Tax Deductions</td>
            </tr>
            {Object.keys(preTaxTableMap).filter((key) => preTaxTableMap[key][0] != 0).map((key) => (
              <tr>
                <td>{key}</td>
                <td>{formatCurrency(preTaxTableMap[key][0])}</td>
                <td>{formatCurrency(preTaxTableMap[key][1])}</td>
              </tr>
            ))}
            <tr>
              <td>Taxable Pay</td>
              <td>{formatCurrency(taxableIncome_annual)}</td>
              <td>{formatCurrency(taxableIncome_paycheck)}</td>
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
            {Object.keys(postTaxTableMap).filter((key) => postTaxTableMap[key][0] != 0).map((key) => (
              <tr>
                <td>{key}</td>
                <td>{formatCurrency(postTaxTableMap[key][0])}</td>
                <td>{formatCurrency(postTaxTableMap[key][1])}</td>
              </tr>
            ))}
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
