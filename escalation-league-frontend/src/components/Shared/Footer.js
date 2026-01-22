import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './Shared.css'; // Create a CSS file for specific styles

const Footer = () => {
    const [buildInfo, setBuildInfo] = useState(null);

    useEffect(() => {
        // Fetch build info
        fetch('/build-info.json')
            .then(res => res.json())
            .then(data => setBuildInfo(data))
            .catch(() => console.log('Build info not available'));
    }, []);

    return (
        <footer className="footer">
            <div className="container">
                <p>Escalation League 2025
                    {buildInfo && (
                        <span style={{ marginLeft: '1rem', fontSize: '0.85rem', opacity: 0.7 }}>
                            Build Id - {buildInfo.gitCommit}
                        </span>
                    )}
                </p>
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