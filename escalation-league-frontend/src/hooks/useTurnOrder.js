import { useState, useCallback } from 'react';

/**
 * Custom hook for managing turn order in games
 * Provides randomization, reordering, and drag-and-drop functionality
 *
 * @param {Array} initialOrder - Initial array of player IDs
 * @returns {Object} Turn order state and handlers
 */
const useTurnOrder = (initialOrder = []) => {
    const [turnOrder, setTurnOrder] = useState(initialOrder);
    const [draggedId, setDraggedId] = useState(null);
    const [dragOverId, setDragOverId] = useState(null);

    // Randomize turn order using Fisher-Yates shuffle
    const randomize = useCallback(() => {
        setTurnOrder(prev => {
            const shuffled = [...prev];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
        });
    }, []);

    // Move player up in turn order
    const moveUp = useCallback((playerId) => {
        setTurnOrder(prev => {
            const order = [...prev];
            const index = order.indexOf(playerId);
            if (index <= 0) return prev;
            [order[index], order[index - 1]] = [order[index - 1], order[index]];
            return order;
        });
    }, []);

    // Move player down in turn order
    const moveDown = useCallback((playerId) => {
        setTurnOrder(prev => {
            const order = [...prev];
            const index = order.indexOf(playerId);
            if (index === -1 || index >= order.length - 1) return prev;
            [order[index], order[index + 1]] = [order[index + 1], order[index]];
            return order;
        });
    }, []);

    // Add a player to the turn order
    const addPlayer = useCallback((playerId) => {
        setTurnOrder(prev => {
            if (prev.includes(playerId)) return prev;
            return [...prev, playerId];
        });
    }, []);

    // Remove a player from the turn order
    const removePlayer = useCallback((playerId) => {
        setTurnOrder(prev => prev.filter(id => id !== playerId));
    }, []);

    // Drag and drop handlers
    const handleDragStart = useCallback((e, playerId) => {
        setDraggedId(playerId);
        e.dataTransfer.effectAllowed = 'move';
    }, []);

    const handleDragOver = useCallback((e, playerId) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (playerId !== draggedId) {
            setDragOverId(playerId);
        }
    }, [draggedId]);

    const handleDragLeave = useCallback(() => {
        setDragOverId(null);
    }, []);

    const handleDrop = useCallback((e, targetId) => {
        e.preventDefault();
        if (draggedId && draggedId !== targetId) {
            setTurnOrder(prev => {
                const order = [...prev];
                const draggedIndex = order.indexOf(draggedId);
                const targetIndex = order.indexOf(targetId);
                if (draggedIndex !== -1 && targetIndex !== -1) {
                    order.splice(draggedIndex, 1);
                    order.splice(targetIndex, 0, draggedId);
                }
                return order;
            });
        }
        setDraggedId(null);
        setDragOverId(null);
    }, [draggedId]);

    const handleDragEnd = useCallback(() => {
        setDraggedId(null);
        setDragOverId(null);
    }, []);

    // Reset turn order
    const reset = useCallback((newOrder = []) => {
        setTurnOrder(newOrder);
        setDraggedId(null);
        setDragOverId(null);
    }, []);

    return {
        turnOrder,
        setTurnOrder,
        randomize,
        moveUp,
        moveDown,
        addPlayer,
        removePlayer,
        reset,
        // Drag state
        draggedId,
        dragOverId,
        // Drag handlers
        dragHandlers: {
            handleDragStart,
            handleDragOver,
            handleDragLeave,
            handleDrop,
            handleDragEnd
        }
    };
};

export default useTurnOrder;
