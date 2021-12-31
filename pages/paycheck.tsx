import React from 'react';
import { Form, Table, InputGroup, DropdownButton, Dropdown, Alert } from 'react-bootstrap';
import styles from '../styles/Paycheck.module.scss';
import { Header, Footer, TooltipOnHover } from '../src/components';
import { determineStateTaxesWithheld, determineFICATaxesWithheld, determineFederalTaxesWithheld, determineMedicareTaxesWithheld, US_STATES_MAP, instanceOfTaxUnknown, formatCurrency } from '../src/utils';
import { TAX_CLASSES, FREQUENCIES, FREQUENCY_TO_ANNUM, ALL_FREQUENCIES, PAY_SCHEDULE, PAY_SCHEDULE_TO_ANNUM, } from '../src/utils/constants';

/**
 * TODO: 
 * 1. Create more advanced table
 *  - bonuses -> one time or distribute into paycheck/yr, also whether it contributes to benefits
 *  - Company match
 *  - Other tax deductions, company match on HSA/FSA
 *  - multiple states
 *  - side by side view
 *  - maximums on FICA, 401k, IRA
 * 2. perhaps split tool to do a month by month breakdown (e.g. to factor in maxing SStax)
 * 3. Split form and table to separate components
 * 4. save info to local storage + clear data button -> so we don't lose data on refresh
 */

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

/** 
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
  const [taxClass, changeTaxClass] = React.useState(TAX_CLASSES.SINGLE);
  const [usState, changeUSState] = React.useState(US_STATES_MAP["None"].abbreviation);

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

  // if all Pre tax deductions are 0, dont render the section at all
  const shouldRenderPreTaxDeductions = !!Object.keys(preTaxTableMap).filter((key) => preTaxTableMap[key][0] != 0).length;

  const sumOfPreTaxContributions_annual = Object.keys(preTaxTableMap).reduce((prev, curr) => prev + preTaxTableMap[curr][0], 0)
  const taxableIncome_annual = salary - sumOfPreTaxContributions_annual;
  const taxableIncome_paycheck = convertAnnualAmountToPaySchedule(taxableIncome_annual, paySchedule);

  // Taxes Withheld, should use taxableIncome_annual over salary
  const federalWithholding_annual = determineFederalTaxesWithheld(taxableIncome_annual, taxClass)
  const federalWithholding_paycheck = convertAnnualAmountToPaySchedule(federalWithholding_annual, paySchedule);

  const ficaWithholding_annual = determineFICATaxesWithheld(taxableIncome_annual, taxClass);
  const ficaWithholding_paycheck = convertAnnualAmountToPaySchedule(ficaWithholding_annual, paySchedule);

  const medicareWithholding_annual = determineMedicareTaxesWithheld(taxableIncome_annual, taxClass);
  const medicareWithholding_paycheck = convertAnnualAmountToPaySchedule(medicareWithholding_annual, paySchedule);

  let stateTaxInvalidAlert = <></>;
  if (instanceOfTaxUnknown(US_STATES_MAP[usState])) {
    stateTaxInvalidAlert = <Alert className='mb-3' variant="danger"> {US_STATES_MAP[usState].name} State Tax Withholding has not been defined! Assuming $0. </Alert>
  }
  const stateWithholding_annual = determineStateTaxesWithheld(usState, taxableIncome_annual, taxClass);
  const stateWithholding_paycheck = convertAnnualAmountToPaySchedule(stateWithholding_annual, paySchedule);
  const stateWithholding_key = US_STATES_MAP[usState].abbreviation + " State Withholding";

  // used to remove tax rows in table with $0 contributions
  const taxTableMap: { [key: string]: any } = {
    "Federal Withholding": [federalWithholding_annual, federalWithholding_paycheck],
    "FICA": [ficaWithholding_annual, ficaWithholding_paycheck],
    "Medicare": [medicareWithholding_annual, medicareWithholding_paycheck],
    [stateWithholding_key]: [stateWithholding_annual, stateWithholding_paycheck],
  }

  const netPay_annual = taxableIncome_annual - federalWithholding_annual - ficaWithholding_annual - medicareWithholding_paycheck - stateWithholding_annual;
  const netPay_paycheck = convertAnnualAmountToPaySchedule(netPay_annual, paySchedule);

  // Post Tax, uses salary for calculations instead of taxableIncome_annual
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

  // if all post tax deductions are 0, dont render the section at all
  const shouldRenderPostTaxDeductions = !!Object.keys(postTaxTableMap).filter((key) => postTaxTableMap[key][0] != 0).length;

  const sumOfPostTaxContributions_annual = Object.keys(postTaxTableMap).reduce((prev, curr) => prev + postTaxTableMap[curr][0], 0)

  const takeHomePay_annual = netPay_annual - sumOfPostTaxContributions_annual;
  const takeHomePay_paycheck = convertAnnualAmountToPaySchedule(takeHomePay_annual, paySchedule);

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
        </Form.Group>

        <Form.Group className="mb-3" onChange={e => update(e, changeTaxClass)}>
          <Form.Label> Tax Filing Status </Form.Label>
          <br />
          <Form.Check
            inline
            label={TAX_CLASSES.SINGLE}
            value={TAX_CLASSES.SINGLE}
            defaultChecked
            name="tax_class"
            type="radio"
            id="tax-class-radio-1"
          />
          <Form.Check
            inline
            label={TAX_CLASSES.MARRIED_FILING_JOINTLY}
            value={TAX_CLASSES.MARRIED_FILING_JOINTLY}
            name="tax_class"
            type="radio"
            id="tax-class-radio-2"
          />
        </Form.Group>

        <Form.Label>US State Withholding Tax</Form.Label>
        <DropdownButton className="mb-3" id="us-state-dropdown-button" title={US_STATES_MAP[usState].name} variant="secondary" onSelect={e => updateWithEventKey(e, changeUSState)}>
          {Object.keys(US_STATES_MAP).map((key) => (
            <Dropdown.Item eventKey={key} key={key}>{key}</Dropdown.Item>
          ))}
        </DropdownButton>
        {stateTaxInvalidAlert}

        <Form.Label>401k Contribution</Form.Label>
        <TooltipOnHover text="% of gross income between 0 and 90." nest={
          <InputGroup className="mb-3 w-100">
            <InputGroup.Text>Traditional:</InputGroup.Text>
            <Form.Control type="number" value={t401kContribution} onChange={e => updateContribution(e, changeT401kContribution)} />
            <InputGroup.Text>%</InputGroup.Text>
          </InputGroup>
        } />
        <TooltipOnHover text="% of gross income between 0 and 90." nest={
          <InputGroup className="mb-3 w-100">
            <InputGroup.Text>Roth:</InputGroup.Text>
            <Form.Control type="number" value={r401kContribution} onChange={e => updateContribution(e, changeR401kContribution)} />
            <InputGroup.Text>%</InputGroup.Text>
          </InputGroup>
        } />

        <Form.Label>IRA Contribution</Form.Label>
        <TooltipOnHover text="% of gross income between 0 and 90." nest={
          <InputGroup className="mb-3 w-100">
            <InputGroup.Text>Traditional:</InputGroup.Text>
            <Form.Control type="number" value={tIRAContribution} onChange={e => updateContribution(e, changeTIRAContribution)} />
            <InputGroup.Text>%</InputGroup.Text>
          </InputGroup>
        } />
        <TooltipOnHover text="% of gross income between 0 and 90." nest={
          <InputGroup className="mb-3 w-100">
            <InputGroup.Text>Roth:</InputGroup.Text>
            <Form.Control type="number" value={rIRAContribution} onChange={e => updateContribution(e, changeRIRAContribution)} />
            <InputGroup.Text>%</InputGroup.Text>
          </InputGroup>
        } />

        {Object.keys(customWithholdings).map((key) => (
          <div key={key}>
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
          </div>
        ))}
      </Form>

      <div className={styles.table}>
        <Table hover responsive size="sm">
          <thead>
            <tr>
              <th></th>
              <th>Annual</th>
              <th className={styles.specialHeaderWidth}>Paycheck - {paySchedule}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={styles.thicc}>Gross Income</td>
              <td>{formatCurrency(salary)}</td>
              <td>{formatCurrency(convertAnnualAmountToPaySchedule(salary, paySchedule))}</td>
              <td></td>
            </tr>
            {shouldRenderPreTaxDeductions &&
              <>
                <tr>
                  <td colSpan={4} className={styles.thicc}>Pre-Tax Deductions</td>
                </tr>
                {Object.keys(preTaxTableMap).filter((key) => preTaxTableMap[key][0] != 0).map((key) => (
                  <tr key={key}>
                    <td>{key}</td>
                    <td>{formatCurrency(-preTaxTableMap[key][0])}</td>
                    <td>{formatCurrency(-preTaxTableMap[key][1])}</td>
                    <td></td>
                  </tr>
                ))}
                <tr>
                  <td>Taxable Pay</td>
                  <td>{formatCurrency(taxableIncome_annual)}</td>
                  <td>{formatCurrency(taxableIncome_paycheck)}</td>
                  <td></td>
                </tr>
              </>
            }

            <tr>
              <td colSpan={4} className={styles.thicc}>Tax Withholdings</td>
            </tr>
            {Object.keys(taxTableMap).filter((key) => taxTableMap[key][0] != 0).map((key) => (
              <tr key={key}>
                <td>{key}</td>
                <td>{formatCurrency(-taxTableMap[key][0])}</td>
                <td>{formatCurrency(-taxTableMap[key][1])}</td>
                <td></td>
              </tr>
            ))}
            <tr>
              <td>Net Pay</td>
              <td>{formatCurrency(netPay_annual)}</td>
              <td>{formatCurrency(netPay_paycheck)}</td>
              <td></td>
            </tr>
            {shouldRenderPostTaxDeductions &&
              <>
                <tr>
                  <td colSpan={4} className={styles.thicc}>Post-Tax Deductions</td>
                </tr>
                {Object.keys(postTaxTableMap).filter((key) => postTaxTableMap[key][0] != 0).map((key) => (
                  <tr>
                    <td>{key}</td>
                    <td>{formatCurrency(-postTaxTableMap[key][0])}</td>
                    <td>{formatCurrency(-postTaxTableMap[key][1])}</td>
                    <td></td>
                  </tr>
                ))}
              </>
            }
            <tr>
              <td className={styles.thicc}>Take Home Pay</td>
              <td>{formatCurrency(takeHomePay_annual)}</td>
              <td>{formatCurrency(takeHomePay_paycheck)}</td>
              <td></td>
            </tr>
          </tbody>
        </Table>
      </div>
      <Footer />
    </div>
  )
}

export default Paycheck;
