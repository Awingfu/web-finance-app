import { useLayoutEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import {
  Button,
  Container,
  Nav,
  NavDropdown,
  Navbar,
  Offcanvas,
} from "react-bootstrap";
import { prefix } from "../utils";
import { useTheme } from "../utils/ThemeContext";

type NavLink = { href: string; label: string };
type NavGroup = { group: string; links: NavLink[] };
type NavEntry = NavLink | NavGroup;

const isGroup = (entry: NavEntry): entry is NavGroup => "group" in entry;

const NAV_ENTRIES: NavEntry[] = [
  { href: "/paycheck", label: "Paycheck" },
  {
    group: "Learn",
    links: [
      { href: "/learn/why-invest", label: "Why Invest?" },
      {
        href: "/learn/why-retirement-account",
        label: "Why Retirement Account?",
      },
    ],
  },
  {
    group: "Retirement",
    links: [
      { href: "/retirement/savings-optimizer", label: "401k Optimizer" },
      { href: "/retirement/income", label: "Retirement Income" },
      { href: "/retirement/roth-vs-traditional", label: "Roth vs Traditional" },
      {
        href: "/retirement/roth-conversion-ladder",
        label: "Roth Conversion Ladder",
      },
      { href: "/retirement/fire", label: "FIRE Calculator" },
    ],
  },
  { href: "/faq", label: "FAQ" },
];

const PAGE_NAMES: Record<string, string> = {
  "/": "Home",
  "/paycheck": "Paycheck",
  "/learn/why-invest": "Why Invest?",
  "/learn/why-retirement-account": "Why Retirement Account?",
  "/retirement/savings-optimizer": "401k Optimizer",
  "/retirement/maximize": "401k Maximize",
  "/retirement/income": "Retirement Income",
  "/retirement/roth-vs-traditional": "Roth vs Traditional",
  "/retirement/roth-conversion-ladder": "Roth Conversion Ladder",
  "/retirement/fire": "FIRE Calculator",
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
      setIsMobile(window.innerWidth < 1080);
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
              {NAV_ENTRIES.map((entry) =>
                isGroup(entry) ? (
                  <NavDropdown
                    key={entry.group}
                    title={entry.group}
                    id={`nav-dropdown-${entry.group.toLowerCase()}`}
                    active={entry.links.some((l) => router.pathname === l.href)}
                    data-bs-theme={theme}
                  >
                    {entry.links.map(({ href, label }) => (
                      <NavDropdown.Item
                        key={href}
                        as={Link}
                        href={href}
                        active={router.pathname === href}
                      >
                        {label}
                      </NavDropdown.Item>
                    ))}
                  </NavDropdown>
                ) : (
                  <Link
                    key={entry.href}
                    href={entry.href}
                    className={`nav-link${router.pathname === entry.href ? " active" : ""}`}
                    passHref
                  >
                    {entry.label}
                  </Link>
                ),
              )}
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
            {NAV_ENTRIES.map((entry) =>
              isGroup(entry) ? (
                <div key={entry.group}>
                  <p
                    className="text-muted small text-uppercase mb-1 mt-2"
                    style={{ letterSpacing: "0.06em", fontWeight: 600 }}
                  >
                    {entry.group}
                  </p>
                  {entry.links.map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      className="nav-link text-body ps-4"
                      passHref
                      onClick={() => setShowDrawer(false)}
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              ) : (
                <Link
                  key={entry.href}
                  href={entry.href}
                  className="nav-link text-body"
                  passHref
                  onClick={() => setShowDrawer(false)}
                >
                  {entry.label}
                </Link>
              ),
            )}
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
