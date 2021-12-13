import type { NextPage } from 'next'
import Head from 'next/head'
import styles from '../styles/Paycheck.module.css'

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
  
        <footer className={styles.footer}>
          <p>Created by: Adam Lui</p>
        </footer>
      </div>
    )
  }
  
export default Paycheck
  