import { useState, useCallback } from 'react';

/**
 * Custom hook for managing modal state
 *
 * @param {boolean} initialState - Initial open/closed state
 * @returns {Object} Modal state and handlers
 */
const useModal = (initialState = false) => {
    const [isOpen, setIsOpen] = useState(initialState);

    const open = useCallback(() => setIsOpen(true), []);
    const close = useCallback(() => setIsOpen(false), []);
    const toggle = useCallback(() => setIsOpen(prev => !prev), []);

    return {
        isOpen,
        open,
        close,
        toggle,
        // Alias for compatibility with show/hide pattern
        show: isOpen,
        onHide: close,
        onShow: open
    };
};

export default useModal;
