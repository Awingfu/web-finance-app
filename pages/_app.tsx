import "../styles/globals.scss";
import type { AppProps } from "next/app";
import { ThemeProvider } from "../src/utils/ThemeContext";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <Component {...pageProps} />
    </ThemeProvider>
  );
}

export default MyApp;
