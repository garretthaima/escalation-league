import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Pagination, { usePagination } from './Pagination';
import { renderHook, act } from '@testing-library/react';

// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: jest.fn(key => store[key] || null),
        setItem: jest.fn((key, value) => { store[key] = String(value); }),
        clear: jest.fn(() => { store = {}; }),
        removeItem: jest.fn(key => { delete store[key]; })
    };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
});

describe('Pagination', () => {
    const defaultProps = {
        currentPage: 1,
        totalPages: 10,
        totalItems: 100,
        pageSize: 10,
        onPageChange: jest.fn(),
        onPageSizeChange: jest.fn()
    };

    describe('rendering', () => {
        it('should render pagination controls when totalPages > 1', () => {
            const { container } = render(<Pagination {...defaultProps} />);
            expect(container.querySelector('.pagination')).toBeInTheDocument();
        });

        it('should not render when totalPages is 1 and no selectors/counts shown', () => {
            const { container } = render(
                <Pagination
                    {...defaultProps}
                    totalPages={1}
                    showPageSizeSelector={false}
                    showItemCount={false}
                />
            );
            expect(container.firstChild).toBeNull();
        });

        it('should show item count when showItemCount is true', () => {
            render(<Pagination {...defaultProps} />);
            expect(screen.getByText('Showing 1-10 of 100')).toBeInTheDocument();
        });

        it('should not show item count when showItemCount is false', () => {
            render(<Pagination {...defaultProps} showItemCount={false} />);
            expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
        });

        it('should show page size selector by default', () => {
            render(<Pagination {...defaultProps} />);
            expect(screen.getByLabelText('Per page:')).toBeInTheDocument();
        });

        it('should not show page size selector when showPageSizeSelector is false', () => {
            render(<Pagination {...defaultProps} showPageSizeSelector={false} />);
            expect(screen.queryByLabelText('Per page:')).not.toBeInTheDocument();
        });
    });

    describe('item count calculation', () => {
        it('should show correct range for first page', () => {
            render(<Pagination {...defaultProps} currentPage={1} />);
            expect(screen.getByText('Showing 1-10 of 100')).toBeInTheDocument();
        });

        it('should show correct range for middle page', () => {
            render(<Pagination {...defaultProps} currentPage={5} />);
            expect(screen.getByText('Showing 41-50 of 100')).toBeInTheDocument();
        });

        it('should show correct range for last page', () => {
            render(<Pagination {...defaultProps} currentPage={10} />);
            expect(screen.getByText('Showing 91-100 of 100')).toBeInTheDocument();
        });

        it('should handle partial last page correctly', () => {
            render(<Pagination {...defaultProps} totalItems={95} currentPage={10} />);
            expect(screen.getByText('Showing 91-95 of 95')).toBeInTheDocument();
        });

        it('should show 0 when no items', () => {
            render(<Pagination {...defaultProps} totalItems={0} />);
            expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
        });
    });

    describe('navigation buttons', () => {
        it('should disable First and Prev on first page', () => {
            const { container } = render(<Pagination {...defaultProps} currentPage={1} />);
            // Bootstrap Pagination puts disabled class on the li.page-item, not the button
            const pageItems = container.querySelectorAll('.page-item');
            // First two items should be disabled (First and Prev)
            expect(pageItems[0]).toHaveClass('disabled');
            expect(pageItems[1]).toHaveClass('disabled');
        });

        it('should disable Next and Last on last page', () => {
            const { container } = render(<Pagination {...defaultProps} currentPage={10} />);
            const pageItems = container.querySelectorAll('.page-item');
            // Last two items should be disabled (Next and Last)
            expect(pageItems[pageItems.length - 2]).toHaveClass('disabled');
            expect(pageItems[pageItems.length - 1]).toHaveClass('disabled');
        });

        it('should call onPageChange with 1 when First is clicked', () => {
            const onPageChange = jest.fn();
            render(<Pagination {...defaultProps} currentPage={5} onPageChange={onPageChange} />);
            const buttons = screen.getAllByRole('button');
            fireEvent.click(buttons[0]); // First button
            expect(onPageChange).toHaveBeenCalledWith(1);
        });

        it('should call onPageChange with previous page when Prev is clicked', () => {
            const onPageChange = jest.fn();
            render(<Pagination {...defaultProps} currentPage={5} onPageChange={onPageChange} />);
            const buttons = screen.getAllByRole('button');
            fireEvent.click(buttons[1]); // Prev button
            expect(onPageChange).toHaveBeenCalledWith(4);
        });

        it('should call onPageChange with next page when Next is clicked', () => {
            const onPageChange = jest.fn();
            render(<Pagination {...defaultProps} currentPage={5} onPageChange={onPageChange} />);
            const buttons = screen.getAllByRole('button');
            fireEvent.click(buttons[buttons.length - 2]); // Next button
            expect(onPageChange).toHaveBeenCalledWith(6);
        });

        it('should call onPageChange with totalPages when Last is clicked', () => {
            const onPageChange = jest.fn();
            render(<Pagination {...defaultProps} currentPage={5} onPageChange={onPageChange} />);
            const buttons = screen.getAllByRole('button');
            fireEvent.click(buttons[buttons.length - 1]); // Last button
            expect(onPageChange).toHaveBeenCalledWith(10);
        });
    });

    describe('page number display', () => {
        it('should show all pages when totalPages <= 5', () => {
            render(<Pagination {...defaultProps} totalPages={5} />);
            expect(screen.getByText('1')).toBeInTheDocument();
            expect(screen.getByText('2')).toBeInTheDocument();
            expect(screen.getByText('3')).toBeInTheDocument();
            expect(screen.getByText('4')).toBeInTheDocument();
            expect(screen.getByText('5')).toBeInTheDocument();
        });

        it('should highlight current page', () => {
            render(<Pagination {...defaultProps} currentPage={3} totalPages={5} />);
            const page3 = screen.getByText('3').closest('li');
            expect(page3).toHaveClass('active');
        });

        it('should call onPageChange when page number is clicked', () => {
            const onPageChange = jest.fn();
            render(<Pagination {...defaultProps} totalPages={5} onPageChange={onPageChange} />);
            fireEvent.click(screen.getByText('3'));
            expect(onPageChange).toHaveBeenCalledWith(3);
        });
    });

    describe('page size selector', () => {
        it('should show default page size options', () => {
            render(<Pagination {...defaultProps} />);
            const select = screen.getByRole('combobox');
            expect(select).toHaveValue('10');
        });

        it('should call onPageSizeChange when option is selected', () => {
            const onPageSizeChange = jest.fn();
            render(<Pagination {...defaultProps} onPageSizeChange={onPageSizeChange} />);
            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: '25' } });
            expect(onPageSizeChange).toHaveBeenCalledWith(25);
        });

        it('should store page size preference in localStorage', () => {
            render(<Pagination {...defaultProps} />);
            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: '50' } });
            expect(localStorageMock.setItem).toHaveBeenCalledWith('preferredPageSize', 50);
        });

        it('should display custom page size options', () => {
            render(<Pagination {...defaultProps} pageSizeOptions={[5, 15, 30]} pageSize={5} />);
            const options = screen.getAllByRole('option');
            expect(options).toHaveLength(3);
            expect(options[0]).toHaveValue('5');
            expect(options[1]).toHaveValue('15');
            expect(options[2]).toHaveValue('30');
        });
    });

    describe('className prop', () => {
        it('should apply custom className', () => {
            const { container } = render(<Pagination {...defaultProps} className="custom-pagination" />);
            expect(container.firstChild).toHaveClass('custom-pagination');
        });
    });
});

describe('usePagination hook', () => {
    beforeEach(() => {
        localStorageMock.clear();
    });

    describe('initial state', () => {
        it('should have default values', () => {
            const { result } = renderHook(() => usePagination());
            expect(result.current.page).toBe(1);
            expect(result.current.pageSize).toBe(25);
            expect(result.current.totalItems).toBe(0);
            expect(result.current.totalPages).toBe(1);
        });

        it('should use provided initial page size', () => {
            const { result } = renderHook(() => usePagination(50));
            expect(result.current.pageSize).toBe(50);
        });

        it('should read page size from localStorage', () => {
            localStorageMock.getItem.mockReturnValue('100');
            const { result } = renderHook(() => usePagination());
            expect(result.current.pageSize).toBe(100);
        });
    });

    describe('handlePageChange', () => {
        it('should update page', () => {
            const { result } = renderHook(() => usePagination());

            act(() => {
                result.current.handlePageChange(5);
            });

            expect(result.current.page).toBe(5);
        });
    });

    describe('handlePageSizeChange', () => {
        it('should update page size', () => {
            const { result } = renderHook(() => usePagination());

            act(() => {
                result.current.handlePageSizeChange(50);
            });

            expect(result.current.pageSize).toBe(50);
        });

        it('should reset to page 1 when page size changes', () => {
            const { result } = renderHook(() => usePagination());

            act(() => {
                result.current.handlePageChange(5);
            });
            expect(result.current.page).toBe(5);

            act(() => {
                result.current.handlePageSizeChange(50);
            });

            expect(result.current.page).toBe(1);
        });
    });

    describe('setTotalItems', () => {
        it('should update total items and calculate total pages', () => {
            const { result } = renderHook(() => usePagination(10));

            act(() => {
                result.current.setTotalItems(100);
            });

            expect(result.current.totalItems).toBe(100);
            expect(result.current.totalPages).toBe(10);
        });

        it('should calculate correct total pages with remainder', () => {
            const { result } = renderHook(() => usePagination(10));

            act(() => {
                result.current.setTotalItems(95);
            });

            expect(result.current.totalPages).toBe(10);
        });
    });

    describe('reset', () => {
        it('should reset to page 1', () => {
            const { result } = renderHook(() => usePagination());

            act(() => {
                result.current.handlePageChange(5);
            });
            expect(result.current.page).toBe(5);

            act(() => {
                result.current.reset();
            });

            expect(result.current.page).toBe(1);
        });
    });

    describe('paginationProps', () => {
        it('should return props object for Pagination component', () => {
            const { result } = renderHook(() => usePagination(25));

            act(() => {
                result.current.setTotalItems(100);
            });

            const props = result.current.paginationProps;
            expect(props.currentPage).toBe(1);
            expect(props.totalPages).toBe(4);
            expect(props.totalItems).toBe(100);
            expect(props.pageSize).toBe(25);
            expect(typeof props.onPageChange).toBe('function');
            expect(typeof props.onPageSizeChange).toBe('function');
        });
    });
});
