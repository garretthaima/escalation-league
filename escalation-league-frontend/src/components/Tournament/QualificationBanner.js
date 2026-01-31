import React from 'react';

const QualificationBanner = ({ isQualified, userStats, isChampion, isChampionshipQualified }) => {
    if (isChampion) {
        return (
            <div className="alert alert-warning border-warning mb-4">
                <div className="d-flex align-items-center">
                    <i className="fas fa-crown fa-3x text-warning me-3"></i>
                    <div>
                        <h4 className="alert-heading mb-1">
                            Congratulations, League Champion!
                        </h4>
                        <p className="mb-0">
                            You've won the championship and are the league champion!
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (isChampionshipQualified) {
        return (
            <div className="alert alert-success mb-4">
                <div className="d-flex align-items-center">
                    <i className="fas fa-star fa-2x text-success me-3"></i>
                    <div>
                        <h5 className="alert-heading mb-1">
                            Championship Qualifier!
                        </h5>
                        <p className="mb-0">
                            You've made it to the Top 4 and qualified for the championship game!
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (isQualified) {
        return (
            <div className="alert alert-info mb-4">
                <div className="d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center">
                        <i className="fas fa-check-circle fa-2x text-info me-3"></i>
                        <div>
                            <h5 className="alert-heading mb-1">
                                You're Qualified!
                            </h5>
                            <p className="mb-0">
                                Seed #{userStats?.tournament_seed} |{' '}
                                {userStats?.games_played || 0}/4 games played |{' '}
                                {userStats?.tournament_points || 0} tournament points
                            </p>
                        </div>
                    </div>
                    <div className="text-end d-none d-md-block">
                        <div className="fs-4 fw-bold text-info">{userStats?.tournament_points || 0}</div>
                        <small className="text-muted">Points</small>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="alert alert-secondary mb-4">
            <div className="d-flex align-items-center">
                <i className="fas fa-times-circle fa-2x text-muted me-3"></i>
                <div>
                    <h5 className="alert-heading mb-1">
                        Not Qualified
                    </h5>
                    <p className="mb-0">
                        You did not qualify for the tournament. Better luck next season!
                    </p>
                </div>
            </div>
        </div>
    );
};

export default QualificationBanner;
