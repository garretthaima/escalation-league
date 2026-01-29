import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import FilterBar, { useFilters } from '../FilterBar';

// Mock searchParams
const mockSetSearchParams = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('../../../__mocks__/react-router-dom'),
    useSearchParams: () => [mockSearchParams, mockSetSearchParams]
}));

describe('FilterBar', () => {
    const defaultFilters = [
        { key: 'name', label: 'Name', type: 'text', placeholder: 'Search name...' },
        { key: 'status', label: 'Status', type: 'select', options: [
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' }
        ]},
        { key: 'date', label: 'Date', type: 'date' },
        { key: 'count', label: 'Count', type: 'number', min: 0, max: 100 },
        { key: 'enabled', label: 'Enabled', type: 'checkbox' }
    ];

    const defaultProps = {
        filters: defaultFilters,
        values: {},
        onChange: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockSearchParams = new URLSearchParams();
    });

    describe('rendering', () => {
        it('should render filter bar container', () => {
            const { container } = render(<FilterBar {...defaultProps} />);
            expect(container.querySelector('.filter-bar')).toBeInTheDocument();
        });

        it('should render Filters button when collapsible', () => {
            render(<FilterBar {...defaultProps} />);
            expect(screen.getByRole('button', { name: /filters/i })).toBeInTheDocument();
        });

        it('should not render Filters button when not collapsible', () => {
            render(<FilterBar {...defaultProps} collapsible={false} />);
            expect(screen.queryByRole('button', { name: /filters/i })).not.toBeInTheDocument();
        });

        it('should apply custom className', () => {
            const { container } = render(<FilterBar {...defaultProps} className="custom-filter" />);
            expect(container.querySelector('.custom-filter')).toBeInTheDocument();
        });
    });

    describe('collapsible behavior', () => {
        it('should be collapsed by default', () => {
            render(<FilterBar {...defaultProps} />);
            const button = screen.getByRole('button', { name: /filters/i });
            expect(button).toHaveAttribute('aria-expanded', 'false');
        });

        it('should be expanded when defaultExpanded is true', () => {
            render(<FilterBar {...defaultProps} defaultExpanded={true} />);
            const button = screen.getByRole('button', { name: /filters/i });
            expect(button).toHaveAttribute('aria-expanded', 'true');
        });

        it('should toggle expanded state on button click', () => {
            render(<FilterBar {...defaultProps} />);
            const button = screen.getByRole('button', { name: /filters/i });

            expect(button).toHaveAttribute('aria-expanded', 'false');
            fireEvent.click(button);
            expect(button).toHaveAttribute('aria-expanded', 'true');
            fireEvent.click(button);
            expect(button).toHaveAttribute('aria-expanded', 'false');
        });
    });

    describe('text filter', () => {
        it('should render text input', () => {
            render(<FilterBar {...defaultProps} defaultExpanded={true} />);
            expect(screen.getByPlaceholderText('Search name...')).toBeInTheDocument();
        });

        it('should call onChange when text changes', () => {
            const onChange = jest.fn();
            render(<FilterBar {...defaultProps} onChange={onChange} defaultExpanded={true} />);

            const input = screen.getByPlaceholderText('Search name...');
            fireEvent.change(input, { target: { value: 'test' } });

            expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ name: 'test' }));
        });
    });

    describe('select filter', () => {
        it('should render select with options', () => {
            render(<FilterBar {...defaultProps} defaultExpanded={true} />);
            const select = screen.getByRole('combobox');
            expect(select).toBeInTheDocument();
            expect(screen.getByText('All Status')).toBeInTheDocument();
            expect(screen.getByText('Active')).toBeInTheDocument();
            expect(screen.getByText('Inactive')).toBeInTheDocument();
        });

        it('should call onChange when selection changes', () => {
            const onChange = jest.fn();
            render(<FilterBar {...defaultProps} onChange={onChange} defaultExpanded={true} />);

            const select = screen.getByRole('combobox');
            fireEvent.change(select, { target: { value: 'active' } });

            expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ status: 'active' }));
        });
    });

    describe('date filter', () => {
        it('should render date input', () => {
            const { container } = render(<FilterBar {...defaultProps} defaultExpanded={true} />);
            expect(container.querySelector('input[type="date"]')).toBeInTheDocument();
        });

        it('should call onChange when date changes', () => {
            const onChange = jest.fn();
            const { container } = render(<FilterBar {...defaultProps} onChange={onChange} defaultExpanded={true} />);

            const dateInput = container.querySelector('input[type="date"]');
            fireEvent.change(dateInput, { target: { value: '2024-01-15' } });

            expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ date: '2024-01-15' }));
        });
    });

    describe('number filter', () => {
        it('should render number input', () => {
            render(<FilterBar {...defaultProps} defaultExpanded={true} />);
            expect(screen.getByPlaceholderText('Count')).toBeInTheDocument();
        });

        it('should call onChange when number changes', () => {
            const onChange = jest.fn();
            render(<FilterBar {...defaultProps} onChange={onChange} defaultExpanded={true} />);

            const input = screen.getByPlaceholderText('Count');
            fireEvent.change(input, { target: { value: '42' } });

            expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ count: '42' }));
        });
    });

    describe('checkbox filter', () => {
        it('should render checkbox', () => {
            const { container } = render(<FilterBar {...defaultProps} defaultExpanded={true} />);
            expect(container.querySelector('input[type="checkbox"]')).toBeInTheDocument();
        });

        it('should call onChange when checkbox changes', () => {
            const onChange = jest.fn();
            const { container } = render(<FilterBar {...defaultProps} onChange={onChange} defaultExpanded={true} />);

            const checkbox = container.querySelector('input[type="checkbox"]');
            fireEvent.click(checkbox);

            expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }));
        });
    });

    describe('Clear All button', () => {
        it('should render Clear All button', () => {
            render(<FilterBar {...defaultProps} defaultExpanded={true} />);
            expect(screen.getByRole('button', { name: 'Clear All' })).toBeInTheDocument();
        });

        it('should be disabled when no filters active', () => {
            render(<FilterBar {...defaultProps} defaultExpanded={true} />);
            expect(screen.getByRole('button', { name: 'Clear All' })).toBeDisabled();
        });

        it('should be enabled when filters are active', () => {
            render(<FilterBar {...defaultProps} values={{ name: 'test' }} defaultExpanded={true} />);
            expect(screen.getByRole('button', { name: 'Clear All' })).not.toBeDisabled();
        });

        it('should clear all filters when clicked', () => {
            const onChange = jest.fn();
            render(<FilterBar {...defaultProps} values={{ name: 'test' }} onChange={onChange} defaultExpanded={true} />);

            const clearButton = screen.getByRole('button', { name: 'Clear All' });
            fireEvent.click(clearButton);

            expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
                name: '',
                status: '',
                date: '',
                count: '',
                enabled: ''
            }));
        });
    });

    describe('active filter count badge', () => {
        it('should not show badge when no filters active', () => {
            render(<FilterBar {...defaultProps} />);
            const button = screen.getByRole('button', { name: /filters/i });
            expect(button.querySelector('.badge')).not.toBeInTheDocument();
        });

        it('should show badge with count when filters active', () => {
            render(<FilterBar {...defaultProps} values={{ name: 'test', status: 'active' }} />);
            const badge = screen.getByText('2');
            expect(badge).toHaveClass('badge');
        });
    });
});

describe('useFilters hook', () => {
    describe('initial state', () => {
        it('should initialize with empty object by default', () => {
            const { result } = renderHook(() => useFilters());
            expect(result.current.filters).toEqual({});
        });

        it('should initialize with provided initial values', () => {
            const initialFilters = { name: 'test', status: 'active' };
            const { result } = renderHook(() => useFilters(initialFilters));
            expect(result.current.filters).toEqual(initialFilters);
        });
    });

    describe('updateFilter', () => {
        it('should update a single filter', () => {
            const { result } = renderHook(() => useFilters({ name: '', status: '' }));

            act(() => {
                result.current.updateFilter('name', 'test');
            });

            expect(result.current.filters.name).toBe('test');
            expect(result.current.filters.status).toBe('');
        });
    });

    describe('updateFilters', () => {
        it('should replace all filters', () => {
            const { result } = renderHook(() => useFilters({ name: 'old', status: 'old' }));

            act(() => {
                result.current.updateFilters({ name: 'new', status: 'new' });
            });

            expect(result.current.filters).toEqual({ name: 'new', status: 'new' });
        });
    });

    describe('clearFilters', () => {
        it('should clear all filters to empty strings', () => {
            const { result } = renderHook(() => useFilters({ name: 'test', status: 'active' }));

            act(() => {
                result.current.clearFilters();
            });

            expect(result.current.filters).toEqual({ name: '', status: '' });
        });
    });

    describe('hasActiveFilters', () => {
        it('should return false when no filters active', () => {
            const { result } = renderHook(() => useFilters({ name: '', status: '' }));
            expect(result.current.hasActiveFilters).toBe(false);
        });

        it('should return true when at least one filter is active', () => {
            const { result } = renderHook(() => useFilters({ name: 'test', status: '' }));
            expect(result.current.hasActiveFilters).toBe(true);
        });
    });
});
