import React from "react";
import Link from 'next/link';
import { Container, Nav, Navbar} from 'react-bootstrap';

/**
 * Todo:
 * - add custom styling
 * - add more routing
 * 
 * Navbar items are for CSS, we have to wrap in next/link in order for single page behavior 
 * @returns NavigationBar JSX
 */
const NavigationBar = () => {
    return (
        <Navbar bg="primary" variant="dark">
            <Container>
                <Link href="/" passHref>
                    <Navbar.Brand> Finance App </Navbar.Brand>
                </Link>
                <Nav className="me-auto">
                    <Link href="/paycheck" passHref>
                        <Nav.Link> Paycheck </Nav.Link>
                    </Link>
                    <Link href="/retirement/optimizer" passHref>
                        <Nav.Link> 401k Optimizer </Nav.Link>
                    </Link>
                    <Link href="/retirement/frontload" passHref>
                        <Nav.Link> 401k Frontload </Nav.Link>
                    </Link>
                </Nav>
            </Container>
        </Navbar>
    );
};

export default NavigationBar;