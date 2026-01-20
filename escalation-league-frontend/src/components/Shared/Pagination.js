import React from 'react';
import { Pagination as BSPagination } from 'react-bootstrap';

/**
 * Reusable Pagination component
 * @param {number} currentPage - Current active page (1-indexed)
 * @param {number} totalPages - Total number of pages
 * @param {number} totalItems - Total number of items
 * @param {number} pageSize - Items per page
 * @param {function} onPageChange - Callback when page changes
 * @param {function} onPageSizeChange - Callback when page size changes
 * @param {number[]} pageSizeOptions - Available page size options
 * @param {boolean} showPageSizeSelector - Whether to show page size dropdown
 * @param {boolean} showItemCount - Whether to show "Showing X-Y of Z" text
 */
const Pagination = ({
    currentPage = 1,
    totalPages = 1,
    totalItems = 0,
    pageSize = 25,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [10, 25, 50, 100],
    showPageSizeSelector = true,
    showItemCount = true,
    className = ''
}) => {
    // Calculate showing range
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);

    // Generate page numbers to show
    const getPageNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5;

        if (totalPages <= maxVisiblePages) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Always show first page
            pages.push(1);

            // Calculate middle pages
            let start = Math.max(2, currentPage - 1);
            let end = Math.min(totalPages - 1, currentPage + 1);

            // Adjust if at the beginning
            if (currentPage <= 3) {
                end = 4;
            }
            // Adjust if at the end
            if (currentPage >= totalPages - 2) {
                start = totalPages - 3;
            }

            // Add ellipsis if needed before middle pages
            if (start > 2) {
                pages.push('...');
            }

            // Add middle pages
            for (let i = start; i <= end; i++) {
                pages.push(i);
            }

            // Add ellipsis if needed after middle pages
            if (end < totalPages - 1) {
                pages.push('...');
            }

            // Always show last page
            pages.push(totalPages);
        }

        return pages;
    };

    const handlePageSizeChange = (e) => {
        const newSize = parseInt(e.target.value, 10);
        // Store preference in localStorage
        localStorage.setItem('preferredPageSize', newSize);
        if (onPageSizeChange) {
            onPageSizeChange(newSize);
        }
    };

    if (totalPages <= 1 && !showPageSizeSelector && !showItemCount) {
        return null;
    }

    return (
        <div className={`d-flex flex-wrap justify-content-between align-items-center gap-3 ${className}`}>
            {/* Item count */}
            {showItemCount && totalItems > 0 && (
                <div className="text-muted small">
                    Showing {startItem}-{endItem} of {totalItems}
                </div>
            )}

            {/* Pagination controls */}
            {totalPages > 1 && (
                <BSPagination className="mb-0">
                    <BSPagination.First
                        onClick={() => onPageChange(1)}
                        disabled={currentPage === 1}
                    />
                    <BSPagination.Prev
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                    />

                    {getPageNumbers().map((page, index) => (
                        page === '...' ? (
                            <BSPagination.Ellipsis key={`ellipsis-${index}`} disabled />
                        ) : (
                            <BSPagination.Item
                                key={page}
                                active={page === currentPage}
                                onClick={() => onPageChange(page)}
                            >
                                {page}
                            </BSPagination.Item>
                        )
                    ))}

                    <BSPagination.Next
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                    />
                    <BSPagination.Last
                        onClick={() => onPageChange(totalPages)}
                        disabled={currentPage === totalPages}
                    />
                </BSPagination>
            )}

            {/* Page size selector */}
            {showPageSizeSelector && (
                <div className="d-flex align-items-center gap-2">
                    <label htmlFor="pageSize" className="text-muted small mb-0">
                        Per page:
                    </label>
                    <select
                        id="pageSize"
                        className="form-select form-select-sm"
                        style={{ width: 'auto' }}
                        value={pageSize}
                        onChange={handlePageSizeChange}
                    >
                        {pageSizeOptions.map(size => (
                            <option key={size} value={size}>{size}</option>
                        ))}
                    </select>
                </div>
            )}
        </div>
    );
};

/**
 * Hook to manage pagination state
 * @param {number} initialPageSize - Initial page size (defaults to localStorage value or 25)
 */
export const usePagination = (initialPageSize) => {
    const storedPageSize = localStorage.getItem('preferredPageSize');
    const defaultPageSize = initialPageSize || (storedPageSize ? parseInt(storedPageSize, 10) : 25);

    const [page, setPage] = React.useState(1);
    const [pageSize, setPageSize] = React.useState(defaultPageSize);
    const [totalItems, setTotalItems] = React.useState(0);

    const totalPages = Math.ceil(totalItems / pageSize) || 1;

    const handlePageChange = React.useCallback((newPage) => {
        setPage(newPage);
    }, []);

    const handlePageSizeChange = React.useCallback((newSize) => {
        setPageSize(newSize);
        setPage(1); // Reset to first page when changing page size
    }, []);

    const reset = React.useCallback(() => {
        setPage(1);
    }, []);

    return {
        page,
        pageSize,
        totalItems,
        totalPages,
        setTotalItems,
        handlePageChange,
        handlePageSizeChange,
        reset,
        // Pagination props to spread onto Pagination component
        paginationProps: {
            currentPage: page,
            totalPages,
            totalItems,
            pageSize,
            onPageChange: handlePageChange,
            onPageSizeChange: handlePageSizeChange
        }
    };
};

export default Pagination;
