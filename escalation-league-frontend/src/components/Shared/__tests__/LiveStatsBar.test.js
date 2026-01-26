import React from 'react';
import { render, screen } from '@testing-library/react';
import LiveStatsBar from '../LiveStatsBar';

describe('LiveStatsBar', () => {
    describe('loading state', () => {
        it('should show loading message when loading is true', () => {
            render(<LiveStatsBar loading={true} />);
            expect(screen.getByText('Loading stats...')).toBeInTheDocument();
        });

        it('should show spinner icon when loading', () => {
            const { container } = render(<LiveStatsBar loading={true} />);
            expect(container.querySelector('.fa-spinner')).toBeInTheDocument();
        });
    });

    describe('default values', () => {
        it('should render with default values when no props provided', () => {
            render(<LiveStatsBar />);
            const zeros = screen.getAllByText('0');
            expect(zeros).toHaveLength(3);
        });

        it('should use plural forms for zero values', () => {
            render(<LiveStatsBar />);
            expect(screen.getByText(/active games/)).toBeInTheDocument();
            expect(screen.getByText(/players/)).toBeInTheDocument();
            expect(screen.getByText(/games played/)).toBeInTheDocument();
        });
    });

    describe('with stats data', () => {
        it('should display active games count', () => {
            render(<LiveStatsBar activeGames={5} />);
            expect(screen.getByText('5')).toBeInTheDocument();
            expect(screen.getByText(/active games/)).toBeInTheDocument();
        });

        it('should display total players count', () => {
            render(<LiveStatsBar totalPlayers={12} />);
            expect(screen.getByText('12')).toBeInTheDocument();
            expect(screen.getByText(/players/)).toBeInTheDocument();
        });

        it('should display completed games count', () => {
            render(<LiveStatsBar completedGames={42} />);
            expect(screen.getByText('42')).toBeInTheDocument();
            expect(screen.getByText(/games played/)).toBeInTheDocument();
        });

        it('should display all stats together', () => {
            render(
                <LiveStatsBar
                    activeGames={3}
                    totalPlayers={10}
                    completedGames={25}
                />
            );
            expect(screen.getByText('3')).toBeInTheDocument();
            expect(screen.getByText('10')).toBeInTheDocument();
            expect(screen.getByText('25')).toBeInTheDocument();
        });
    });

    describe('singular/plural forms', () => {
        it('should use singular form for 1 active game', () => {
            render(<LiveStatsBar activeGames={1} />);
            expect(screen.getByText(/active game$/)).toBeInTheDocument();
        });

        it('should use singular form for 1 player', () => {
            const { container } = render(<LiveStatsBar totalPlayers={1} />);
            // Find the specific span for players stat
            const playerSpan = container.querySelector('.live-stats-item:nth-child(3)');
            expect(playerSpan.textContent).toMatch(/1\s*player$/);
        });

        it('should use singular form for 1 game played', () => {
            render(<LiveStatsBar completedGames={1} />);
            expect(screen.getByText(/game played$/)).toBeInTheDocument();
        });
    });

    describe('styling', () => {
        it('should have live-stats-bar class', () => {
            const { container } = render(<LiveStatsBar />);
            expect(container.querySelector('.live-stats-bar')).toBeInTheDocument();
        });

        it('should have live-stats-container class', () => {
            const { container } = render(<LiveStatsBar />);
            expect(container.querySelector('.live-stats-container')).toBeInTheDocument();
        });

        it('should have dividers between stats', () => {
            const { container } = render(<LiveStatsBar />);
            const dividers = container.querySelectorAll('.live-stats-divider');
            expect(dividers).toHaveLength(2);
        });

        it('should have appropriate icons', () => {
            const { container } = render(<LiveStatsBar />);
            expect(container.querySelector('.fa-gamepad')).toBeInTheDocument();
            expect(container.querySelector('.fa-users')).toBeInTheDocument();
            expect(container.querySelector('.fa-trophy')).toBeInTheDocument();
        });
    });
});
