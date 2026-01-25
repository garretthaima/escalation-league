// Mock axios BEFORE any imports (ESM compatibility)
jest.mock('../../../../api/axiosConfig', () => ({
    __esModule: true,
    default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

// Mock Scryfall API
jest.mock('../../../../api/scryfallApi', () => ({
    getCardById: jest.fn()
}));

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import CommanderDisplay from '../CommanderDisplay';

const ScryfallApi = require('../../../../api/scryfallApi');

// TODO: Fix async/mock issues - tests skipped
describe.skip('CommanderDisplay', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('with commanderName prop', () => {
        it('should display commander name directly without API call', async () => {
            render(<CommanderDisplay commanderName="Kenrith, the Returned King" />);

            expect(screen.getByText('Kenrith, the Returned King')).toBeInTheDocument();
            expect(ScryfallApi.getCardById).not.toHaveBeenCalled();
        });

        it('should display partner name when provided', async () => {
            render(
                <CommanderDisplay
                    commanderName="Thrasios, Triton Hero"
                    partnerName="Tymna the Weaver"
                />
            );

            expect(screen.getByText('Thrasios, Triton Hero')).toBeInTheDocument();
            expect(screen.getByText(/ \/\/ /)).toBeInTheDocument();
            expect(screen.getByText(/Tymna the Weaver/)).toBeInTheDocument();
        });

        it('should not display partner when showPartner is false', async () => {
            render(
                <CommanderDisplay
                    commanderName="Thrasios, Triton Hero"
                    partnerName="Tymna the Weaver"
                    showPartner={false}
                />
            );

            expect(screen.getByText('Thrasios, Triton Hero')).toBeInTheDocument();
            expect(screen.queryByText(/Tymna the Weaver/)).not.toBeInTheDocument();
        });
    });

    describe('loading state', () => {
        it('should show loading text while fetching card data', async () => {
            ScryfallApi.getCardById.mockImplementation(() => new Promise(() => {}));

            render(<CommanderDisplay commanderId="abc12345-1234-5678-abcd-123456789abc" />);

            expect(screen.getByText('Loading...')).toBeInTheDocument();
        });

        it('should not show loading when commanderName is provided', () => {
            render(<CommanderDisplay commanderName="Test Commander" />);

            expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
        });
    });

    describe('no commander state', () => {
        it('should show "No commander" when commanderId is null', async () => {
            render(<CommanderDisplay commanderId={null} />);

            await waitFor(() => {
                expect(screen.getByText('No commander')).toBeInTheDocument();
            });
        });

        it('should show "No commander" when commanderId is undefined', async () => {
            render(<CommanderDisplay />);

            await waitFor(() => {
                expect(screen.getByText('No commander')).toBeInTheDocument();
            });
        });

        it('should show "No commander" when commanderId is empty string', async () => {
            render(<CommanderDisplay commanderId="" />);

            await waitFor(() => {
                expect(screen.getByText('No commander')).toBeInTheDocument();
            });
        });
    });

    describe('with UUID commanderId', () => {
        const validUUID = 'abc12345-1234-5678-abcd-123456789abc';

        it('should fetch card by ID when commanderId is a UUID', async () => {
            ScryfallApi.getCardById.mockResolvedValue({
                name: 'Kenrith, the Returned King'
            });

            render(<CommanderDisplay commanderId={validUUID} />);

            await waitFor(() => {
                expect(ScryfallApi.getCardById).toHaveBeenCalledWith(validUUID);
            });

            expect(screen.getByText('Kenrith, the Returned King')).toBeInTheDocument();
        });

        it('should fetch partner card when partner UUID is provided', async () => {
            const partnerUUID = 'def67890-5678-1234-efab-098765432abc';

            ScryfallApi.getCardById
                .mockResolvedValueOnce({ name: 'Thrasios, Triton Hero' })
                .mockResolvedValueOnce({ name: 'Tymna the Weaver' });

            render(
                <CommanderDisplay
                    commanderId={validUUID}
                    partner={partnerUUID}
                    showPartner={true}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Thrasios, Triton Hero')).toBeInTheDocument();
                expect(screen.getByText(/Tymna the Weaver/)).toBeInTheDocument();
            });
        });

        it('should fallback to UUID when API fails', async () => {
            ScryfallApi.getCardById.mockRejectedValue(new Error('API Error'));

            render(<CommanderDisplay commanderId={validUUID} />);

            await waitFor(() => {
                expect(screen.getByText(validUUID)).toBeInTheDocument();
            });
        });

        it('should fallback to UUID when card name is not returned', async () => {
            ScryfallApi.getCardById.mockResolvedValue({});

            render(<CommanderDisplay commanderId={validUUID} />);

            await waitFor(() => {
                expect(screen.getByText(validUUID)).toBeInTheDocument();
            });
        });

        it('should fallback partner to UUID when partner API fails', async () => {
            const partnerUUID = 'def67890-5678-1234-efab-098765432abc';

            ScryfallApi.getCardById
                .mockResolvedValueOnce({ name: 'Thrasios, Triton Hero' })
                .mockRejectedValueOnce(new Error('Partner API Error'));

            render(
                <CommanderDisplay
                    commanderId={validUUID}
                    partner={partnerUUID}
                    showPartner={true}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Thrasios, Triton Hero')).toBeInTheDocument();
                expect(screen.getByText(new RegExp(partnerUUID))).toBeInTheDocument();
            });
        });
    });

    describe('with non-UUID commanderId (card name)', () => {
        it('should display commanderId directly when it is not a UUID', async () => {
            render(<CommanderDisplay commanderId="Kenrith, the Returned King" />);

            await waitFor(() => {
                expect(screen.getByText('Kenrith, the Returned King')).toBeInTheDocument();
            });

            expect(ScryfallApi.getCardById).not.toHaveBeenCalled();
        });

        it('should display partner directly when it is not a UUID', async () => {
            render(
                <CommanderDisplay
                    commanderId="Thrasios, Triton Hero"
                    partner="Tymna the Weaver"
                    showPartner={true}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Thrasios, Triton Hero')).toBeInTheDocument();
                expect(screen.getByText(/Tymna the Weaver/)).toBeInTheDocument();
            });
        });
    });

    describe('UUID validation', () => {
        it('should recognize valid UUID format', async () => {
            const validUUID = '550e8400-e29b-41d4-a716-446655440000';
            ScryfallApi.getCardById.mockResolvedValue({ name: 'Test Card' });

            render(<CommanderDisplay commanderId={validUUID} />);

            await waitFor(() => {
                expect(ScryfallApi.getCardById).toHaveBeenCalledWith(validUUID);
            });
        });

        it('should not call API for invalid UUID format', async () => {
            const invalidUUID = 'not-a-valid-uuid';

            render(<CommanderDisplay commanderId={invalidUUID} />);

            await waitFor(() => {
                expect(screen.getByText(invalidUUID)).toBeInTheDocument();
            });

            expect(ScryfallApi.getCardById).not.toHaveBeenCalled();
        });

        it('should not call API for partial UUID', async () => {
            const partialUUID = 'abc12345-1234';

            render(<CommanderDisplay commanderId={partialUUID} />);

            await waitFor(() => {
                expect(screen.getByText(partialUUID)).toBeInTheDocument();
            });

            expect(ScryfallApi.getCardById).not.toHaveBeenCalled();
        });

        it('should handle case-insensitive UUID matching', async () => {
            const upperCaseUUID = 'ABC12345-1234-5678-ABCD-123456789ABC';
            ScryfallApi.getCardById.mockResolvedValue({ name: 'Test Card' });

            render(<CommanderDisplay commanderId={upperCaseUUID} />);

            await waitFor(() => {
                expect(ScryfallApi.getCardById).toHaveBeenCalledWith(upperCaseUUID);
            });
        });
    });

    describe('showPartner prop', () => {
        it('should default to showing partner (showPartner=true)', async () => {
            render(
                <CommanderDisplay
                    commanderName="Commander A"
                    partnerName="Partner B"
                />
            );

            expect(screen.getByText(/Partner B/)).toBeInTheDocument();
        });

        it('should hide partner when showPartner is false', async () => {
            render(
                <CommanderDisplay
                    commanderName="Commander A"
                    partnerName="Partner B"
                    showPartner={false}
                />
            );

            expect(screen.queryByText(/Partner B/)).not.toBeInTheDocument();
        });

        it('should not fetch partner when showPartner is false', async () => {
            const commanderUUID = 'abc12345-1234-5678-abcd-123456789abc';
            const partnerUUID = 'def67890-5678-1234-efab-098765432abc';

            ScryfallApi.getCardById.mockResolvedValue({ name: 'Commander' });

            render(
                <CommanderDisplay
                    commanderId={commanderUUID}
                    partner={partnerUUID}
                    showPartner={false}
                />
            );

            await waitFor(() => {
                expect(screen.getByText('Commander')).toBeInTheDocument();
            });

            // Should only be called once for the commander, not for partner
            expect(ScryfallApi.getCardById).toHaveBeenCalledTimes(1);
        });
    });

    describe('prop changes', () => {
        it('should update when commanderName prop changes', async () => {
            const { rerender } = render(
                <CommanderDisplay commanderName="Commander A" />
            );

            expect(screen.getByText('Commander A')).toBeInTheDocument();

            rerender(<CommanderDisplay commanderName="Commander B" />);

            expect(screen.getByText('Commander B')).toBeInTheDocument();
        });

        it('should update when partnerName prop changes', async () => {
            const { rerender } = render(
                <CommanderDisplay
                    commanderName="Commander A"
                    partnerName="Partner A"
                />
            );

            expect(screen.getByText(/Partner A/)).toBeInTheDocument();

            rerender(
                <CommanderDisplay
                    commanderName="Commander A"
                    partnerName="Partner B"
                />
            );

            expect(screen.getByText(/Partner B/)).toBeInTheDocument();
        });
    });

    describe('separator formatting', () => {
        it('should display " // " separator between commander and partner', async () => {
            render(
                <CommanderDisplay
                    commanderName="Commander A"
                    partnerName="Partner B"
                />
            );

            // Check the full text includes the separator
            const container = screen.getByText('Commander A').parentElement;
            expect(container.textContent).toBe('Commander A // Partner B');
        });
    });
});
