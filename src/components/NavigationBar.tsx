import React, { useLayoutEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button, Container, Nav, Navbar } from "react-bootstrap";
import { prefix } from "../utils";
import { useTheme } from "../utils/ThemeContext";

/**
 * Navbar items are for CSS, we have to wrap in next/link in order for single page behavior
 * @returns NavigationBar JSX
 */
const NavigationBar = () => {
  const [isGreaterThan425px, setIsGreaterThan425px] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const iconPath = prefix + "/favicon.ico";

  // useLayoutEffect over useEffect as useEffect shows artifacts of lower resolution options briefly during routing
  useLayoutEffect(() => {
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
          <Link href="/retirement-savings" className="nav-link" passHref>
            401k Optimizer
          </Link>
        </Nav>
        <Button
          variant="link"
          onClick={toggleTheme}
          className="text-white p-0 ms-2"
          aria-label="Toggle theme"
          style={{ fontSize: "1.25rem", lineHeight: 1 }}
        >
          {theme === "dark" ? "☀" : "☾"}
        </Button>
      </Container>
    </Navbar>
  );
};

export default NavigationBar;
