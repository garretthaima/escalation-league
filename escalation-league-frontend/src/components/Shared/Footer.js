import React from 'react';
import { Link } from 'react-router-dom';
import './Shared.css'; // Create a CSS file for specific styles

const Footer = () => {
    return (
        <footer className="footer">
            <div className="container">
                <p>&copy; 2025 Escalation League. All rights reserved.</p>
                <ul>
                    <li><Link to="/rules">Rules</Link></li>
                    <li><Link to="/awards">Awards</Link></li>
                    <li><Link to="/contact">Contact Us</Link></li>
                    {/* <li><Link to="/privacy">Privacy Policy</Link></li> */}
                </ul>
            </div>
        </footer>
    );
};

export default Footer;