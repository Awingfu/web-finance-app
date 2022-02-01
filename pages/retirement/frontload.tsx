import React from "react";
import { Dropdown, DropdownButton, Form, InputGroup, Table } from "react-bootstrap";
import { Header, Footer, TooltipOnHover } from "../../src/components";
import { US_STATES_MAP, formatCurrency } from "../../src/utils";
import { PAY_SCHEDULE, TAX_CLASSES, ALL_FREQUENCIES, FREQUENCIES } from "../../src/utils/constants";
import styles from "../../styles/Retirement.module.scss";


const formatStateValue = (value: string | number): string => {
  return Number(value).toString();
}


/**
 * Goals
 * 1. different frontloading strategies inc company match and 401k true limit
 * 2. cost analysis with fv assumption for each strategy
 * @returns
 */

function Frontload() {

  const [salary, changeSalary] = React.useState(50000);
  const [bonus, changeBonus] = React.useState(0);
  const [bonusEligible, changeBonusEligible] = React.useState(false);


  const update = (e: React.FormEvent<HTMLElement>, changeFunction: { (value: React.SetStateAction<any>): void; }) => {
    changeFunction((e.target as HTMLInputElement).value);
  };

  const updateAmount = (e: React.FormEvent<HTMLElement>, changeFunction: { (value: React.SetStateAction<any>): void; }) => {
    let value = parseFloat((e.target as HTMLInputElement).value);
    if (isNaN(value) || value < 0) {
      value = 0;
    } else if (value > 1000000000) {
      value = 1000000000;
    }
    changeFunction(value);
  };

  const updateContribution = (e: React.FormEvent<HTMLElement>, changeFunction: { (value: React.SetStateAction<any>): void; }) => {
    let value = parseInt((e.target as HTMLInputElement).value);
    if (isNaN(value) || value < 0) {
      value = 0;
    } else if (value > 90) {
      value = 90;
    }
    changeFunction(value);
  };

  const updateWithEventKey = (e: string | null, changeFunction: { (value: React.SetStateAction<any>): void; }) => {
    if (e)
      changeFunction(e);
    else console.log("Null event key");
  }

  return (
    <div className={styles.container}>
      <Header titleName="Frontload Calculator" />

      <main className={styles.main}>
        <h1>Frontload Calculator</h1>
        <p>Here we will try to optimize maxing your 401k Frontloading</p>
      </main>

      <div className={styles.content}>
        <Form className={styles.paycheckForm}>
          <Form.Label>Annual Salary</Form.Label>
          <InputGroup className="mb-3 w-100">
            <InputGroup.Text>$</InputGroup.Text>
            <Form.Control
              type="number"
              value={formatStateValue(salary)}
              onChange={(e) => updateAmount(e, changeSalary)}
            />
          </InputGroup>

          <Form.Group className="mb-3">
            <Form.Label className={styles.inlineGroupFormLabel}>
              Annual Bonus
            </Form.Label>
            <div className={styles.inlineGroup}>
              <InputGroup className={styles.inlineChildren}>
                <InputGroup.Text>$</InputGroup.Text>
                <Form.Control
                  type="number"
                  value={formatStateValue(bonus)}
                  onChange={(e) => updateAmount(e, changeBonus)}
                />
              </InputGroup>
              <InputGroup className={styles.inlineChildren}>
                <TooltipOnHover
                  text="Check if bonus is eligible for 401k and other contributions. If unchecked, bonus will be added at Taxable Income step."
                  nest={
                    <Form.Check
                      className={styles.width250px}
                      type="checkbox"
                      onChange={() => changeBonusEligible(!bonusEligible)}
                      label="Eligible For Contributions"
                      checked={bonusEligible}
                    />
                  }
                />
              </InputGroup>
            </div>
          </Form.Group>
        </Form>

        <div className={styles.table}>
          <Table hover responsive size="sm" className="mb-3">
            <thead>
              <tr>
                <th>Month</th>
                <th>Annual Salary</th>
                <th>% Match</th>
                <th>Amount/month</th>
                <th>Cumulative Contributed</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className={styles.thicc}>Gross Income</td>
                <td></td>
                <td></td>
              </tr>
            </tbody>
          </Table>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Frontload;
