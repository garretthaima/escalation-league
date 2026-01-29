import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ActionItemsSection from '../ActionItemsSection';

// Mock child components
jest.mock('../../Pods/Dashboard/ConfirmationCard', () => {
    return function MockConfirmationCard({ pod }) {
        return <div data-testid="confirmation-card">Pod #{pod.id}</div>;
    };
});

jest.mock('../../Pods/Dashboard/GameCard', () => {
    return function MockGameCard({ pod }) {
        return <div data-testid="game-card">Pod #{pod.id}</div>;
    };
});

const renderActionItemsSection = (props = {}) => {
    const defaultProps = {
        pendingPods: [],
        activePods: [],
        userId: 1,
        onConfirm: jest.fn(),
        onDeclareResult: jest.fn()
    };

    return render(
        <BrowserRouter>
            <ActionItemsSection {...defaultProps} {...props} />
        </BrowserRouter>
    );
};

describe('ActionItemsSection', () => {
    describe('when no action items', () => {
        it('should render nothing when no pending or active pods', () => {
            const { container } = renderActionItemsSection({
                pendingPods: [],
                activePods: []
            });
            expect(container.firstChild).toBeNull();
        });

        it('should render nothing when pods are undefined', () => {
            const { container } = renderActionItemsSection({
                pendingPods: undefined,
                activePods: undefined
            });
            expect(container.firstChild).toBeNull();
        });
    });

    describe('with pending pods', () => {
        const mockPendingPods = [
            { id: 1, participants: [] },
            { id: 2, participants: [] }
        ];

        it('should render section header', () => {
            renderActionItemsSection({ pendingPods: mockPendingPods });
            expect(screen.getByText('Action Needed')).toBeInTheDocument();
        });

        it('should render ConfirmationCard for each pending pod', () => {
            renderActionItemsSection({ pendingPods: mockPendingPods });
            const cards = screen.getAllByTestId('confirmation-card');
            expect(cards).toHaveLength(2);
        });

        it('should render All Games link', () => {
            renderActionItemsSection({ pendingPods: mockPendingPods });
            expect(screen.getByRole('link', { name: /all games/i })).toBeInTheDocument();
        });
    });

    describe('with active pods', () => {
        const mockActivePods = [
            { id: 3, participants: [] },
            { id: 4, participants: [] }
        ];

        it('should render section header', () => {
            renderActionItemsSection({ activePods: mockActivePods });
            expect(screen.getByText('Action Needed')).toBeInTheDocument();
        });

        it('should render GameCard for each active pod', () => {
            renderActionItemsSection({ activePods: mockActivePods });
            const cards = screen.getAllByTestId('game-card');
            expect(cards).toHaveLength(2);
        });
    });

    describe('with both pending and active pods', () => {
        const mockPendingPods = [{ id: 1, participants: [] }];
        const mockActivePods = [{ id: 2, participants: [] }];

        it('should render both ConfirmationCard and GameCard', () => {
            renderActionItemsSection({
                pendingPods: mockPendingPods,
                activePods: mockActivePods
            });
            expect(screen.getByTestId('confirmation-card')).toBeInTheDocument();
            expect(screen.getByTestId('game-card')).toBeInTheDocument();
        });

        it('should render pending pods first (more urgent)', () => {
            renderActionItemsSection({
                pendingPods: mockPendingPods,
                activePods: mockActivePods
            });
            const allCards = screen.getAllByTestId(/card/);
            expect(allCards[0]).toHaveTextContent('Pod #1'); // Pending
            expect(allCards[1]).toHaveTextContent('Pod #2'); // Active
        });
    });

    describe('styling', () => {
        it('should have action-items-section class', () => {
            renderActionItemsSection({
                pendingPods: [{ id: 1, participants: [] }]
            });
            expect(document.querySelector('.action-items-section')).toBeInTheDocument();
        });
    });
});
