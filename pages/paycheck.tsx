import type { NextPage } from 'next'
import styles from '../styles/Paycheck.module.css'
import Header from '../src/Header'
import Footer from '../src/Footer'

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
 * State income
 * bonus -> one time or distribute into paycheck/yr, also whether it contributes to benefits
 * */ 
const Paycheck: NextPage = () => {
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

  
        <Footer />
      </div>
    )
  }
  
export default Paycheck
  