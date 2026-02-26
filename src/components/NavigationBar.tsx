import { useLayoutEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { Button, Container, Nav, Navbar, Offcanvas } from "react-bootstrap";
import { prefix } from "../utils";
import { useTheme } from "../utils/ThemeContext";

const NAV_LINKS = [
  { href: "/paycheck", label: "Paycheck" },
  { href: "/retirement-savings", label: "401k Optimizer" },
  { href: "/retirement/income", label: "Retirement Income" },
  { href: "/faq", label: "FAQ" },
];

const PAGE_NAMES: Record<string, string> = {
  "/": "Home",
  "/paycheck": "Paycheck",
  "/retirement-savings": "401k Optimizer",
  "/retirement/maximize": "401k Maximize",
  "/retirement/income": "Retirement Income",
  "/faq": "FAQ",
};

/**
 * Navbar items are for CSS, we have to wrap in next/link in order for single page behavior
 * @returns NavigationBar JSX
 */
const NavigationBar = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const iconPath = prefix + "/favicon.ico";
  const router = useRouter();
  const currentPageName = PAGE_NAMES[router.pathname] ?? "Finance App";

  // useLayoutEffect over useEffect as useEffect shows artifacts of lower resolution options briefly during routing
  useLayoutEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= 425);
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
            <Image
              src={iconPath}
              alt="Finance App Icon"
              width={30}
              height={30}
            />
            {!isMobile && <span className="ms-2">Finance App</span>}
          </Navbar.Brand>
        </Link>

        {isMobile ? (
          <>
            <span
              className="text-white flex-grow-1 text-center"
              style={{ fontSize: "1rem", fontWeight: 500 }}
            >
              {currentPageName}
            </span>
            <Button
              variant="link"
              onClick={() => setShowDrawer(true)}
              className="text-white p-0 ms-2 text-decoration-none"
              aria-label="Open menu"
              style={{ fontSize: "1.5rem", lineHeight: 1 }}
            >
              ☰
            </Button>
          </>
        ) : (
          <>
            <Nav className="me-auto">
              {NAV_LINKS.map(({ href, label }) => (
                <Link key={href} href={href} className="nav-link" passHref>
                  {label}
                </Link>
              ))}
            </Nav>
            <Button
              variant="link"
              onClick={toggleTheme}
              className="text-white p-0 ms-2 text-decoration-none"
              aria-label="Toggle theme"
              style={{ fontSize: "1.25rem", lineHeight: 1 }}
            >
              {theme === "dark" ? "☀" : "☾"}
            </Button>
          </>
        )}
      </Container>

      <Offcanvas
        show={showDrawer}
        onHide={() => setShowDrawer(false)}
        placement="end"
        data-bs-theme={theme}
        style={{ width: "75%" }}
      >
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Menu</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <Nav className="flex-column mb-3">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="nav-link text-body"
                passHref
                onClick={() => setShowDrawer(false)}
              >
                {label}
              </Link>
            ))}
          </Nav>
          <hr />
          <Button
            variant={theme === "dark" ? "outline-light" : "outline-dark"}
            onClick={() => {
              toggleTheme();
              setShowDrawer(false);
            }}
            className="w-100"
            style={{ borderColor: theme === "dark" ? "white" : "black" }}
          >
            {theme === "dark" ? "☀ Light Mode" : "☾ Dark Mode"}
          </Button>
        </Offcanvas.Body>
      </Offcanvas>
    </Navbar>
  );
};

export default NavigationBar;
