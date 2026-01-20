import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import ColorDistributionChart from '../../Metagame/ColorDistributionChart';

const MetagamePreview = ({ metagame, leagueId }) => {
    if (!metagame) {
        return (
            <div className="text-center text-muted py-4">
                <i className="fas fa-chart-pie fa-3x mb-3"></i>
                <p>No metagame data available yet.</p>
                <small>Data will appear once players submit their decklists.</small>
            </div>
        );
    }

    const colorData = metagame.colorDistribution
        ? metagame.colorDistribution.reduce((acc, item) => {
            acc[item.color] = item.count;
            return acc;
        }, {})
        : {};

    return (
        <div>
            <div className="row">
                {/* Color Distribution */}
                <div className="col-md-6 mb-4 mb-md-0">
                    <h6 className="text-muted mb-3">Color Distribution</h6>
                    <div style={{ height: '200px' }}>
                        <ColorDistributionChart colors={colorData} />
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="col-md-6">
                    <h6 className="text-muted mb-3">Quick Stats</h6>
                    <div className="row g-2">
                        <div className="col-6">
                            <div className="p-3 bg-dark bg-opacity-25 rounded text-center">
                                <div className="fs-4 fw-bold">{metagame.totalDecks || 0}</div>
                                <small className="text-muted">Decks Analyzed</small>
                            </div>
                        </div>
                        <div className="col-6">
                            <div className="p-3 bg-dark bg-opacity-25 rounded text-center">
                                <div className="fs-4 fw-bold">{metagame.totalCards || 0}</div>
                                <small className="text-muted">Unique Cards</small>
                            </div>
                        </div>
                    </div>

                    {/* Top Staples */}
                    {metagame.staples && metagame.staples.length > 0 && (
                        <div className="mt-3">
                            <h6 className="text-muted mb-2">Top Staples</h6>
                            <div className="d-flex flex-wrap gap-1">
                                {metagame.staples.slice(0, 5).map((card, idx) => (
                                    <span key={idx} className="badge bg-secondary">
                                        {card.name} ({card.count})
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Link to full metagame */}
            <div className="text-center mt-4 pt-3 border-top">
                <Link to="/leagues/metagame" className="btn btn-outline-primary">
                    <i className="fas fa-chart-bar me-2"></i>
                    View Full Metagame Analysis
                </Link>
            </div>
        </div>
    );
};

MetagamePreview.propTypes = {
    metagame: PropTypes.shape({
        totalDecks: PropTypes.number,
        totalCards: PropTypes.number,
        colorDistribution: PropTypes.array,
        staples: PropTypes.array
    }),
    leagueId: PropTypes.number
};

export default MetagamePreview;
