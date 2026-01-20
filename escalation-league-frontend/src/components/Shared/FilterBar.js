import React, { useState, useEffect } from 'react';
import { Form, Button, Collapse, Row, Col } from 'react-bootstrap';
import { useSearchParams } from 'react-router-dom';

/**
 * Reusable FilterBar component
 *
 * @param {Array} filters - Array of filter configurations
 *   Each filter: { key, label, type, options?, placeholder?, min?, max? }
 *   Types: 'text', 'select', 'date', 'dateRange', 'number', 'checkbox'
 * @param {Object} values - Current filter values
 * @param {function} onChange - Callback when filters change
 * @param {boolean} syncWithUrl - Whether to sync filters with URL params
 * @param {boolean} collapsible - Whether the filter bar is collapsible
 * @param {boolean} defaultExpanded - Default expanded state if collapsible
 */
const FilterBar = ({
    filters = [],
    values = {},
    onChange,
    syncWithUrl = false,
    collapsible = true,
    defaultExpanded = false,
    className = ''
}) => {
    const [expanded, setExpanded] = useState(defaultExpanded);
    const [localValues, setLocalValues] = useState(values);
    const [searchParams, setSearchParams] = useSearchParams();

    // Sync with URL params on mount if enabled
    useEffect(() => {
        if (syncWithUrl) {
            const urlValues = {};
            filters.forEach(filter => {
                const urlValue = searchParams.get(filter.key);
                if (urlValue) {
                    urlValues[filter.key] = urlValue;
                }
            });
            if (Object.keys(urlValues).length > 0) {
                setLocalValues(prev => ({ ...prev, ...urlValues }));
                onChange?.({ ...localValues, ...urlValues });
            }
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Update URL when values change
    useEffect(() => {
        if (syncWithUrl) {
            const newParams = new URLSearchParams(searchParams);
            filters.forEach(filter => {
                if (localValues[filter.key]) {
                    newParams.set(filter.key, localValues[filter.key]);
                } else {
                    newParams.delete(filter.key);
                }
            });
            setSearchParams(newParams, { replace: true });
        }
    }, [localValues, syncWithUrl]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleChange = (key, value) => {
        const newValues = { ...localValues, [key]: value };
        setLocalValues(newValues);
        onChange?.(newValues);
    };

    const handleClearAll = () => {
        const clearedValues = {};
        filters.forEach(filter => {
            clearedValues[filter.key] = '';
        });
        setLocalValues(clearedValues);
        onChange?.(clearedValues);
    };

    const activeFilterCount = Object.values(localValues).filter(v => v && v !== '').length;

    const renderFilter = (filter) => {
        const value = localValues[filter.key] || '';

        switch (filter.type) {
            case 'text':
                return (
                    <Form.Control
                        type="text"
                        placeholder={filter.placeholder || `Search ${filter.label}...`}
                        value={value}
                        onChange={(e) => handleChange(filter.key, e.target.value)}
                        size="sm"
                    />
                );

            case 'select':
                return (
                    <Form.Select
                        value={value}
                        onChange={(e) => handleChange(filter.key, e.target.value)}
                        size="sm"
                    >
                        <option value="">All {filter.label}</option>
                        {filter.options?.map(opt => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </Form.Select>
                );

            case 'date':
                return (
                    <Form.Control
                        type="date"
                        value={value}
                        onChange={(e) => handleChange(filter.key, e.target.value)}
                        size="sm"
                    />
                );

            case 'number':
                return (
                    <Form.Control
                        type="number"
                        placeholder={filter.placeholder || filter.label}
                        value={value}
                        min={filter.min}
                        max={filter.max}
                        onChange={(e) => handleChange(filter.key, e.target.value)}
                        size="sm"
                    />
                );

            case 'checkbox':
                return (
                    <Form.Check
                        type="checkbox"
                        label={filter.label}
                        checked={value === true || value === 'true'}
                        onChange={(e) => handleChange(filter.key, e.target.checked)}
                    />
                );

            default:
                return null;
        }
    };

    const filterContent = (
        <Row className="g-3 align-items-end">
            {filters.map(filter => (
                <Col key={filter.key} xs={12} sm={6} md={4} lg={3}>
                    {filter.type !== 'checkbox' && (
                        <Form.Label className="small text-muted mb-1">
                            {filter.label}
                        </Form.Label>
                    )}
                    {renderFilter(filter)}
                </Col>
            ))}
            <Col xs={12} sm={6} md={4} lg={3}>
                <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={handleClearAll}
                    disabled={activeFilterCount === 0}
                >
                    Clear All
                </Button>
            </Col>
        </Row>
    );

    return (
        <div className={`filter-bar mb-3 ${className}`}>
            {collapsible ? (
                <>
                    <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => setExpanded(!expanded)}
                        className="mb-2"
                        aria-expanded={expanded}
                    >
                        <i className={`fas fa-filter me-2`}></i>
                        Filters
                        {activeFilterCount > 0 && (
                            <span className="badge bg-primary ms-2">{activeFilterCount}</span>
                        )}
                        <i className={`fas fa-chevron-${expanded ? 'up' : 'down'} ms-2`}></i>
                    </Button>
                    <Collapse in={expanded}>
                        <div className="p-3 bg-light rounded border">
                            {filterContent}
                        </div>
                    </Collapse>
                </>
            ) : (
                <div className="p-3 bg-light rounded border">
                    {filterContent}
                </div>
            )}
        </div>
    );
};

/**
 * Hook to manage filter state
 * @param {Object} initialFilters - Initial filter values
 */
export const useFilters = (initialFilters = {}) => {
    const [filters, setFilters] = useState(initialFilters);

    const updateFilter = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const updateFilters = (newFilters) => {
        setFilters(newFilters);
    };

    const clearFilters = () => {
        const cleared = {};
        Object.keys(filters).forEach(key => {
            cleared[key] = '';
        });
        setFilters(cleared);
    };

    const hasActiveFilters = Object.values(filters).some(v => v && v !== '');

    return {
        filters,
        updateFilter,
        updateFilters,
        clearFilters,
        hasActiveFilters
    };
};

export default FilterBar;
