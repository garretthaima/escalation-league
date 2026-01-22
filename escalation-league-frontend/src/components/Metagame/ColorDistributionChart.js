import React from 'react';
import ManaSymbol from '../Shared/ManaSymbols';

const ColorDistributionChart = ({ colors }) => {
    // Safety check for undefined/null colors
    if (!colors || typeof colors !== 'object') {
        return <p className="text-muted">No color distribution data available</p>;
    }

    const colorMap = {
        W: { name: 'White', color: '#F0E68C' },
        U: { name: 'Blue', color: '#4682B4' },
        B: { name: 'Black', color: '#696969' },
        R: { name: 'Red', color: '#DC143C' },
        G: { name: 'Green', color: '#228B22' },
        C: { name: 'Colorless', color: '#A9A9A9' }
    };

    const total = Object.values(colors).reduce((sum, val) => sum + val, 0);

    return (
        <div className="color-distribution">
            {Object.entries(colors).map(([color, count]) => {
                const percentage = total > 0 ? (count / total) * 100 : 0;
                const colorInfo = colorMap[color];

                // Skip if color not in map or count is 0
                if (!colorInfo || count === 0) return null;

                return (
                    <div key={color} className="mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="d-flex align-items-center">
                                <ManaSymbol color={color} size={24} className="me-2" />
                                <strong>{colorInfo.name}</strong>
                            </span>
                            <span className="text-muted">{count} ({percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="progress" style={{ height: '20px' }}>
                            <div
                                className="progress-bar"
                                role="progressbar"
                                style={{
                                    width: `${percentage}%`,
                                    backgroundColor: colorInfo.color
                                }}
                                aria-valuenow={percentage}
                                aria-valuemin="0"
                                aria-valuemax="100"
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ColorDistributionChart;
