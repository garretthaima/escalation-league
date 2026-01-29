import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmationCard from '../ConfirmationCard';

describe('ConfirmationCard', () => {
    const createMockPod = (overrides = {}) => ({
        id: 42,
        participants: [
            { player_id: 1, firstname: 'Alice', lastname: 'Smith', turn_order: 1, result: 'win', confirmed: 1, confirmation_time: '2024-01-01T10:00:00Z' },
            { player_id: 2, firstname: 'Bob', lastname: 'Jones', turn_order: 2, result: 'loss', confirmed: 1, confirmation_time: '2024-01-01T10:01:00Z' },
            { player_id: 3, firstname: 'Carol', lastname: 'Williams', turn_order: 3, result: 'loss', confirmed: 0, confirmation_time: null },
            { player_id: 4, firstname: 'David', lastname: 'Brown', turn_order: 4, result: 'loss', confirmed: 0, confirmation_time: null }
        ],
        ...overrides
    });

    const defaultProps = {
        pod: createMockPod(),
        userId: 3,
        onConfirm: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('rendering', () => {
        it('should render card element', () => {
            const { container } = render(<ConfirmationCard {...defaultProps} />);
            expect(container.querySelector('.card')).toBeInTheDocument();
        });

        it('should render pod id', () => {
            render(<ConfirmationCard {...defaultProps} />);
            expect(screen.getByText(/Pod #42/)).toBeInTheDocument();
        });

        it('should render confirmation counter', () => {
            render(<ConfirmationCard {...defaultProps} />);
            expect(screen.getByText('2/4')).toBeInTheDocument();
        });

        it('should render all participants', () => {
            render(<ConfirmationCard {...defaultProps} />);
            expect(screen.getByText('Alice')).toBeInTheDocument();
            expect(screen.getByText('Bob')).toBeInTheDocument();
            expect(screen.getByText('Carol')).toBeInTheDocument();
            expect(screen.getByText('David')).toBeInTheDocument();
        });
    });

    describe('winner declaration', () => {
        it('should show WIN badge when winner exists', () => {
            render(<ConfirmationCard {...defaultProps} />);
            expect(screen.getByText('WIN')).toBeInTheDocument();
        });

        it('should show declarer name', () => {
            render(<ConfirmationCard {...defaultProps} />);
            expect(screen.getByText(/Alice declared/)).toBeInTheDocument();
        });

        it('should show trophy icon for winner', () => {
            const { container } = render(<ConfirmationCard {...defaultProps} />);
            const trophies = container.querySelectorAll('.fa-trophy');
            expect(trophies.length).toBeGreaterThan(0);
        });
    });

    describe('draw scenario', () => {
        it('should show DRAW badge when no winner', () => {
            const pod = createMockPod({
                participants: [
                    { player_id: 1, firstname: 'Alice', lastname: 'Smith', turn_order: 1, result: 'draw', confirmed: 1, confirmation_time: '2024-01-01T10:00:00Z' },
                    { player_id: 2, firstname: 'Bob', lastname: 'Jones', turn_order: 2, result: 'draw', confirmed: 1, confirmation_time: '2024-01-01T10:01:00Z' },
                    { player_id: 3, firstname: 'Carol', lastname: 'Williams', turn_order: 3, result: 'draw', confirmed: 0, confirmation_time: null },
                    { player_id: 4, firstname: 'David', lastname: 'Brown', turn_order: 4, result: 'draw', confirmed: 0, confirmation_time: null }
                ]
            });
            render(<ConfirmationCard {...defaultProps} pod={pod} />);
            expect(screen.getByText('DRAW')).toBeInTheDocument();
        });
    });

    describe('confirmation status icons', () => {
        it('should show check icon for confirmed participants', () => {
            const { container } = render(<ConfirmationCard {...defaultProps} />);
            const confirmedIcons = container.querySelectorAll('.fa-check');
            expect(confirmedIcons.length).toBe(2); // Alice and Bob are confirmed
        });

        it('should show clock icon for unconfirmed participants', () => {
            const { container } = render(<ConfirmationCard {...defaultProps} />);
            const pendingIcons = container.querySelectorAll('.fa-clock');
            // At least 2 clock icons for pending participants
            expect(pendingIcons.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('confirm button', () => {
        it('should show confirm button when user needs to confirm', () => {
            render(<ConfirmationCard {...defaultProps} userId={3} />);
            expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
        });

        it('should not show confirm button when user already confirmed', () => {
            render(<ConfirmationCard {...defaultProps} userId={1} />);
            expect(screen.queryByRole('button', { name: /confirm/i })).not.toBeInTheDocument();
        });

        it('should not show confirm button when user is not participant', () => {
            render(<ConfirmationCard {...defaultProps} userId={99} />);
            expect(screen.queryByRole('button', { name: /confirm/i })).not.toBeInTheDocument();
        });

        it('should call onConfirm with pod id when clicked', () => {
            render(<ConfirmationCard {...defaultProps} userId={3} />);
            const button = screen.getByRole('button', { name: /confirm/i });
            fireEvent.click(button);
            expect(defaultProps.onConfirm).toHaveBeenCalledWith(42);
        });
    });

    describe('current user highlighting', () => {
        it('should highlight current user slot', () => {
            const { container } = render(<ConfirmationCard {...defaultProps} userId={3} />);
            const currentUserSlot = container.querySelector('.confirmation-card-slot-current-user');
            expect(currentUserSlot).toBeInTheDocument();
        });

        it('should highlight current user name', () => {
            const { container } = render(<ConfirmationCard {...defaultProps} userId={1} />);
            const currentUserName = container.querySelector('.confirmation-card-name-current-user');
            expect(currentUserName).toBeInTheDocument();
        });
    });

    describe('empty slots', () => {
        it('should render empty slots when less than 4 participants', () => {
            const pod = createMockPod({
                participants: [
                    { player_id: 1, firstname: 'Alice', lastname: 'Smith', turn_order: 1, result: 'win', confirmed: 1 }
                ]
            });
            const { container } = render(<ConfirmationCard {...defaultProps} pod={pod} />);
            const emptySlots = container.querySelectorAll('.confirmation-card-slot-empty');
            expect(emptySlots).toHaveLength(3);
        });
    });

    describe('edge cases', () => {
        it('should handle undefined participants', () => {
            const pod = createMockPod({ participants: undefined });
            const { container } = render(<ConfirmationCard {...defaultProps} pod={pod} />);
            expect(container.querySelector('.card')).toBeInTheDocument();
        });

        it('should show pending when no declarer', () => {
            const pod = createMockPod({
                participants: [
                    { player_id: 1, firstname: 'Alice', lastname: 'Smith', turn_order: 1, result: null, confirmed: 0 },
                    { player_id: 2, firstname: 'Bob', lastname: 'Jones', turn_order: 2, result: null, confirmed: 0 }
                ]
            });
            render(<ConfirmationCard {...defaultProps} pod={pod} />);
            expect(screen.getByText('Pending...')).toBeInTheDocument();
        });
    });
});
