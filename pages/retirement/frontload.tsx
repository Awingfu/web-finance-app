import type { NextPage } from 'next'
import Head from 'next/head'
// TODO change styles
import styles from '../../styles/Paycheck.module.css'


/**
 * Goals
 * 1. different frontloading strategies inc company match and 401k true limit
 * 2. cost analysis with fv assumption for each strategy
 * @returns 
 */
const Frontload: NextPage = () => {
    return (
      <div className={styles.container}>
        <Head>
          <title>Lui Finance App | Frontload Calculator</title>
          <meta name="description" content="frontload calculator" />
          <link rel="icon" href="/favicon.ico" />
        </Head>
  
        <main className={styles.main}>
          <h1 className={styles.title}>
            Frontload Calculator
          </h1>
  
          <p className={styles.description}>
            Here we will try to optimize maxing your 401k
          </p>
        </main>

  
        <footer className={styles.footer}>
          <p>Created by: Adam Lui</p>
        </footer>
      </div>
    )
  }
  
export default Frontload
  