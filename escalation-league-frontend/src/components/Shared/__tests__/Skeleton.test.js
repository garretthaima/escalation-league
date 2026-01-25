import React from 'react';
import { render } from '@testing-library/react';
import {
    Skeleton,
    SkeletonText,
    SkeletonAvatar,
    SkeletonCard,
    SkeletonTable,
    SkeletonLeaderboard,
    SkeletonStatsGrid,
    SkeletonProfileHeader
} from '../Skeleton';

describe('Skeleton Components', () => {
    describe('Skeleton (base)', () => {
        it('should render with skeleton class', () => {
            const { container } = render(<Skeleton />);
            expect(container.querySelector('.skeleton')).toBeInTheDocument();
        });

        it('should apply additional className', () => {
            const { container } = render(<Skeleton className="custom-class" />);
            expect(container.querySelector('.custom-class')).toBeInTheDocument();
        });

        it('should apply inline styles', () => {
            const { container } = render(<Skeleton style={{ width: '100px', height: '20px' }} />);
            const skeleton = container.querySelector('.skeleton');
            expect(skeleton).toHaveStyle({ width: '100px', height: '20px' });
        });

        it('should pass through additional props', () => {
            const { container } = render(<Skeleton data-testid="test-skeleton" />);
            expect(container.querySelector('[data-testid="test-skeleton"]')).toBeInTheDocument();
        });
    });

    describe('SkeletonText', () => {
        it('should render with skeleton-text class', () => {
            const { container } = render(<SkeletonText />);
            expect(container.querySelector('.skeleton-text')).toBeInTheDocument();
        });

        it('should apply default width of 100', () => {
            const { container } = render(<SkeletonText />);
            expect(container.querySelector('.skeleton-w-100')).toBeInTheDocument();
        });

        it('should apply custom width', () => {
            const { container } = render(<SkeletonText width="50" />);
            expect(container.querySelector('.skeleton-w-50')).toBeInTheDocument();
        });

        it('should apply sm size', () => {
            const { container } = render(<SkeletonText size="sm" />);
            expect(container.querySelector('.skeleton-text-sm')).toBeInTheDocument();
        });

        it('should apply lg size', () => {
            const { container } = render(<SkeletonText size="lg" />);
            expect(container.querySelector('.skeleton-text-lg')).toBeInTheDocument();
        });

        it('should apply title size', () => {
            const { container } = render(<SkeletonText size="title" />);
            expect(container.querySelector('.skeleton-text-title')).toBeInTheDocument();
        });

        it('should not add size class for md (default)', () => {
            const { container } = render(<SkeletonText size="md" />);
            expect(container.querySelector('.skeleton-text-md')).not.toBeInTheDocument();
        });

        it('should apply additional className', () => {
            const { container } = render(<SkeletonText className="custom" />);
            expect(container.querySelector('.custom')).toBeInTheDocument();
        });
    });

    describe('SkeletonAvatar', () => {
        it('should render with skeleton-avatar class', () => {
            const { container } = render(<SkeletonAvatar />);
            expect(container.querySelector('.skeleton-avatar')).toBeInTheDocument();
        });

        it('should apply default md size', () => {
            const { container } = render(<SkeletonAvatar />);
            expect(container.querySelector('.skeleton-avatar-md')).toBeInTheDocument();
        });

        it('should apply sm size', () => {
            const { container } = render(<SkeletonAvatar size="sm" />);
            expect(container.querySelector('.skeleton-avatar-sm')).toBeInTheDocument();
        });

        it('should apply lg size', () => {
            const { container } = render(<SkeletonAvatar size="lg" />);
            expect(container.querySelector('.skeleton-avatar-lg')).toBeInTheDocument();
        });

        it('should apply additional className', () => {
            const { container } = render(<SkeletonAvatar className="custom" />);
            expect(container.querySelector('.custom')).toBeInTheDocument();
        });
    });

    describe('SkeletonCard', () => {
        it('should render with skeleton-card class', () => {
            const { container } = render(<SkeletonCard />);
            expect(container.querySelector('.skeleton-card')).toBeInTheDocument();
        });

        it('should render header and body', () => {
            const { container } = render(<SkeletonCard />);
            expect(container.querySelector('.skeleton-card-header')).toBeInTheDocument();
            expect(container.querySelector('.skeleton-card-body')).toBeInTheDocument();
        });

        it('should render 3 text lines by default', () => {
            const { container } = render(<SkeletonCard />);
            const bodyTexts = container.querySelectorAll('.skeleton-card-body .skeleton-text');
            expect(bodyTexts).toHaveLength(3);
        });

        it('should render custom number of lines', () => {
            const { container } = render(<SkeletonCard lines={5} />);
            const bodyTexts = container.querySelectorAll('.skeleton-card-body .skeleton-text');
            expect(bodyTexts).toHaveLength(5);
        });

        it('should not render avatar by default', () => {
            const { container } = render(<SkeletonCard />);
            expect(container.querySelector('.skeleton-avatar')).not.toBeInTheDocument();
        });

        it('should render avatar when hasAvatar is true', () => {
            const { container } = render(<SkeletonCard hasAvatar={true} />);
            expect(container.querySelector('.skeleton-avatar')).toBeInTheDocument();
        });

        it('should apply additional className', () => {
            const { container } = render(<SkeletonCard className="custom" />);
            expect(container.querySelector('.custom')).toBeInTheDocument();
        });
    });

    describe('SkeletonTable', () => {
        it('should render with skeleton-table class', () => {
            const { container } = render(<SkeletonTable />);
            expect(container.querySelector('.skeleton-table')).toBeInTheDocument();
        });

        it('should render 5 rows by default', () => {
            const { container } = render(<SkeletonTable />);
            const rows = container.querySelectorAll('.skeleton-table-row');
            expect(rows).toHaveLength(5);
        });

        it('should render 4 columns by default', () => {
            const { container } = render(<SkeletonTable />);
            const firstRow = container.querySelector('.skeleton-table-row');
            const cells = firstRow.querySelectorAll('.skeleton-table-cell');
            expect(cells).toHaveLength(4);
        });

        it('should render custom rows and cols', () => {
            const { container } = render(<SkeletonTable rows={3} cols={6} />);
            const rows = container.querySelectorAll('.skeleton-table-row');
            expect(rows).toHaveLength(3);
            const firstRowCells = rows[0].querySelectorAll('.skeleton-table-cell');
            expect(firstRowCells).toHaveLength(6);
        });

        it('should apply additional className', () => {
            const { container } = render(<SkeletonTable className="custom" />);
            expect(container.querySelector('.custom')).toBeInTheDocument();
        });
    });

    describe('SkeletonLeaderboard', () => {
        it('should render 10 rows by default', () => {
            const { container } = render(<SkeletonLeaderboard />);
            const rows = container.querySelectorAll('.skeleton-leaderboard-row');
            expect(rows).toHaveLength(10);
        });

        it('should render custom number of rows', () => {
            const { container } = render(<SkeletonLeaderboard rows={5} />);
            const rows = container.querySelectorAll('.skeleton-leaderboard-row');
            expect(rows).toHaveLength(5);
        });

        it('should render rank, name, and stats skeletons', () => {
            const { container } = render(<SkeletonLeaderboard rows={1} />);
            expect(container.querySelector('.skeleton-rank')).toBeInTheDocument();
            expect(container.querySelector('.skeleton-name')).toBeInTheDocument();
            expect(container.querySelectorAll('.skeleton-stats')).toHaveLength(3);
        });

        it('should apply additional className', () => {
            const { container } = render(<SkeletonLeaderboard className="custom" />);
            expect(container.querySelector('.custom')).toBeInTheDocument();
        });
    });

    describe('SkeletonStatsGrid', () => {
        it('should render with skeleton-stats-grid class', () => {
            const { container } = render(<SkeletonStatsGrid />);
            expect(container.querySelector('.skeleton-stats-grid')).toBeInTheDocument();
        });

        it('should render 4 stat cards by default', () => {
            const { container } = render(<SkeletonStatsGrid />);
            const cards = container.querySelectorAll('.skeleton-stat-card');
            expect(cards).toHaveLength(4);
        });

        it('should render custom number of stat cards', () => {
            const { container } = render(<SkeletonStatsGrid count={6} />);
            const cards = container.querySelectorAll('.skeleton-stat-card');
            expect(cards).toHaveLength(6);
        });

        it('should have text elements in each stat card', () => {
            const { container } = render(<SkeletonStatsGrid count={1} />);
            const card = container.querySelector('.skeleton-stat-card');
            const texts = card.querySelectorAll('.skeleton-text');
            expect(texts).toHaveLength(2);
        });

        it('should apply additional className', () => {
            const { container } = render(<SkeletonStatsGrid className="custom" />);
            expect(container.querySelector('.custom')).toBeInTheDocument();
        });
    });

    describe('SkeletonProfileHeader', () => {
        it('should render with skeleton-profile-header class', () => {
            const { container } = render(<SkeletonProfileHeader />);
            expect(container.querySelector('.skeleton-profile-header')).toBeInTheDocument();
        });

        it('should render large avatar', () => {
            const { container } = render(<SkeletonProfileHeader />);
            expect(container.querySelector('.skeleton-avatar-lg')).toBeInTheDocument();
        });

        it('should render profile info section', () => {
            const { container } = render(<SkeletonProfileHeader />);
            expect(container.querySelector('.skeleton-profile-info')).toBeInTheDocument();
        });

        it('should render title and subtitle text', () => {
            const { container } = render(<SkeletonProfileHeader />);
            expect(container.querySelector('.skeleton-text-title')).toBeInTheDocument();
            expect(container.querySelector('.skeleton-text-sm')).toBeInTheDocument();
        });

        it('should apply additional className', () => {
            const { container } = render(<SkeletonProfileHeader className="custom" />);
            expect(container.querySelector('.custom')).toBeInTheDocument();
        });
    });
});
