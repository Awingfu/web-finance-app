import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Container, Nav, Navbar } from "react-bootstrap";
import { prefix } from "../utils";

/**
 * Navbar items are for CSS, we have to wrap in next/link in order for single page behavior
 * @returns NavigationBar JSX
 */
const NavigationBar = () => {
  const [isGreaterThan425px, setIsGreaterThan425px] = React.useState(false);
  const iconPath = prefix + "/favicon.ico";

  React.useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 425) {
        setIsGreaterThan425px(true);
      } else {
        setIsGreaterThan425px(false);
      }
    }

    handleResize();

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <Navbar bg="primary" variant="dark">
      <Container>
        <Link href="/" passHref>
          <Navbar.Brand>
            {isGreaterThan425px ? (
              "Finance App"
            ) : (
              <Image
                src={iconPath}
                alt="Finance App Icon"
                width={30}
                height={30}
              />
            )}
          </Navbar.Brand>
        </Link>
        <Nav className="me-auto">
          <Link href="/paycheck" className="nav-link" passHref>
            Paycheck
          </Link>
          <Link href="/retirement/maximize" className="nav-link" passHref>
            {isGreaterThan425px && "401k "} Maximizer
          </Link>
          <Link href="/retirement/frontload" className="nav-link" passHref>
            {isGreaterThan425px && "401k "} Frontloader
          </Link>
        </Nav>
      </Container>
    </Navbar>
  );
};

export default NavigationBar;
