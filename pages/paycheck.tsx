import type { NextPage } from 'next'
import Head from 'next/head'
import styles from '../styles/Paycheck.module.css'
import { Form, FloatingLabel } from 'react-bootstrap';
import CurrencyInput from 'react-currency-input-field';
// https://www.npmjs.com/package/react-currency-input-field

const Paycheck: NextPage = () => {
    return (
      <div className={styles.container}>
        <Head>
          <title>Lui Finance App | Paycheck Calculator</title>
          <meta name="description" content="paycheck calculator" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
  
        <main className={styles.main}>
          <h1 className={styles.title}>
            Paycheck Calculator
          </h1>
  
          <p className={styles.description}>
            Here we will estimate your take home pay!
          </p>
        </main>

        <Form>
          <CurrencyInput
            id="annual-salary"
            name="annual-salary"
            prefix="$"
            defaultValue={50000}
            decimalsLimit={2}
            onValueChange={(value, name) => console.log(value, name)}
          />
        </Form>
  
        <footer className={styles.footer}>
          <p>Created by: Adam Lui</p>
        </footer>
      </div>
    )
  }
  
export default Paycheck
  