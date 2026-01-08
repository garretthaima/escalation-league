import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveLeague } from '../../api/leaguesApi';
import { getMetagameAnalysis } from '../../api/metagameApi';
import ColorDistributionChart from './ColorDistributionChart';
import ManaCurveChart from './ManaCurveChart';
import './MetagameDashboard.css';

const MetagameDashboard = () => {
    const [activeLeague, setActiveLeague] = useState(null);
    const [metagame, setMetagame] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [hoveredCard, setHoveredCard] = useState(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const navigate = useNavigate();

    useEffect(() => {
        fetchMetagameData();
    }, []);

    const fetchMetagameData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Get active league
            const leagueData = await getActiveLeague();
            if (!leagueData || !leagueData.id) {
                setError('No active league found. Please join a league first.');
                setLoading(false);
                return;
            }
            setActiveLeague(leagueData);

            // Fetch metagame analysis
            const metagameData = await getMetagameAnalysis(leagueData.id);
            setMetagame(metagameData);

        } catch (err) {
            console.error('Error fetching metagame data:', err);
            setError(err.response?.data?.error || 'Failed to load metagame data.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="container mt-4">
                <div className="text-center">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mt-4">
                <div className="alert alert-danger" role="alert">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    {error}
                </div>
                {error.includes('join a league') && (
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate('/leagues/signup')}
                    >
                        Join a League
                    </button>
                )}
            </div>
        );
    }

    if (!metagame) {
        return (
            <div className="container mt-4">
                <div className="alert alert-info" role="alert">
                    No metagame data available.
                </div>
            </div>
        );
    }

    return (
        <div className="container mt-4 metagame-dashboard">
            <div className="row mb-4">
                <div className="col-12">
                    <div className="d-flex align-items-center mb-3">
                        <h2 className="mb-0">
                            <i className="fas fa-chart-pie me-2" style={{ fontSize: '1.5rem' }}></i>
                            Metagame Analysis
                        </h2>
                        <span className="badge bg-info text-dark ms-3" style={{ fontSize: '0.9rem' }}>BETA</span>
                    </div>
                    {activeLeague && (
                        <p className="text-muted">
                            {activeLeague.name} - {metagame.totalDecks} deck{metagame.totalDecks !== 1 ? 's' : ''} analyzed
                        </p>
                    )}
                </div>
            </div>

            {/* Navigation Tabs */}
            <ul className="nav nav-tabs mb-4" role="tablist">
                <li className="nav-item" role="presentation">
                    <button
                        className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                        type="button"
                    >
                        Overview
                    </button>
                </li>
                <li className="nav-item" role="presentation">
                    <button
                        className={`nav-link ${activeTab === 'commanders' ? 'active' : ''}`}
                        onClick={() => setActiveTab('commanders')}
                        type="button"
                    >
                        Commanders
                    </button>
                </li>
                <li className="nav-item" role="presentation">
                    <button
                        className={`nav-link ${activeTab === 'cards' ? 'active' : ''}`}
                        onClick={() => setActiveTab('cards')}
                        type="button"
                    >
                        Popular Cards
                    </button>
                </li>
                <li className="nav-item" role="presentation">
                    <button
                        className={`nav-link ${activeTab === 'strategy' ? 'active' : ''}`}
                        onClick={() => setActiveTab('strategy')}
                        type="button"
                    >
                        Strategy
                    </button>
                </li>
            </ul>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div className="row">
                    <div className="col-md-6 mb-4">
                        <div className="card">
                            <div className="card-body">
                                <h5 className="card-title">Color Distribution</h5>
                                <ColorDistributionChart colors={
                                    metagame.colorDistribution ?
                                        metagame.colorDistribution.reduce((acc, item) => {
                                            acc[item.color] = item.count;
                                            return acc;
                                        }, {}) : {}
                                } />
                            </div>
                        </div>
                    </div>
                    <div className="col-md-6 mb-4">
                        <div className="card">
                            <div className="card-body">
                                <h5 className="card-title">Average Mana Curve</h5>
                                <ManaCurveChart curve={
                                    metagame.manaCurve?.distribution ?
                                        metagame.manaCurve.distribution.reduce((acc, item) => {
                                            acc[item.cmc] = item.count;
                                            return acc;
                                        }, {}) : {}
                                } />
                            </div>
                        </div>
                    </div>
                    <div className="col-12 mb-4">
                        <div className="card">
                            <div className="card-body">
                                <h5 className="card-title">Staples (in 40%+ of decks)</h5>
                                {metagame.staples && metagame.staples.length > 0 ? (
                                    <div className="row">
                                        {metagame.staples.map((card, idx) => (
                                            <div key={idx} className="col-md-2 col-sm-3 col-4 mb-3 text-center">
                                                {card.image_uri ? (
                                                    <div>
                                                        <img
                                                            src={card.image_uri}
                                                            alt={card.name}
                                                            className="img-fluid rounded mb-2"
                                                            style={{ cursor: 'pointer' }}
                                                            title={card.name}
                                                        />
                                                        <div style={{ color: '#f8f9fa', fontSize: '0.875rem' }}>
                                                            <strong>{card.count}</strong> - {card.name}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <span className="badge bg-secondary me-2">{card.count}</span>
                                                        {card.name}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-muted">No staples found (league may have diverse deck lists)</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Commanders Tab */}
            {activeTab === 'commanders' && (
                <div className="row">
                    <div className="col-md-6 mb-4">
                        <div className="card">
                            <div className="card-body">
                                <h5 className="card-title">Most Popular Cards</h5>
                                {metagame.topCards && metagame.topCards.length > 0 ? (
                                    <table className="table table-sm">
                                        <thead>
                                            <tr>
                                                <th>Card</th>
                                                <th>Decks</th>
                                                <th>%</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {metagame.topCards.map((card, idx) => (
                                                <tr key={idx}>
                                                    <td>{card.name}</td>
                                                    <td>{card.count}</td>
                                                    <td>{card.percentage}%</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p className="text-muted">No card data available</p>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="col-md-6 mb-4">
                        <div className="card">
                            <div className="card-body">
                                <h5 className="card-title">Commander Synergies</h5>
                                {metagame.commanderSynergies && Object.keys(metagame.commanderSynergies).length > 0 ? (
                                    <table className="table table-sm">
                                        <thead>
                                            <tr>
                                                <th>Commander</th>
                                                <th>Top Synergy Cards</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.entries(metagame.commanderSynergies).slice(0, 5).map(([commander, cards], idx) => (
                                                <tr key={idx}>
                                                    <td><strong>{commander}</strong></td>
                                                    <td>
                                                        <small className="text-muted">
                                                            {cards.slice(0, 5).map(c => c.name).join(', ')}
                                                        </small>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p className="text-muted">Not enough data to identify synergies</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Popular Cards Tab */}
            {activeTab === 'cards' && (
                <div className="row">
                    <div className="col-12 mb-4">
                        <div className="card">
                            <div className="card-body">
                                <h5 className="card-title">Top Cards</h5>
                                {metagame.topCards && metagame.topCards.length > 0 ? (
                                    <>
                                        {/* Pagination controls at top */}
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                            <div>
                                                <span className="text-muted">
                                                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, metagame.topCards.length)} of {metagame.topCards.length} cards
                                                </span>
                                            </div>
                                            <div>
                                                <select
                                                    className="form-select form-select-sm d-inline-block w-auto"
                                                    value={itemsPerPage}
                                                    onChange={(e) => {
                                                        setItemsPerPage(Number(e.target.value));
                                                        setCurrentPage(1);
                                                    }}
                                                >
                                                    <option value={10}>10 per page</option>
                                                    <option value={25}>25 per page</option>
                                                    <option value={50}>50 per page</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div style={{ position: 'relative' }}>
                                            <table className="table table-sm table-hover">
                                                <thead>
                                                    <tr>
                                                        <th>#</th>
                                                        <th>Card</th>
                                                        <th>Decks</th>
                                                        <th>%</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {metagame.topCards
                                                        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                                                        .map((card, idx) => (
                                                            <tr
                                                                key={idx}
                                                                onMouseEnter={(e) => {
                                                                    setHoveredCard(card);
                                                                    setMousePosition({ x: e.clientX, y: e.clientY });
                                                                }}
                                                                onMouseMove={(e) => {
                                                                    if (hoveredCard) {
                                                                        setMousePosition({ x: e.clientX, y: e.clientY });
                                                                    }
                                                                }}
                                                                onMouseLeave={() => setHoveredCard(null)}
                                                                onClick={() => setHoveredCard(hoveredCard?.name === card.name ? null : card)}
                                                                style={{ cursor: card.image_uri ? 'pointer' : 'default' }}
                                                            >
                                                                <td>{((currentPage - 1) * itemsPerPage) + idx + 1}</td>
                                                                <td>{card.name}</td>
                                                                <td>
                                                                    <span className="badge bg-primary">{card.count}</span>
                                                                </td>
                                                                <td>{card.percentage}%</td>
                                                            </tr>
                                                        ))}
                                                </tbody>
                                            </table>

                                            {/* Card preview on hover */}
                                            {hoveredCard && (hoveredCard.image_uri || (hoveredCard.image_uris && hoveredCard.image_uris.length > 0)) && (
                                                <div
                                                    className="card-preview-popup"
                                                    style={{
                                                        position: 'fixed',
                                                        left: `${mousePosition.x + 20}px`,
                                                        top: `${mousePosition.y - 150}px`,
                                                        zIndex: 1050,
                                                        pointerEvents: 'none',
                                                        display: 'flex',
                                                        gap: '10px'
                                                    }}
                                                >
                                                    {hoveredCard.image_uris && hoveredCard.image_uris.length > 1 ? (
                                                        // Multi-faced card: show both faces
                                                        hoveredCard.image_uris.map((uri, idx) => (
                                                            <img
                                                                key={idx}
                                                                src={uri}
                                                                alt={`${hoveredCard.name} - Face ${idx + 1}`}
                                                                className="img-fluid rounded shadow-lg"
                                                                style={{
                                                                    maxWidth: '200px',
                                                                    border: '2px solid #fff'
                                                                }}
                                                            />
                                                        ))
                                                    ) : (
                                                        // Single-faced card
                                                        <img
                                                            src={hoveredCard.image_uri}
                                                            alt={hoveredCard.name}
                                                            className="img-fluid rounded shadow-lg"
                                                            style={{
                                                                maxWidth: '250px',
                                                                border: '2px solid #fff'
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Pagination controls at bottom */}
                                        <nav aria-label="Card navigation" className="mt-3">
                                            <ul className="pagination justify-content-center mb-0">
                                                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                                    <button
                                                        className="page-link"
                                                        onClick={() => setCurrentPage(currentPage - 1)}
                                                        disabled={currentPage === 1}
                                                    >
                                                        Previous
                                                    </button>
                                                </li>
                                                {Array.from({ length: Math.ceil(metagame.topCards.length / itemsPerPage) }, (_, i) => i + 1).map(page => (
                                                    <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                                                        <button
                                                            className="page-link"
                                                            onClick={() => setCurrentPage(page)}
                                                        >
                                                            {page}
                                                        </button>
                                                    </li>
                                                ))}
                                                <li className={`page-item ${currentPage === Math.ceil(metagame.topCards.length / itemsPerPage) ? 'disabled' : ''}`}>
                                                    <button
                                                        className="page-link"
                                                        onClick={() => setCurrentPage(currentPage + 1)}
                                                        disabled={currentPage === Math.ceil(metagame.topCards.length / itemsPerPage)}
                                                    >
                                                        Next
                                                    </button>
                                                </li>
                                            </ul>
                                        </nav>
                                    </>
                                ) : (
                                    <p className="text-muted">No top cards data available</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Strategy Tab */}
            {activeTab === 'strategy' && (
                <div className="row">
                    <div className="col-md-4 mb-4">
                        <div className="card">
                            <div className="card-body">
                                <h5 className="card-title">Resources</h5>
                                {metagame.resources ? (
                                    <div>
                                        <div className="mb-3 p-2 border-start border-success border-3">
                                            <h6 className="text-success mb-2">
                                                <i className="fas fa-seedling me-2"></i>Ramp
                                            </h6>
                                            <p className="mb-1">Total: <strong>{metagame.resources.ramp.totalCount}</strong></p>
                                            <p className="mb-0">Avg per deck: <strong>{metagame.resources.ramp.averagePerDeck}</strong></p>
                                        </div>

                                        <div className="p-2 border-start border-info border-3">
                                            <h6 className="text-info mb-2">
                                                <i className="fas fa-book me-2"></i>Card Draw
                                            </h6>
                                            <p className="mb-1">Total: <strong>{metagame.resources.cardDraw.totalCount}</strong></p>
                                            <p className="mb-0">Avg per deck: <strong>{metagame.resources.cardDraw.averagePerDeck}</strong></p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-muted">No resource data</p>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="col-md-4 mb-4">
                        <div className="card">
                            <div className="card-body">
                                <h5 className="card-title">Interaction</h5>
                                {metagame.interaction ? (
                                    <div>
                                        <div className="mb-2 p-2 border-start border-danger border-3">
                                            <h6 className="text-danger mb-1">
                                                <i className="fas fa-skull-crossbones me-2"></i>Removal
                                            </h6>
                                            <p className="mb-0"><strong>{metagame.interaction.removal}</strong></p>
                                        </div>

                                        <div className="mb-2 p-2 border-start border-primary border-3">
                                            <h6 className="text-primary mb-1">
                                                <i className="fas fa-ban me-2"></i>Counterspells
                                            </h6>
                                            <p className="mb-0"><strong>{metagame.interaction.counterspells}</strong></p>
                                        </div>

                                        <div className="p-2 border-start border-warning border-3">
                                            <h6 className="text-warning mb-1">
                                                <i className="fas fa-bomb me-2"></i>Board Wipes
                                            </h6>
                                            <p className="mb-0"><strong>{metagame.interaction.boardWipes}</strong></p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-muted">No interaction data</p>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="col-md-4 mb-4">
                        <div className="card">
                            <div className="card-body">
                                <h5 className="card-title">Win Conditions</h5>
                                {metagame.winConditions ? (
                                    <div>
                                        <div className="mb-2 p-2 border-start border-danger border-3">
                                            <h6 className="text-danger mb-1">
                                                <i className="fas fa-fist-raised me-2"></i>Combat
                                            </h6>
                                            <p className="mb-0"><strong>{metagame.winConditions.combat}</strong></p>
                                        </div>

                                        <div className="mb-2 p-2 border-start border-success border-3">
                                            <h6 className="text-success mb-1">
                                                <i className="fas fa-cog me-2"></i>Combo
                                            </h6>
                                            <p className="mb-0"><strong>{metagame.winConditions.combo}</strong></p>
                                        </div>

                                        <div className="mb-2 p-2 border-start border-info border-3">
                                            <h6 className="text-info mb-1">
                                                <i className="fas fa-star me-2"></i>Alternate
                                            </h6>
                                            <p className="mb-0"><strong>{metagame.winConditions.alternate}</strong></p>
                                        </div>

                                        <div className="p-2 border-start border-secondary border-3">
                                            <h6 className="text-secondary mb-1">
                                                <i className="fas fa-trophy me-2"></i>Total
                                            </h6>
                                            <p className="mb-0"><strong>{metagame.winConditions.totalCards}</strong></p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-muted">No win condition data</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Keyword Mechanics */}
                    {metagame.keywords && (
                        <div className="col-12 mb-4">
                            <div className="card">
                                <div className="card-body">
                                    <h5 className="card-title">Keyword Mechanics</h5>
                                    <div className="row">
                                        {/* Combat Keywords */}
                                        {metagame.keywords.combat && metagame.keywords.combat.length > 0 && (
                                            <div className="col-md-6 mb-4">
                                                <h6 className="text-danger mb-3">
                                                    <i className="fas fa-sword me-2"></i>Combat Keywords
                                                </h6>
                                                {metagame.keywords.combat.slice(0, 6).map((kw, idx) => (
                                                    <div key={idx} className="mb-2">
                                                        <div className="d-flex justify-content-between mb-1">
                                                            <span>{kw.keyword}</span>
                                                            <span className="text-muted">{kw.count} ({kw.percentage}% of {kw.baseType || 'creatures'})</span>
                                                        </div>
                                                        <div className="progress" style={{ height: '8px' }}>
                                                            <div
                                                                className="progress-bar bg-danger"
                                                                style={{ width: `${kw.percentage}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Protection Keywords */}
                                        {metagame.keywords.protection && metagame.keywords.protection.length > 0 && (
                                            <div className="col-md-6 mb-4">
                                                <h6 className="text-primary mb-3">
                                                    <i className="fas fa-shield-alt me-2"></i>Protection Keywords
                                                </h6>
                                                {metagame.keywords.protection.slice(0, 6).map((kw, idx) => (
                                                    <div key={idx} className="mb-2">
                                                        <div className="d-flex justify-content-between mb-1">
                                                            <span>{kw.keyword}</span>
                                                            <span className="text-muted">{kw.count} ({kw.percentage}% of {kw.baseType || 'creatures'})</span>
                                                        </div>
                                                        <div className="progress" style={{ height: '8px' }}>
                                                            <div
                                                                className="progress-bar bg-primary"
                                                                style={{ width: `${kw.percentage}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Speed Keywords */}
                                        {metagame.keywords.speed && metagame.keywords.speed.length > 0 && (
                                            <div className="col-md-6 mb-4">
                                                <h6 className="text-warning mb-3">
                                                    <i className="fas fa-bolt me-2"></i>Speed Keywords
                                                </h6>
                                                {metagame.keywords.speed.slice(0, 6).map((kw, idx) => (
                                                    <div key={idx} className="mb-2">
                                                        <div className="d-flex justify-content-between mb-1">
                                                            <span>{kw.keyword}</span>
                                                            <span className="text-muted">{kw.count} ({kw.percentage}% of {kw.baseType || 'cards'})</span>
                                                        </div>
                                                        <div className="progress" style={{ height: '8px' }}>
                                                            <div
                                                                className="progress-bar bg-warning"
                                                                style={{ width: `${kw.percentage}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Utility Keywords */}
                                        {metagame.keywords.utility && metagame.keywords.utility.length > 0 && (
                                            <div className="col-md-6 mb-4">
                                                <h6 className="text-success mb-3">
                                                    <i className="fas fa-cogs me-2"></i>Utility Keywords
                                                </h6>
                                                {metagame.keywords.utility.slice(0, 6).map((kw, idx) => (
                                                    <div key={idx} className="mb-2">
                                                        <div className="d-flex justify-content-between mb-1">
                                                            <span>{kw.keyword}</span>
                                                            <span className="text-muted">{kw.count} ({kw.percentage}% of {kw.baseType || 'cards'})</span>
                                                        </div>
                                                        <div className="progress" style={{ height: '8px' }}>
                                                            <div
                                                                className="progress-bar bg-success"
                                                                style={{ width: `${kw.percentage}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MetagameDashboard;
