import React from 'react';
import { Link } from 'react-router-dom';

const PodsLinks = ({ activeSection, setActiveSection, permissions }) => {
    const canAccessGames = permissions.some((perm) => perm.name === 'pod_read');

    if (!canAccessGames) {
        return null; // Don't render if the user doesn't have permission
    }

    return (
        <>
            <li className="nav-item">
                <Link
                    className={`nav-link ${activeSection === 'pods' ? 'active' : ''}`}
                    to="/pods"
                    onClick={() => setActiveSection('pods')}
                >
                    Pods
                </Link>
            </li>
        </>
    );
};

export default PodsLinks;