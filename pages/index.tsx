import type { NextPage } from 'next'
import Link from 'next/link'
import styles from '../styles/Home.module.scss'
import { Header, Footer} from '../src/components'

const Home: NextPage = () => {
  return (
    <div className={styles.container}>
      <Header/>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Welcome to the Finance App.
        </h1>

        <p className={styles.description}>
          Here we will have multiple tools for you to estimate your paycheck, budget, and more. 
        </p>

        <div className={styles.grid}>
          <Link href="/paycheck">
            <a className={styles.card}>
              <h2>Paycheck Calculator &rarr;</h2>
              <p>Estimate your take home pay!</p>
            </a>
          </Link>

          <Link href="/retirement/frontload">
            <a href="https://nextjs.org/learn" className={styles.card}>
              <h2>401k Frontloader &rarr;</h2>
              <p>Plan your 401k maximum</p>
            </a>
          </Link>

        </div>
      </main>

      <Footer/>
    </div>
  )
}

export default Home
