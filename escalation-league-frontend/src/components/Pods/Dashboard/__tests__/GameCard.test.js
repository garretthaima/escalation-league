import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import GameCard from '../GameCard';

describe('GameCard', () => {
    const createMockPod = (overrides = {}) => ({
        id: 1,
        participants: [
            { player_id: 1, firstname: 'Alice', lastname: 'Smith', turn_order: 1 },
            { player_id: 2, firstname: 'Bob', lastname: 'Jones', turn_order: 2 },
            { player_id: 3, firstname: 'Carol', lastname: 'Williams', turn_order: 3 },
            { player_id: 4, firstname: 'David', lastname: 'Brown', turn_order: 4 }
        ],
        ...overrides
    });

    const defaultProps = {
        pod: createMockPod(),
        userId: 1,
        onDeclareResult: jest.fn(),
        showActions: true
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('rendering', () => {
        it('should render card element', () => {
            const { container } = render(<GameCard {...defaultProps} />);
            expect(container.querySelector('.card')).toBeInTheDocument();
        });

        it('should render pod id in title', () => {
            render(<GameCard {...defaultProps} />);
            expect(screen.getByText(/Pod #1/)).toBeInTheDocument();
        });

        it('should render all participants', () => {
            render(<GameCard {...defaultProps} />);
            expect(screen.getByText('Alice')).toBeInTheDocument();
            expect(screen.getByText('Bob')).toBeInTheDocument();
            expect(screen.getByText('Carol')).toBeInTheDocument();
            expect(screen.getByText('David')).toBeInTheDocument();
        });

        it('should render pod grid', () => {
            const { container } = render(<GameCard {...defaultProps} />);
            expect(container.querySelector('.pod-grid')).toBeInTheDocument();
        });
    });

    describe('empty slots', () => {
        it('should render empty slots when less than 4 participants', () => {
            const pod = createMockPod({
                participants: [
                    { player_id: 1, firstname: 'Alice', lastname: 'Smith', turn_order: 1 },
                    { player_id: 2, firstname: 'Bob', lastname: 'Jones', turn_order: 2 }
                ]
            });
            const { container } = render(<GameCard {...defaultProps} pod={pod} />);
            const emptySlots = container.querySelectorAll('.pod-slot-empty');
            expect(emptySlots).toHaveLength(2);
        });

        it('should handle empty participants array', () => {
            const pod = createMockPod({ participants: [] });
            const { container } = render(<GameCard {...defaultProps} pod={pod} />);
            const emptySlots = container.querySelectorAll('.pod-slot-empty');
            expect(emptySlots).toHaveLength(4);
        });

        it('should handle undefined participants', () => {
            const pod = createMockPod({ participants: undefined });
            const { container } = render(<GameCard {...defaultProps} pod={pod} />);
            const emptySlots = container.querySelectorAll('.pod-slot-empty');
            expect(emptySlots).toHaveLength(4);
        });
    });

    describe('current user highlighting', () => {
        it('should highlight current user slot', () => {
            const { container } = render(<GameCard {...defaultProps} />);
            const currentUserSlot = container.querySelector('.pod-slot-current-user');
            expect(currentUserSlot).toBeInTheDocument();
        });

        it('should not highlight when userId is not a participant', () => {
            const { container } = render(<GameCard {...defaultProps} userId={99} />);
            const currentUserSlot = container.querySelector('.pod-slot-current-user');
            expect(currentUserSlot).not.toBeInTheDocument();
        });
    });

    describe('declare button', () => {
        it('should show declare button when user is participant', () => {
            render(<GameCard {...defaultProps} />);
            expect(screen.getByRole('button', { name: /declare/i })).toBeInTheDocument();
        });

        it('should not show declare button when user is not participant', () => {
            render(<GameCard {...defaultProps} userId={99} />);
            expect(screen.queryByRole('button', { name: /declare/i })).not.toBeInTheDocument();
        });

        it('should not show declare button when showActions is false', () => {
            render(<GameCard {...defaultProps} showActions={false} />);
            expect(screen.queryByRole('button', { name: /declare/i })).not.toBeInTheDocument();
        });

        it('should not show declare button when onDeclareResult is not provided', () => {
            render(<GameCard {...defaultProps} onDeclareResult={undefined} />);
            expect(screen.queryByRole('button', { name: /declare/i })).not.toBeInTheDocument();
        });

        it('should call onDeclareResult with pod id when clicked', () => {
            render(<GameCard {...defaultProps} />);
            const button = screen.getByRole('button', { name: /declare/i });
            fireEvent.click(button);
            expect(defaultProps.onDeclareResult).toHaveBeenCalledWith(1);
        });
    });

    describe('turn order', () => {
        it('should show turn order badges', () => {
            const { container } = render(<GameCard {...defaultProps} />);
            const badges = container.querySelectorAll('.pod-turn-badge');
            expect(badges.length).toBeGreaterThan(0);
        });

        it('should highlight first turn player', () => {
            const { container } = render(<GameCard {...defaultProps} />);
            const firstBadge = container.querySelector('.pod-turn-badge-first');
            expect(firstBadge).toBeInTheDocument();
        });

        it('should sort participants by turn order', () => {
            const pod = createMockPod({
                participants: [
                    { player_id: 4, firstname: 'David', lastname: 'Brown', turn_order: 4 },
                    { player_id: 1, firstname: 'Alice', lastname: 'Smith', turn_order: 1 },
                    { player_id: 2, firstname: 'Bob', lastname: 'Jones', turn_order: 2 },
                    { player_id: 3, firstname: 'Carol', lastname: 'Williams', turn_order: 3 }
                ]
            });
            render(<GameCard {...defaultProps} pod={pod} />);

            // First turn player should be Alice (turn_order: 1)
            const slots = screen.getAllByTitle(/Alice|Bob|Carol|David/);
            expect(slots[0]).toHaveAttribute('title', 'Alice Smith');
        });
    });

    describe('participant display', () => {
        it('should show participant firstname', () => {
            render(<GameCard {...defaultProps} />);
            expect(screen.getByText('Alice')).toBeInTheDocument();
        });

        it('should have full name as title attribute', () => {
            render(<GameCard {...defaultProps} />);
            const aliceSlot = screen.getByTitle('Alice Smith');
            expect(aliceSlot).toBeInTheDocument();
        });
    });

    describe('userId matching', () => {
        it('should match string userId to number player_id', () => {
            const { container } = render(<GameCard {...defaultProps} userId="1" />);
            const currentUserSlot = container.querySelector('.pod-slot-current-user');
            expect(currentUserSlot).toBeInTheDocument();
        });

        it('should match number userId to string player_id', () => {
            const pod = createMockPod({
                participants: [
                    { player_id: '1', firstname: 'Alice', lastname: 'Smith', turn_order: 1 }
                ]
            });
            const { container } = render(<GameCard {...defaultProps} pod={pod} userId={1} />);
            const currentUserSlot = container.querySelector('.pod-slot-current-user');
            expect(currentUserSlot).toBeInTheDocument();
        });
    });
});
