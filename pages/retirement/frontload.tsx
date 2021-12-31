import type { NextPage } from 'next';
import { Header, Footer } from '../../src/components';
// TODO change styles
import styles from '../../styles/Home.module.scss'

/**
 * Goals
 * 1. different frontloading strategies inc company match and 401k true limit
 * 2. cost analysis with fv assumption for each strategy
 * @returns 
 */
const Frontload: NextPage = () => {
    return (
      <div className={styles.container}>
        <Header titleName='Frontload Calculator' />
  
        <main className={styles.main}>
          <h1 className={styles.title}>
            Frontload Calculator
          </h1>
  
          <p className={styles.description}>
            Here we will try to optimize maxing your 401k
          </p>
        </main>

  
        <Footer />
      </div>
    )
  }
  
export default Frontload
  