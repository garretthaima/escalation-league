import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveLeague } from '../../api/leaguesApi';
import { getBudget, createBudget, getBudgetCards, getBudgetSummary, refreshCardPrices } from '../../api/budgetApi';
import CardSearch from './CardSearch';
import BudgetCardList from './BudgetCardList';
import WeeklySummary from './WeeklySummary';
import './BudgetDashboard.css';

const BudgetDashboard = () => {
    const [activeLeague, setActiveLeague] = useState(null);
    const [budget, setBudget] = useState(null);
    const [cards, setCards] = useState([]);
    const [summary, setSummary] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchBudgetData();
    }, []);

    const fetchBudgetData = async () => {
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

            // Get or create budget
            let budgetData;
            try {
                budgetData = await getBudget(leagueData.id);
            } catch (err) {
                if (err.response?.status === 404) {
                    // Budget doesn't exist, create it
                    budgetData = await createBudget(leagueData.id);
                } else {
                    throw err;
                }
            }
            setBudget(budgetData);

            // Fetch cards and summary
            const [cardsData, summaryData] = await Promise.all([
                getBudgetCards(budgetData.id),
                getBudgetSummary(budgetData.id)
            ]);
            setCards(cardsData);
            setSummary(summaryData.weekly_summary || []);

        } catch (err) {
            console.error('Error fetching budget data:', err);
            setError(err.response?.data?.error || 'Failed to load budget data.');
        } finally {
            setLoading(false);
        }
    };

    const handleCardAdded = async () => {
        // Refresh budget and cards after adding
        await fetchBudgetData();
    };

    const handleCardUpdated = async () => {
        // Refresh budget and cards after updating
        await fetchBudgetData();
    };

    const handleCardRemoved = async () => {
        // Refresh budget and cards after removing
        await fetchBudgetData();
    };

    const handleRefreshPrices = async () => {
        try {
            setRefreshing(true);
            await refreshCardPrices(budget.id);
            await fetchBudgetData();
        } catch (err) {
            console.error('Error refreshing prices:', err);
            alert('Failed to refresh prices: ' + (err.response?.data?.error || 'Unknown error'));
        } finally {
            setRefreshing(false);
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

    if (!budget) {
        return (
            <div className="container mt-4">
                <div className="alert alert-info" role="alert">
                    No budget data available.
                </div>
            </div>
        );
    }

    const remainingBudget = parseFloat(budget.budget_available) - parseFloat(budget.budget_used);
    const budgetPercentage = (parseFloat(budget.budget_used) / parseFloat(budget.budget_available)) * 100;

    return (
        <div className="container mt-4 budget-dashboard">
            <div className="row mb-4">
                <div className="col-12">
                    <h2 className="mb-3">
                        <i className="fas fa-wallet me-2"></i>
                        Budget Dashboard
                    </h2>
                    {activeLeague && (
                        <p className="text-muted">
                            {activeLeague.name} - Week {activeLeague.current_week}
                        </p>
                    )}
                </div>
            </div>

            {/* Budget Overview */}
            <div className="row mb-4">
                <div className="col-md-8">
                    <div className="card">
                        <div className="card-body">
                            <h5 className="card-title">Budget Overview</h5>
                            <div className="budget-stats">
                                <div className="stat-item">
                                    <span className="stat-label">Total Budget:</span>
                                    <span className="stat-value">${parseFloat(budget.budget_available).toFixed(2)}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Used:</span>
                                    <span className="stat-value text-danger">${parseFloat(budget.budget_used).toFixed(2)}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Remaining:</span>
                                    <span className="stat-value text-success">${remainingBudget.toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="progress mt-3" style={{ height: '25px' }}>
                                <div
                                    className={`progress-bar ${budgetPercentage > 90 ? 'bg-danger' : budgetPercentage > 70 ? 'bg-warning' : 'bg-success'}`}
                                    role="progressbar"
                                    style={{ width: `${budgetPercentage}%` }}
                                    aria-valuenow={budgetPercentage}
                                    aria-valuemin="0"
                                    aria-valuemax="100"
                                >
                                    {budgetPercentage.toFixed(1)}%
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card">
                        <div className="card-body text-center">
                            <h5 className="card-title">Total Cards</h5>
                            <div className="display-4 text-primary">
                                {budget.total_cards || 0}
                            </div>
                            <button
                                className="btn btn-sm btn-outline-primary mt-3"
                                onClick={handleRefreshPrices}
                                disabled={refreshing || cards.length === 0}
                            >
                                {refreshing ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                        Refreshing...
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-sync-alt me-2"></i>
                                        Refresh Prices
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Card Search */}
            <div className="row mb-4">
                <div className="col-12">
                    <CardSearch
                        budgetId={budget.id}
                        remainingBudget={remainingBudget}
                        onCardAdded={handleCardAdded}
                        currentWeek={activeLeague?.current_week || 1}
                    />
                </div>
            </div>

            {/* Budget Cards List */}
            <div className="row mb-4">
                <div className="col-12">
                    <BudgetCardList
                        budgetId={budget.id}
                        cards={cards}
                        remainingBudget={remainingBudget}
                        onCardUpdated={handleCardUpdated}
                        onCardRemoved={handleCardRemoved}
                    />
                </div>
            </div>

            {/* Weekly Summary */}
            <div className="row mb-4">
                <div className="col-12">
                    <WeeklySummary
                        summary={summary}
                        currentWeek={activeLeague?.current_week || 1}
                    />
                </div>
            </div>
        </div>
    );
};

export default BudgetDashboard;
