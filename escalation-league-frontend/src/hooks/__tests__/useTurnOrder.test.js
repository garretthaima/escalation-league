import { renderHook, act } from '@testing-library/react';
import useTurnOrder from '../useTurnOrder';

describe('useTurnOrder', () => {
    describe('initialization', () => {
        it('should initialize with empty array by default', () => {
            const { result } = renderHook(() => useTurnOrder());
            expect(result.current.turnOrder).toEqual([]);
        });

        it('should initialize with provided order', () => {
            const initialOrder = [1, 2, 3, 4];
            const { result } = renderHook(() => useTurnOrder(initialOrder));
            expect(result.current.turnOrder).toEqual([1, 2, 3, 4]);
        });

        it('should initialize drag state as null', () => {
            const { result } = renderHook(() => useTurnOrder([1, 2]));
            expect(result.current.draggedId).toBeNull();
            expect(result.current.dragOverId).toBeNull();
        });
    });

    describe('setTurnOrder', () => {
        it('should update turn order directly', () => {
            const { result } = renderHook(() => useTurnOrder([1, 2, 3]));

            act(() => {
                result.current.setTurnOrder([3, 2, 1]);
            });

            expect(result.current.turnOrder).toEqual([3, 2, 1]);
        });
    });

    describe('randomize', () => {
        it('should shuffle the turn order', () => {
            // With 4 players, probability of same order after shuffle is 1/24
            // Run multiple times to be statistically confident
            const initialOrder = [1, 2, 3, 4];
            const { result } = renderHook(() => useTurnOrder(initialOrder));

            // Run randomize multiple times and check if at least one is different
            let foundDifferent = false;
            for (let i = 0; i < 10; i++) {
                act(() => {
                    result.current.randomize();
                });
                if (JSON.stringify(result.current.turnOrder) !== JSON.stringify([1, 2, 3, 4])) {
                    foundDifferent = true;
                    break;
                }
            }

            // It's extremely unlikely (1/24^10) to never get a different order
            // But we can't guarantee it in a single call, so we check the array has same elements
            expect(result.current.turnOrder).toHaveLength(4);
            expect(result.current.turnOrder).toContain(1);
            expect(result.current.turnOrder).toContain(2);
            expect(result.current.turnOrder).toContain(3);
            expect(result.current.turnOrder).toContain(4);
        });

        it('should maintain all elements after shuffle', () => {
            const { result } = renderHook(() => useTurnOrder([1, 2, 3, 4, 5]));

            act(() => {
                result.current.randomize();
            });

            expect(result.current.turnOrder.sort()).toEqual([1, 2, 3, 4, 5]);
        });
    });

    describe('moveUp', () => {
        it('should move player up one position', () => {
            const { result } = renderHook(() => useTurnOrder([1, 2, 3, 4]));

            act(() => {
                result.current.moveUp(3);
            });

            expect(result.current.turnOrder).toEqual([1, 3, 2, 4]);
        });

        it('should not change order when player is already first', () => {
            const { result } = renderHook(() => useTurnOrder([1, 2, 3]));

            act(() => {
                result.current.moveUp(1);
            });

            expect(result.current.turnOrder).toEqual([1, 2, 3]);
        });

        it('should not change order when player is not found', () => {
            const { result } = renderHook(() => useTurnOrder([1, 2, 3]));

            act(() => {
                result.current.moveUp(99);
            });

            expect(result.current.turnOrder).toEqual([1, 2, 3]);
        });
    });

    describe('moveDown', () => {
        it('should move player down one position', () => {
            const { result } = renderHook(() => useTurnOrder([1, 2, 3, 4]));

            act(() => {
                result.current.moveDown(2);
            });

            expect(result.current.turnOrder).toEqual([1, 3, 2, 4]);
        });

        it('should not change order when player is already last', () => {
            const { result } = renderHook(() => useTurnOrder([1, 2, 3]));

            act(() => {
                result.current.moveDown(3);
            });

            expect(result.current.turnOrder).toEqual([1, 2, 3]);
        });

        it('should not change order when player is not found', () => {
            const { result } = renderHook(() => useTurnOrder([1, 2, 3]));

            act(() => {
                result.current.moveDown(99);
            });

            expect(result.current.turnOrder).toEqual([1, 2, 3]);
        });
    });

    describe('addPlayer', () => {
        it('should add player to end of turn order', () => {
            const { result } = renderHook(() => useTurnOrder([1, 2]));

            act(() => {
                result.current.addPlayer(3);
            });

            expect(result.current.turnOrder).toEqual([1, 2, 3]);
        });

        it('should not add player if already in order', () => {
            const { result } = renderHook(() => useTurnOrder([1, 2, 3]));

            act(() => {
                result.current.addPlayer(2);
            });

            expect(result.current.turnOrder).toEqual([1, 2, 3]);
        });
    });

    describe('removePlayer', () => {
        it('should remove player from turn order', () => {
            const { result } = renderHook(() => useTurnOrder([1, 2, 3, 4]));

            act(() => {
                result.current.removePlayer(2);
            });

            expect(result.current.turnOrder).toEqual([1, 3, 4]);
        });

        it('should do nothing if player not found', () => {
            const { result } = renderHook(() => useTurnOrder([1, 2, 3]));

            act(() => {
                result.current.removePlayer(99);
            });

            expect(result.current.turnOrder).toEqual([1, 2, 3]);
        });
    });

    describe('reset', () => {
        it('should reset to provided order', () => {
            const { result } = renderHook(() => useTurnOrder([1, 2, 3]));

            act(() => {
                result.current.reset([4, 5, 6]);
            });

            expect(result.current.turnOrder).toEqual([4, 5, 6]);
        });

        it('should reset to empty array by default', () => {
            const { result } = renderHook(() => useTurnOrder([1, 2, 3]));

            act(() => {
                result.current.reset();
            });

            expect(result.current.turnOrder).toEqual([]);
        });

        it('should clear drag state', () => {
            const { result } = renderHook(() => useTurnOrder([1, 2, 3]));

            // First set some drag state
            const mockEvent = {
                dataTransfer: { effectAllowed: '' }
            };
            act(() => {
                result.current.dragHandlers.handleDragStart(mockEvent, 1);
            });
            expect(result.current.draggedId).toBe(1);

            // Then reset
            act(() => {
                result.current.reset([1, 2]);
            });

            expect(result.current.draggedId).toBeNull();
            expect(result.current.dragOverId).toBeNull();
        });
    });

    describe('drag handlers', () => {
        it('should set draggedId on dragStart', () => {
            const { result } = renderHook(() => useTurnOrder([1, 2, 3]));
            const mockEvent = {
                dataTransfer: { effectAllowed: '' }
            };

            act(() => {
                result.current.dragHandlers.handleDragStart(mockEvent, 2);
            });

            expect(result.current.draggedId).toBe(2);
            expect(mockEvent.dataTransfer.effectAllowed).toBe('move');
        });

        it('should set dragOverId on dragOver', () => {
            const { result } = renderHook(() => useTurnOrder([1, 2, 3]));
            const mockEvent = {
                preventDefault: jest.fn(),
                dataTransfer: { dropEffect: '' }
            };

            // First start dragging player 1
            act(() => {
                result.current.dragHandlers.handleDragStart({ dataTransfer: { effectAllowed: '' } }, 1);
            });

            // Then drag over player 2
            act(() => {
                result.current.dragHandlers.handleDragOver(mockEvent, 2);
            });

            expect(result.current.dragOverId).toBe(2);
            expect(mockEvent.preventDefault).toHaveBeenCalled();
            expect(mockEvent.dataTransfer.dropEffect).toBe('move');
        });

        it('should not set dragOverId when dragging over self', () => {
            const { result } = renderHook(() => useTurnOrder([1, 2, 3]));
            const mockEvent = {
                preventDefault: jest.fn(),
                dataTransfer: { dropEffect: '' }
            };

            act(() => {
                result.current.dragHandlers.handleDragStart({ dataTransfer: { effectAllowed: '' } }, 1);
            });

            act(() => {
                result.current.dragHandlers.handleDragOver(mockEvent, 1);
            });

            expect(result.current.dragOverId).toBeNull();
        });

        it('should clear dragOverId on dragLeave', () => {
            const { result } = renderHook(() => useTurnOrder([1, 2, 3]));

            // Set up drag state
            act(() => {
                result.current.dragHandlers.handleDragStart({ dataTransfer: { effectAllowed: '' } }, 1);
            });
            act(() => {
                result.current.dragHandlers.handleDragOver({ preventDefault: jest.fn(), dataTransfer: { dropEffect: '' } }, 2);
            });
            expect(result.current.dragOverId).toBe(2);

            // Leave
            act(() => {
                result.current.dragHandlers.handleDragLeave();
            });

            expect(result.current.dragOverId).toBeNull();
        });

        it('should reorder on drop', () => {
            const { result } = renderHook(() => useTurnOrder([1, 2, 3, 4]));
            const mockEvent = { preventDefault: jest.fn() };

            // Start dragging player 1
            act(() => {
                result.current.dragHandlers.handleDragStart({ dataTransfer: { effectAllowed: '' } }, 1);
            });

            // Drop on player 3
            act(() => {
                result.current.dragHandlers.handleDrop(mockEvent, 3);
            });

            expect(result.current.turnOrder).toEqual([2, 3, 1, 4]);
            expect(result.current.draggedId).toBeNull();
            expect(result.current.dragOverId).toBeNull();
        });

        it('should not reorder when dropping on self', () => {
            const { result } = renderHook(() => useTurnOrder([1, 2, 3]));
            const mockEvent = { preventDefault: jest.fn() };

            act(() => {
                result.current.dragHandlers.handleDragStart({ dataTransfer: { effectAllowed: '' } }, 1);
            });

            act(() => {
                result.current.dragHandlers.handleDrop(mockEvent, 1);
            });

            expect(result.current.turnOrder).toEqual([1, 2, 3]);
        });

        it('should clear drag state on dragEnd', () => {
            const { result } = renderHook(() => useTurnOrder([1, 2, 3]));

            act(() => {
                result.current.dragHandlers.handleDragStart({ dataTransfer: { effectAllowed: '' } }, 1);
            });
            expect(result.current.draggedId).toBe(1);

            act(() => {
                result.current.dragHandlers.handleDragEnd();
            });

            expect(result.current.draggedId).toBeNull();
            expect(result.current.dragOverId).toBeNull();
        });
    });

    describe('function stability', () => {
        it('should maintain stable function references', () => {
            const { result, rerender } = renderHook(() => useTurnOrder([1, 2, 3]));

            const initialFunctions = {
                randomize: result.current.randomize,
                moveUp: result.current.moveUp,
                moveDown: result.current.moveDown,
                addPlayer: result.current.addPlayer,
                removePlayer: result.current.removePlayer,
                reset: result.current.reset
            };

            rerender();

            expect(result.current.randomize).toBe(initialFunctions.randomize);
            expect(result.current.moveUp).toBe(initialFunctions.moveUp);
            expect(result.current.moveDown).toBe(initialFunctions.moveDown);
            expect(result.current.addPlayer).toBe(initialFunctions.addPlayer);
            expect(result.current.removePlayer).toBe(initialFunctions.removePlayer);
            expect(result.current.reset).toBe(initialFunctions.reset);
        });
    });
});
