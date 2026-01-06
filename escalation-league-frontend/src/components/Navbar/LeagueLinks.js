import React from 'react';
import { Link } from 'react-router-dom';

const LeagueLinks = ({ activeSection, setActiveSection, inLeague }) => {
    return (
        <li className="nav-item dropdown">
            <a
                className="nav-link dropdown-toggle"
                href="#"
                id="leaguesDropdown"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
            >
                Leagues
            </a>
            <ul className="dropdown-menu" aria-labelledby="leaguesDropdown">
                {inLeague ? (
                    <>
                        <li>
                            <Link
                                className="dropdown-item"
                                to="/leagues/current"
                                onClick={() => setActiveSection('currentLeague')}
                            >
                                Current League
                            </Link>
                        </li>
                        <li>
                            <Link
                                className="dropdown-item"
                                to="/leagues/leaderboard"
                                onClick={() => setActiveSection('leaderboard')}
                            >
                                Leaderboard
                            </Link>
                        </li>
                    </>
                ) : (
                    <li>
                        <Link
                            className="dropdown-item"
                            to="/leagues/signup"
                            onClick={() => setActiveSection('signup')}
                        >
                            Sign Up
                        </Link>
                    </li>
                )}
            </ul>
        </li>
    );
};

export default LeagueLinks;