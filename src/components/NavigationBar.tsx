import React from "react";
import Link from 'next/link';
import { Container, Nav, Navbar} from 'react-bootstrap';

/**
 * Todo:
 * - add custom styling
 * - Be more reactive
 * - add more routing
 * 
 * Navbar items are for CSS, we have to wrap in next/link in order for single page behavior 
 * @returns NavigationBar JSX
 */
const NavigationBar = () => {

    const [isGreaterThan425px, setIsGreaterThan425px] = React.useState(false);

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
                    <Navbar.Brand> {isGreaterThan425px ? "Finance App" : <img src="favicon.ico"/>} </Navbar.Brand>
                </Link>
                <Nav className="me-auto">
                    <Link href="/paycheck" passHref>
                        <Nav.Link> Paycheck </Nav.Link>
                    </Link>
                    <Link href="/retirement/maximize" passHref>
                        <Nav.Link> {isGreaterThan425px && "401k " } Maximizer </Nav.Link>
                    </Link>
                    <Link href="/retirement/frontload" passHref>
                        <Nav.Link> {isGreaterThan425px && "401k " } Frontloader </Nav.Link>
                    </Link>
                </Nav>
            </Container>
        </Navbar>
    );
};

export default NavigationBar;