import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MetagamePreview from '../MetagamePreview';

// Mock LoadingSpinner
jest.mock('../../../Shared/LoadingSpinner', () => {
    return function MockLoadingSpinner({ text, showText }) {
        return (
            <div data-testid="loading-spinner">
                {showText && <span>{text}</span>}
            </div>
        );
    };
});

// Mock ColorDistributionChart
jest.mock('../../../Metagame/ColorDistributionChart', () => {
    return function MockColorDistributionChart({ colors }) {
        return (
            <div data-testid="color-distribution-chart">
                {Object.entries(colors || {}).map(([color, count]) => (
                    <span key={color}>{color}: {count}</span>
                ))}
            </div>
        );
    };
});

// Wrapper component with Router
const renderWithRouter = (component) => {
    return render(
        <BrowserRouter>
            {component}
        </BrowserRouter>
    );
};

describe('MetagamePreview', () => {
    const mockMetagame = {
        totalDecks: 25,
        totalCards: 1500,
        colorDistribution: [
            { color: 'U', count: 15 },
            { color: 'B', count: 12 },
            { color: 'G', count: 10 },
            { color: 'R', count: 8 },
            { color: 'W', count: 5 }
        ],
        staples: [
            { name: 'Sol Ring', count: 24 },
            { name: 'Arcane Signet', count: 22 },
            { name: 'Command Tower', count: 20 },
            { name: 'Swords to Plowshares', count: 18 },
            { name: 'Cyclonic Rift', count: 15 },
            { name: 'Rhystic Study', count: 12 }
        ]
    };

    const defaultProps = {
        metagame: mockMetagame,
        leagueId: 1,
        loading: false
    };

    describe('loading state', () => {
        it('should render loading spinner when loading is true', () => {
            renderWithRouter(<MetagamePreview {...defaultProps} loading={true} />);
            expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
            expect(screen.getByText('Loading metagame insights...')).toBeInTheDocument();
        });

        it('should not render metagame content when loading', () => {
            renderWithRouter(<MetagamePreview {...defaultProps} loading={true} />);
            expect(screen.queryByTestId('color-distribution-chart')).not.toBeInTheDocument();
        });
    });

    describe('empty state', () => {
        it('should render empty message when metagame is null', () => {
            renderWithRouter(<MetagamePreview {...defaultProps} metagame={null} />);
            expect(screen.getByText('No metagame data available yet.')).toBeInTheDocument();
            expect(screen.getByText('Data will appear once players submit their decklists.')).toBeInTheDocument();
        });

        it('should render empty message when metagame is undefined', () => {
            renderWithRouter(<MetagamePreview {...defaultProps} metagame={undefined} />);
            expect(screen.getByText('No metagame data available yet.')).toBeInTheDocument();
        });

        it('should render chart-pie icon in empty state', () => {
            const { container } = renderWithRouter(<MetagamePreview {...defaultProps} metagame={null} />);
            expect(container.querySelector('.fa-chart-pie')).toBeInTheDocument();
        });
    });

    describe('content rendering', () => {
        it('should render color distribution chart', () => {
            renderWithRouter(<MetagamePreview {...defaultProps} />);
            expect(screen.getByTestId('color-distribution-chart')).toBeInTheDocument();
        });

        it('should pass correct color data to chart', () => {
            renderWithRouter(<MetagamePreview {...defaultProps} />);
            expect(screen.getByText('U: 15')).toBeInTheDocument();
            expect(screen.getByText('B: 12')).toBeInTheDocument();
            expect(screen.getByText('G: 10')).toBeInTheDocument();
            expect(screen.getByText('R: 8')).toBeInTheDocument();
            expect(screen.getByText('W: 5')).toBeInTheDocument();
        });

        it('should handle empty colorDistribution', () => {
            const metagameNoColors = {
                ...mockMetagame,
                colorDistribution: null
            };
            renderWithRouter(<MetagamePreview {...defaultProps} metagame={metagameNoColors} />);
            expect(screen.getByTestId('color-distribution-chart')).toBeInTheDocument();
        });
    });

    describe('quick stats', () => {
        it('should display total decks count', () => {
            renderWithRouter(<MetagamePreview {...defaultProps} />);
            expect(screen.getByText('25')).toBeInTheDocument();
            expect(screen.getByText('Decks Analyzed')).toBeInTheDocument();
        });

        it('should display total cards count', () => {
            renderWithRouter(<MetagamePreview {...defaultProps} />);
            expect(screen.getByText('1500')).toBeInTheDocument();
            expect(screen.getByText('Unique Cards')).toBeInTheDocument();
        });

        it('should show 0 when totalDecks is missing', () => {
            const metagameNoDecks = {
                ...mockMetagame,
                totalDecks: undefined
            };
            renderWithRouter(<MetagamePreview {...defaultProps} metagame={metagameNoDecks} />);
            expect(screen.getByText('0')).toBeInTheDocument();
        });

        it('should show 0 when totalCards is missing', () => {
            const metagameNoCards = {
                ...mockMetagame,
                totalCards: undefined
            };
            renderWithRouter(<MetagamePreview {...defaultProps} metagame={metagameNoCards} />);
            expect(screen.getByText('0')).toBeInTheDocument();
        });

        it('should render Quick Stats heading', () => {
            renderWithRouter(<MetagamePreview {...defaultProps} />);
            expect(screen.getByText('Quick Stats')).toBeInTheDocument();
        });

        it('should render Color Distribution heading', () => {
            renderWithRouter(<MetagamePreview {...defaultProps} />);
            expect(screen.getByText('Color Distribution')).toBeInTheDocument();
        });
    });

    describe('staples section', () => {
        it('should render top staples heading', () => {
            renderWithRouter(<MetagamePreview {...defaultProps} />);
            expect(screen.getByText('Top Staples')).toBeInTheDocument();
        });

        it('should display first 5 staples', () => {
            renderWithRouter(<MetagamePreview {...defaultProps} />);
            expect(screen.getByText('Sol Ring (24)')).toBeInTheDocument();
            expect(screen.getByText('Arcane Signet (22)')).toBeInTheDocument();
            expect(screen.getByText('Command Tower (20)')).toBeInTheDocument();
            expect(screen.getByText('Swords to Plowshares (18)')).toBeInTheDocument();
            expect(screen.getByText('Cyclonic Rift (15)')).toBeInTheDocument();
        });

        it('should not display staples beyond the first 5', () => {
            renderWithRouter(<MetagamePreview {...defaultProps} />);
            expect(screen.queryByText('Rhystic Study (12)')).not.toBeInTheDocument();
        });

        it('should not render staples section when staples is empty', () => {
            const metagameNoStaples = {
                ...mockMetagame,
                staples: []
            };
            renderWithRouter(<MetagamePreview {...defaultProps} metagame={metagameNoStaples} />);
            expect(screen.queryByText('Top Staples')).not.toBeInTheDocument();
        });

        it('should not render staples section when staples is null', () => {
            const metagameNullStaples = {
                ...mockMetagame,
                staples: null
            };
            renderWithRouter(<MetagamePreview {...defaultProps} metagame={metagameNullStaples} />);
            expect(screen.queryByText('Top Staples')).not.toBeInTheDocument();
        });

        it('should render staples as badges', () => {
            const { container } = renderWithRouter(<MetagamePreview {...defaultProps} />);
            const stapleBadges = container.querySelectorAll('.badge.bg-secondary');
            expect(stapleBadges.length).toBe(5);
        });
    });

    describe('full metagame link', () => {
        it('should render link to full metagame analysis', () => {
            renderWithRouter(<MetagamePreview {...defaultProps} />);
            const link = screen.getByRole('link', { name: /View Full Metagame Analysis/i });
            expect(link).toBeInTheDocument();
            expect(link).toHaveAttribute('href', '/leagues/metagame');
        });

        it('should have correct button styling', () => {
            renderWithRouter(<MetagamePreview {...defaultProps} />);
            const link = screen.getByRole('link', { name: /View Full Metagame Analysis/i });
            expect(link).toHaveClass('btn');
            expect(link).toHaveClass('btn-outline-primary');
        });

        it('should have chart icon in button', () => {
            const { container } = renderWithRouter(<MetagamePreview {...defaultProps} />);
            const chartIcon = container.querySelector('.fa-chart-bar');
            expect(chartIcon).toBeInTheDocument();
        });
    });

    describe('layout structure', () => {
        it('should have border-top on link section', () => {
            const { container } = renderWithRouter(<MetagamePreview {...defaultProps} />);
            const linkSection = container.querySelector('.border-top');
            expect(linkSection).toBeInTheDocument();
        });

        it('should have row layout for content', () => {
            const { container } = renderWithRouter(<MetagamePreview {...defaultProps} />);
            const row = container.querySelector('.row');
            expect(row).toBeInTheDocument();
        });
    });

    describe('colorDistribution edge cases', () => {
        it('should handle colorDistribution with only one color', () => {
            const metagameOneColor = {
                ...mockMetagame,
                colorDistribution: [{ color: 'U', count: 25 }]
            };
            renderWithRouter(<MetagamePreview {...defaultProps} metagame={metagameOneColor} />);
            expect(screen.getByText('U: 25')).toBeInTheDocument();
        });

        it('should handle colorDistribution with colorless', () => {
            const metagameWithColorless = {
                ...mockMetagame,
                colorDistribution: [
                    { color: 'C', count: 20 },
                    { color: 'U', count: 15 }
                ]
            };
            renderWithRouter(<MetagamePreview {...defaultProps} metagame={metagameWithColorless} />);
            expect(screen.getByText('C: 20')).toBeInTheDocument();
            expect(screen.getByText('U: 15')).toBeInTheDocument();
        });
    });
});
