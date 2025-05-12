import React from 'react';
import { Link } from 'react-router-dom';

const PublicLinks = ({ activeSection, setActiveSection }) => (
    <>
        <li className="nav-item">
            <Link
                className={`nav-link ${activeSection === 'leagues' ? 'active' : ''}`}
                to="/leagues"
                onClick={() => setActiveSection('leagues')}
            >
                Leagues
            </Link>
        </li>
        <li className="nav-item">
            <Link
                className={`nav-link ${activeSection === 'rules' ? 'active' : ''}`}
                to="/rules"
                onClick={() => setActiveSection('rules')}
            >
                Rules
            </Link>
        </li>
        <li className="nav-item">
            <Link
                className={`nav-link ${activeSection === 'awards' ? 'active' : ''}`}
                to="/awards"
                onClick={() => setActiveSection('awards')}
            >
                Awards
            </Link>
        </li>
    </>
);

export default PublicLinks;