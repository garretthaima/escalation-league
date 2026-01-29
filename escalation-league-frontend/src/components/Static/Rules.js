import React from 'react';
import './Rules.css';
import '../Shared/Shared.css';

const Rules = () => {
    return (
        <div className="container mt-4 mb-5">
            {/* Hero Section */}
            <div className="text-center mb-5">
                <h1 className="mb-3">
                    <i className="fas fa-scroll me-3"></i>
                    Escalation League Rules
                </h1>
                <p className="text-muted lead">
                    Everything you need to know about competing in the Escalation League
                </p>
            </div>

            <div className="row g-4">
                {/* League Entry */}
                <div className="col-md-6">
                    <div className="card h-100">
                        <div className="card-header">
                            <h5 className="mb-0">
                                <i className="fas fa-ticket-alt me-2"></i>
                                League Entry
                            </h5>
                        </div>
                        <div className="card-body">
                            <div className="d-flex align-items-center mb-3">
                                <span className="badge bg-success fs-5 me-3">$30</span>
                                <span>Entry Fee</span>
                            </div>
                            <p className="text-muted mb-0">
                                Payment is due during your first EL game night. Accepted payment methods: Cash or Venmo to the league commissioner.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Season Structure */}
                <div className="col-md-6">
                    <div className="card h-100">
                        <div className="card-header">
                            <h5 className="mb-0">
                                <i className="fas fa-calendar-alt me-2"></i>
                                Season Structure
                            </h5>
                        </div>
                        <div className="card-body">
                            <div className="row text-center mb-3">
                                <div className="col-4">
                                    <div className="fs-3 fw-bold text-brand-gold">16</div>
                                    <small className="text-muted">Weeks</small>
                                </div>
                                <div className="col-4">
                                    <div className="fs-3 fw-bold text-brand-gold">3+</div>
                                    <small className="text-muted">Min Pod Size</small>
                                </div>
                                <div className="col-4">
                                    <div className="fs-3 fw-bold text-brand-gold">Thu-Wed</div>
                                    <small className="text-muted">Week Cycle</small>
                                </div>
                            </div>
                            <p className="text-muted small mb-0">
                                Non-Thursday games can be arranged with provisions. All players must certify a game for points to be distributed.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Deck Requirements */}
                <div className="col-lg-6">
                    <div className="card h-100">
                        <div className="card-header">
                            <h5 className="mb-0">
                                <i className="fas fa-layer-group me-2"></i>
                                Deck Requirements
                            </h5>
                        </div>
                        <div className="card-body">
                            <ul className="list-unstyled mb-0">
                                <li className="d-flex align-items-start mb-2">
                                    <i className="fas fa-dollar-sign text-success me-3 mt-1"></i>
                                    <div>
                                        <strong>Starting Budget:</strong> Maximum $75 (TCG Market low pricing)
                                    </div>
                                </li>
                                <li className="d-flex align-items-start mb-2">
                                    <i className="fas fa-mountain text-secondary me-3 mt-1"></i>
                                    <div>
                                        <strong>Basic Lands:</strong> Do not count toward budget
                                    </div>
                                </li>
                                <li className="d-flex align-items-start mb-2">
                                    <i className="fas fa-ban text-danger me-3 mt-1"></i>
                                    <div>
                                        <strong>Banned Cards:</strong> Follow official{' '}
                                        <a href="https://magic.wizards.com/en/banned-restricted-list" target="_blank" rel="noopener noreferrer">
                                            Commander Ban List
                                        </a>
                                    </div>
                                </li>
                                <li className="d-flex align-items-start">
                                    <i className="fas fa-copy text-info me-3 mt-1"></i>
                                    <div>
                                        <strong>Proxies:</strong> Color-only printed proxies are allowed
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Weekly Budget */}
                <div className="col-lg-6">
                    <div className="card h-100">
                        <div className="card-header">
                            <h5 className="mb-0">
                                <i className="fas fa-coins me-2"></i>
                                Weekly Budget
                            </h5>
                        </div>
                        <div className="card-body">
                            <div className="text-center mb-3">
                                <span className="badge fs-4 px-4 py-2 bg-brand-gold">
                                    +$11 / week
                                </span>
                            </div>
                            <ul className="list-unstyled mb-0">
                                <li className="d-flex align-items-start mb-2">
                                    <i className="fas fa-check text-success me-3 mt-1"></i>
                                    <span>TCG Market low pricing</span>
                                </li>
                                <li className="d-flex align-items-start mb-2">
                                    <i className="fas fa-check text-success me-3 mt-1"></i>
                                    <span>Unused budget accumulates week over week</span>
                                </li>
                                <li className="d-flex align-items-start">
                                    <i className="fas fa-check text-success me-3 mt-1"></i>
                                    <span>Commanders can be switched using accumulated budget</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Deck Lock-In Process */}
                <div className="col-12">
                    <div className="card">
                        <div className="card-header">
                            <h5 className="mb-0">
                                <i className="fas fa-lock me-2"></i>
                                Deck Lock-In Process
                            </h5>
                        </div>
                        <div className="card-body">
                            <div className="row">
                                <div className="col-md-6">
                                    <ul className="list-unstyled mb-0">
                                        <li className="d-flex align-items-start mb-2">
                                            <span className="badge bg-primary me-3">1</span>
                                            <span>Lock in your deck anytime before the season starts by taking a cost screenshot</span>
                                        </li>
                                        <li className="d-flex align-items-start mb-2">
                                            <span className="badge bg-primary me-3">2</span>
                                            <span>Decklists are posted on season start day and cannot be modified after <strong>12 PM</strong></span>
                                        </li>
                                    </ul>
                                </div>
                                <div className="col-md-6">
                                    <ul className="list-unstyled mb-0">
                                        <li className="d-flex align-items-start mb-2">
                                            <span className="badge bg-primary me-3">3</span>
                                            <span>Update your decklist weekly before your first game of the week</span>
                                        </li>
                                        <li className="d-flex align-items-start mb-2">
                                            <span className="badge bg-primary me-3">4</span>
                                            <span>Decklist links must remain accessible for the entire season</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                            <div className="alert alert-info mt-3 mb-0">
                                <i className="fas fa-lightbulb me-2"></i>
                                <strong>Tip:</strong> Use Moxfield's "Update to lowest pricing" option
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scoring System */}
                <div className="col-md-6">
                    <div className="card h-100">
                        <div className="card-header">
                            <h5 className="mb-0">
                                <i className="fas fa-star me-2"></i>
                                Scoring System
                            </h5>
                        </div>
                        <div className="card-body">
                            <div className="d-flex justify-content-around text-center">
                                <div>
                                    <div className="fs-2 fw-bold text-success">4</div>
                                    <div className="text-muted">Win</div>
                                </div>
                                <div className="border-start"></div>
                                <div>
                                    <div className="fs-2 fw-bold text-secondary">1</div>
                                    <div className="text-muted">Non-Win</div>
                                </div>
                                <div className="border-start"></div>
                                <div>
                                    <div className="fs-2 fw-bold text-danger">0</div>
                                    <div className="text-muted">Scoop</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Playoff Qualification */}
                <div className="col-md-6">
                    <div className="card h-100">
                        <div className="card-header">
                            <h5 className="mb-0">
                                <i className="fas fa-trophy me-2"></i>
                                Playoff Qualification
                            </h5>
                        </div>
                        <div className="card-body">
                            <div className="text-center mb-3">
                                <span className="badge fs-5 px-4 py-2 bg-brand-purple">
                                    Top 75% Qualify
                                </span>
                            </div>
                            <p className="text-muted small mb-2">Odd numbers round up (adds one extra player)</p>
                            <p className="mb-0">
                                <strong>Tiebreaker Order:</strong><br />
                                <small className="text-muted">Points → Win Rate → Games Won → Games Played → Arm Wrestle</small>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Final Tournament */}
                <div className="col-lg-6">
                    <div className="card h-100">
                        <div className="card-header">
                            <h5 className="mb-0">
                                <i className="fas fa-crown me-2"></i>
                                Final Tournament
                            </h5>
                        </div>
                        <div className="card-body">
                            <ul className="list-unstyled mb-0">
                                <li className="d-flex align-items-start mb-2">
                                    <i className="fas fa-gamepad me-3 mt-1 text-brand-gold"></i>
                                    <div>
                                        <strong>Format:</strong> 4 rounds
                                    </div>
                                </li>
                                <li className="d-flex align-items-start mb-2">
                                    <i className="fas fa-medal me-3 mt-1 text-brand-gold"></i>
                                    <div>
                                        <strong>Championship:</strong> Top 4 players play single elimination
                                    </div>
                                </li>
                                <li className="d-flex align-items-start mb-2">
                                    <i className="fas fa-calculator me-3 mt-1 text-brand-gold"></i>
                                    <div>
                                        <strong>Scoring:</strong> Win = 4, Non-Win = 1, Scoop = 0
                                    </div>
                                </li>
                                <li className="d-flex align-items-start">
                                    <i className="fas fa-sort-amount-down me-3 mt-1 text-brand-gold"></i>
                                    <div>
                                        <strong>Tiebreaker:</strong> Points → Win Rate → Games Won → Arm Wrestle
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Prize Support */}
                <div className="col-lg-6">
                    <div className="card h-100">
                        <div className="card-header">
                            <h5 className="mb-0">
                                <i className="fas fa-gift me-2"></i>
                                Prize Support
                            </h5>
                        </div>
                        <div className="card-body">
                            <h6 className="mb-3">Placement Prizes</h6>
                            <ul className="list-unstyled mb-3">
                                <li className="d-flex align-items-center mb-2">
                                    <span className="badge bg-warning text-dark me-3">1st</span>
                                    <span>1 Set Box (commissioner's choice)</span>
                                </li>
                                <li className="d-flex align-items-center">
                                    <span className="badge bg-secondary me-3">2nd-4th</span>
                                    <span>Split 1 Set Box (commissioner's choice)</span>
                                </li>
                            </ul>
                            <h6 className="mb-2">Voted Awards</h6>
                            <div className="d-flex flex-wrap gap-2">
                                <span className="badge bg-primary">MVP</span>
                                <span className="badge bg-primary">Coolest Deck</span>
                                <span className="badge bg-primary">Most Hated Deck</span>
                                <span className="badge bg-primary">Most Improved</span>
                                <span className="badge bg-primary">Highest Win Rate</span>
                            </div>
                            <p className="text-muted small mt-3 mb-0">
                                <em>All prizes subject to season budget and commissioner discretion</em>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Banned Commanders */}
                <div className="col-12">
                    <div className="card">
                        <div className="card-header">
                            <h5 className="mb-0">
                                <i className="fas fa-ban me-2"></i>
                                Banned Commanders
                            </h5>
                        </div>
                        <div className="card-body text-center">
                            <p className="text-muted mb-0">
                                <i className="fas fa-info-circle me-2"></i>
                                The banned commander list will be provided by the league commissioner. Please refer to official league documentation for the current list.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Rules;
