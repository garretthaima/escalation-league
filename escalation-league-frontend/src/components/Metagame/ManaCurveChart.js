import React from 'react';

const ManaCurveChart = ({ curve }) => {
    if (!curve || Object.keys(curve).length === 0) {
        return <p className="text-muted">No mana curve data available</p>;
    }

    // Convert all values to numbers and get max count for scaling
    const entries = Object.entries(curve).map(([cmc, count]) => {
        const countValue = typeof count === 'object' ? (count.count || 0) : (Number(count) || 0);
        return [cmc, countValue];
    });

    const maxCount = Math.max(...entries.map(([, count]) => count));
    const maxHeight = 200; // pixels

    // Sort by CMC
    const sortedCurve = entries.sort(([a], [b]) => {
        const numA = a === '7+' ? 7 : parseInt(a);
        const numB = b === '7+' ? 7 : parseInt(b);
        return numA - numB;
    });

    return (
        <div className="mana-curve-chart">
            <div className="d-flex align-items-end justify-content-around" style={{ height: `${maxHeight + 60}px`, paddingTop: '30px' }}>
                {sortedCurve.map(([cmc, countValue]) => {
                    const height = maxCount > 0 ? (countValue / maxCount) * maxHeight : 0;

                    return (
                        <div key={cmc} className="text-center" style={{ flex: 1 }}>
                            <div className="mb-2">
                                <small style={{ color: '#6c757d' }}>{countValue}</small>
                            </div>
                            <div
                                className="rounded-top mx-2"
                                style={{
                                    height: `${height}px`,
                                    minHeight: countValue > 0 ? '10px' : '0',
                                    transition: 'height 0.3s ease',
                                    background: 'linear-gradient(180deg, var(--brand-purple-light, #4a2f70) 0%, var(--brand-purple, #2d1b4e) 100%)'
                                }}
                                title={`CMC ${cmc}: ${countValue} cards`}
                            />
                            <div className="mt-2">
                                <strong>{cmc}</strong>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="text-center mt-3" style={{ color: '#6c757d' }}>
                <small>Converted Mana Cost (CMC)</small>
            </div>
        </div>
    );
};

export default ManaCurveChart;
