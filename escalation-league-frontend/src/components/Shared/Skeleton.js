import React from 'react';
import './Skeleton.css';

/**
 * Base skeleton component with shimmer animation
 */
export const Skeleton = ({ className = '', style = {}, ...props }) => (
    <div className={`skeleton ${className}`} style={style} {...props} />
);

/**
 * Skeleton text line
 * @param {string} size - 'sm', 'md', 'lg', or 'title'
 * @param {string} width - '25', '50', '75', or '100' percent
 */
export const SkeletonText = ({ size = 'md', width = '100', className = '' }) => {
    const sizeClass = size !== 'md' ? `skeleton-text-${size}` : '';
    const widthClass = `skeleton-w-${width}`;
    return <div className={`skeleton skeleton-text ${sizeClass} ${widthClass} ${className}`} />;
};

/**
 * Skeleton avatar (circular)
 * @param {string} size - 'sm', 'md', or 'lg'
 */
export const SkeletonAvatar = ({ size = 'md', className = '' }) => (
    <div className={`skeleton skeleton-avatar skeleton-avatar-${size} ${className}`} />
);

/**
 * Skeleton card with header and body lines
 * @param {number} lines - number of text lines in body
 * @param {boolean} hasAvatar - show avatar in header
 */
export const SkeletonCard = ({ lines = 3, hasAvatar = false, className = '' }) => (
    <div className={`skeleton-card ${className}`}>
        <div className="skeleton-card-header">
            {hasAvatar && <SkeletonAvatar size="md" />}
            <SkeletonText size="lg" width="50" />
        </div>
        <div className="skeleton-card-body">
            {Array.from({ length: lines }).map((_, i) => (
                <SkeletonText key={i} width={i === lines - 1 ? '75' : '100'} />
            ))}
        </div>
    </div>
);

/**
 * Skeleton table rows
 * @param {number} rows - number of rows
 * @param {number} cols - number of columns per row
 */
export const SkeletonTable = ({ rows = 5, cols = 4, className = '' }) => (
    <div className={`skeleton-table ${className}`}>
        {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={rowIndex} className="skeleton-table-row">
                {Array.from({ length: cols }).map((_, colIndex) => (
                    <div key={colIndex} className="skeleton-table-cell">
                        <Skeleton style={{ height: '1rem', width: colIndex === 0 ? '80%' : '60%' }} />
                    </div>
                ))}
            </div>
        ))}
    </div>
);

/**
 * Skeleton for leaderboard entries
 * @param {number} rows - number of leaderboard rows
 */
export const SkeletonLeaderboard = ({ rows = 10, className = '' }) => (
    <div className={className}>
        {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="skeleton-leaderboard-row">
                <Skeleton className="skeleton-rank" />
                <Skeleton className="skeleton-name" />
                <Skeleton className="skeleton-stats" />
                <Skeleton className="skeleton-stats" />
                <Skeleton className="skeleton-stats" />
            </div>
        ))}
    </div>
);

/**
 * Skeleton for stat cards grid
 * @param {number} count - number of stat cards
 */
export const SkeletonStatsGrid = ({ count = 4, className = '' }) => (
    <div className={`skeleton-stats-grid ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="skeleton-stat-card">
                <SkeletonText size="sm" width="50" />
                <SkeletonText size="lg" width="75" />
            </div>
        ))}
    </div>
);

/**
 * Skeleton for user profile header
 */
export const SkeletonProfileHeader = ({ className = '' }) => (
    <div className={`skeleton-profile-header ${className}`}>
        <SkeletonAvatar size="lg" />
        <div className="skeleton-profile-info">
            <SkeletonText size="title" width="50" />
            <SkeletonText size="sm" width="75" />
        </div>
    </div>
);

export default Skeleton;
