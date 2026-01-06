import React from 'react';

const WeeklySummary = ({ summary, currentWeek }) => {
    if (!summary || summary.length === 0) {
        return (
            <div className="card">
                <div className="card-body text-center text-muted py-4">
                    <i className="fas fa-calendar-alt fa-2x mb-2"></i>
                    <p>No spending history yet.</p>
                </div>
            </div>
        );
    }

    const totalSpent = summary.reduce((sum, week) => sum + parseFloat(week.budget_used || 0), 0);

    return (
        <div className="card">
            <div className="card-body">
                <h5 className="card-title">
                    <i className="fas fa-chart-line me-2"></i>
                    Weekly Breakdown
                </h5>
                <p className="text-muted small mb-3">
                    Total Spent: ${totalSpent.toFixed(2)}
                </p>

                <div className="table-responsive">
                    <table className="table table-sm table-hover">
                        <thead>
                            <tr>
                                <th>Week</th>
                                <th className="text-center">Cards Added</th>
                                <th className="text-end">Spent This Week</th>
                                <th className="text-end">Week Budget</th>
                                <th className="text-end">Remaining</th>
                            </tr>
                        </thead>
                        <tbody>
                            {summary.map(week => {
                                const spentThisWeek = parseFloat(week.budget_used || 0);
                                const budgetAvailable = parseFloat(week.budget_available || 0);
                                const remaining = parseFloat(week.budget_remaining || 0);
                                const isCurrentWeek = week.week === currentWeek;

                                return (
                                    <tr key={week.week} className={isCurrentWeek ? 'table-active' : ''}>
                                        <td>
                                            <strong>Week {week.week}</strong>
                                            {isCurrentWeek && (
                                                <span className="badge bg-primary ms-2">Current</span>
                                            )}
                                        </td>
                                        <td className="text-center">
                                            {week.card_count > 0 ? (
                                                <span className="badge bg-info">{week.card_count}</span>
                                            ) : (
                                                <span className="text-muted">-</span>
                                            )}
                                        </td>
                                        <td className="text-end">
                                            {spentThisWeek > 0 ? (
                                                <span className="text-danger">${spentThisWeek.toFixed(2)}</span>
                                            ) : (
                                                <span className="text-muted">$0.00</span>
                                            )}
                                        </td>
                                        <td className="text-end">${budgetAvailable.toFixed(2)}</td>
                                        <td className="text-end">
                                            <span className={remaining < 0 ? 'text-danger' : 'text-success'}>
                                                ${remaining.toFixed(2)}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="table-secondary">
                                <td><strong>Total</strong></td>
                                <td className="text-center">
                                    <strong>{summary.reduce((sum, w) => sum + (w.card_count || 0), 0)}</strong>
                                </td>
                                <td className="text-end">
                                    <strong>${summary.reduce((sum, w) => sum + parseFloat(w.budget_used || 0), 0).toFixed(2)}</strong>
                                </td>
                                <td></td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default WeeklySummary;
