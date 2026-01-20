import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import ScryfallApi from '../../../api/scryfallApi';

const UserStandingCard = ({ userStats, leagueId, onUpdateCommander }) => {
    const [commanderCard, setCommanderCard] = useState(null);
    const [partnerCard, setPartnerCard] = useState(null);

    useEffect(() => {
        const fetchCards = async () => {
            if (userStats?.current_commander) {
                try {
                    const card = await ScryfallApi.getCardByName(userStats.current_commander);
                    setCommanderCard(card);
                } catch (err) {
                    console.error('Error fetching commander:', err);
                }
            }
            if (userStats?.commander_partner) {
                try {
                    const card = await ScryfallApi.getCardByName(userStats.commander_partner);
                    setPartnerCard(card);
                } catch (err) {
                    console.error('Error fetching partner:', err);
                }
            }
        };
        fetchCards();
    }, [userStats?.current_commander, userStats?.commander_partner]);

    if (!userStats) {
        return null;
    }

    const winRate = userStats.league_wins + userStats.league_losses > 0
        ? ((userStats.league_wins / (userStats.league_wins + userStats.league_losses)) * 100).toFixed(0)
        : 0;

    return (
        <div className="card mb-4 border-primary">
            <div className="card-body">
                <div className="row">
                    {/* Commander Images */}
                    <div className="col-md-3 col-4 text-center">
                        <div className="d-flex justify-content-center gap-2">
                            {commanderCard?.image_uris?.art_crop ? (
                                <img
                                    src={commanderCard.image_uris.art_crop}
                                    alt={userStats.current_commander}
                                    className="rounded"
                                    style={{
                                        width: partnerCard ? '80px' : '120px',
                                        height: partnerCard ? '60px' : '88px',
                                        objectFit: 'cover'
                                    }}
                                />
                            ) : (
                                <div
                                    className="bg-secondary rounded d-flex align-items-center justify-content-center"
                                    style={{ width: '120px', height: '88px' }}
                                >
                                    <i className="fas fa-hat-wizard fa-2x text-muted"></i>
                                </div>
                            )}
                            {partnerCard?.image_uris?.art_crop && (
                                <img
                                    src={partnerCard.image_uris.art_crop}
                                    alt={userStats.commander_partner}
                                    className="rounded"
                                    style={{ width: '80px', height: '60px', objectFit: 'cover' }}
                                />
                            )}
                        </div>
                        <small className="text-muted d-block mt-2">
                            {userStats.current_commander || 'No commander set'}
                            {userStats.commander_partner && ` + ${userStats.commander_partner}`}
                        </small>
                    </div>

                    {/* Stats */}
                    <div className="col-md-6 col-8">
                        <div className="d-flex align-items-center mb-2">
                            <h4 className="mb-0 me-3">Your Standing</h4>
                            {userStats.rank && (
                                <span className={`badge ${userStats.rank <= 3 ? 'bg-warning text-dark' : 'bg-secondary'} fs-6`}>
                                    #{userStats.rank}
                                </span>
                            )}
                        </div>

                        <div className="row g-3">
                            <div className="col-6 col-sm-3">
                                <div className="text-center p-2 bg-primary bg-opacity-10 rounded">
                                    <div className="fs-4 fw-bold text-primary">{userStats.total_points || 0}</div>
                                    <small className="text-muted">Points</small>
                                </div>
                            </div>
                            <div className="col-6 col-sm-3">
                                <div className="text-center p-2 bg-success bg-opacity-10 rounded">
                                    <div className="fs-4 fw-bold text-success">{userStats.league_wins || 0}</div>
                                    <small className="text-muted">Wins</small>
                                </div>
                            </div>
                            <div className="col-6 col-sm-3">
                                <div className="text-center p-2 bg-danger bg-opacity-10 rounded">
                                    <div className="fs-4 fw-bold text-danger">{userStats.league_losses || 0}</div>
                                    <small className="text-muted">Losses</small>
                                </div>
                            </div>
                            <div className="col-6 col-sm-3">
                                <div className="text-center p-2 bg-info bg-opacity-10 rounded">
                                    <div className="fs-4 fw-bold text-info">{winRate}%</div>
                                    <small className="text-muted">Win Rate</small>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="col-md-3 col-12 mt-3 mt-md-0">
                        <div className="d-flex flex-column gap-2">
                            <button
                                className="btn btn-outline-primary btn-sm"
                                onClick={onUpdateCommander}
                            >
                                <i className="fas fa-edit me-1"></i> Update Commander
                            </button>
                            {userStats.decklist_url && (
                                <a
                                    href={userStats.decklist_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-outline-secondary btn-sm"
                                >
                                    <i className="fas fa-external-link-alt me-1"></i> View Decklist
                                </a>
                            )}
                            <Link
                                to="/leagues/price-check"
                                className="btn btn-outline-secondary btn-sm"
                            >
                                <i className="fas fa-dollar-sign me-1"></i> Price Check
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

UserStandingCard.propTypes = {
    userStats: PropTypes.shape({
        total_points: PropTypes.number,
        league_wins: PropTypes.number,
        league_losses: PropTypes.number,
        current_commander: PropTypes.string,
        commander_partner: PropTypes.string,
        decklist_url: PropTypes.string,
        rank: PropTypes.number
    }),
    leagueId: PropTypes.number,
    onUpdateCommander: PropTypes.func
};

export default UserStandingCard;
