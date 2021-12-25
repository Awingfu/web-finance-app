import type { NextPage } from 'next'
import styles from '../styles/Paycheck.module.css'
import Header from '../src/Header'
import Footer from '../src/Footer'

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
  