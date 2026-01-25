import { renderHook, act } from '@testing-library/react';
import useModal from '../useModal';

describe('useModal', () => {
    describe('initial state', () => {
        it('should default to closed', () => {
            const { result } = renderHook(() => useModal());
            expect(result.current.isOpen).toBe(false);
            expect(result.current.show).toBe(false);
        });

        it('should accept initial state of true', () => {
            const { result } = renderHook(() => useModal(true));
            expect(result.current.isOpen).toBe(true);
            expect(result.current.show).toBe(true);
        });

        it('should accept initial state of false', () => {
            const { result } = renderHook(() => useModal(false));
            expect(result.current.isOpen).toBe(false);
        });
    });

    describe('open function', () => {
        it('should open the modal', () => {
            const { result } = renderHook(() => useModal());

            act(() => {
                result.current.open();
            });

            expect(result.current.isOpen).toBe(true);
            expect(result.current.show).toBe(true);
        });

        it('should remain open if already open', () => {
            const { result } = renderHook(() => useModal(true));

            act(() => {
                result.current.open();
            });

            expect(result.current.isOpen).toBe(true);
        });
    });

    describe('close function', () => {
        it('should close the modal', () => {
            const { result } = renderHook(() => useModal(true));

            act(() => {
                result.current.close();
            });

            expect(result.current.isOpen).toBe(false);
            expect(result.current.show).toBe(false);
        });

        it('should remain closed if already closed', () => {
            const { result } = renderHook(() => useModal(false));

            act(() => {
                result.current.close();
            });

            expect(result.current.isOpen).toBe(false);
        });
    });

    describe('toggle function', () => {
        it('should toggle from closed to open', () => {
            const { result } = renderHook(() => useModal(false));

            act(() => {
                result.current.toggle();
            });

            expect(result.current.isOpen).toBe(true);
        });

        it('should toggle from open to closed', () => {
            const { result } = renderHook(() => useModal(true));

            act(() => {
                result.current.toggle();
            });

            expect(result.current.isOpen).toBe(false);
        });

        it('should toggle multiple times correctly', () => {
            const { result } = renderHook(() => useModal(false));

            act(() => {
                result.current.toggle();
            });
            expect(result.current.isOpen).toBe(true);

            act(() => {
                result.current.toggle();
            });
            expect(result.current.isOpen).toBe(false);

            act(() => {
                result.current.toggle();
            });
            expect(result.current.isOpen).toBe(true);
        });
    });

    describe('alias functions', () => {
        it('should have onShow alias for open', () => {
            const { result } = renderHook(() => useModal());

            act(() => {
                result.current.onShow();
            });

            expect(result.current.isOpen).toBe(true);
        });

        it('should have onHide alias for close', () => {
            const { result } = renderHook(() => useModal(true));

            act(() => {
                result.current.onHide();
            });

            expect(result.current.isOpen).toBe(false);
        });

        it('should have show alias for isOpen', () => {
            const { result } = renderHook(() => useModal());

            expect(result.current.show).toBe(result.current.isOpen);

            act(() => {
                result.current.open();
            });

            expect(result.current.show).toBe(result.current.isOpen);
            expect(result.current.show).toBe(true);
        });
    });

    describe('function stability', () => {
        it('should return stable function references', () => {
            const { result, rerender } = renderHook(() => useModal());

            const firstOpen = result.current.open;
            const firstClose = result.current.close;
            const firstToggle = result.current.toggle;

            rerender();

            expect(result.current.open).toBe(firstOpen);
            expect(result.current.close).toBe(firstClose);
            expect(result.current.toggle).toBe(firstToggle);
        });
    });
});
