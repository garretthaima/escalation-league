import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import ScryfallApi from '../../../api/scryfallApi';

/**
 * Displays a commander name.
 * - If commanderName prop is provided, uses it directly (no API call needed)
 * - If commanderId is a UUID, fetches from Scryfall API
 * - If commanderId is already a name, displays it directly
 */
const CommanderDisplay = ({ commanderId, commanderName: propCommanderName, partner, partnerName: propPartnerName, showPartner = true }) => {
    const [commanderName, setCommanderName] = useState(propCommanderName || null);
    const [partnerName, setPartnerName] = useState(propPartnerName || null);
    const [loading, setLoading] = useState(!propCommanderName && !!commanderId);

    // Check if string looks like a UUID
    const isUUID = (str) => {
        if (!str) return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
    };

    useEffect(() => {
        // If names are already provided via props, use them directly
        if (propCommanderName) {
            setCommanderName(propCommanderName);
            setPartnerName(propPartnerName || null);
            setLoading(false);
            return;
        }

        const fetchCardNames = async () => {
            if (!commanderId) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                // Fetch commander name
                if (isUUID(commanderId)) {
                    const card = await ScryfallApi.getCardById(commanderId);
                    setCommanderName(card?.name || commanderId);
                } else {
                    // Already a name, use directly
                    setCommanderName(commanderId);
                }

                // Fetch partner name if exists
                if (partner && showPartner) {
                    if (isUUID(partner)) {
                        const partnerCard = await ScryfallApi.getCardById(partner);
                        setPartnerName(partnerCard?.name || partner);
                    } else {
                        setPartnerName(partner);
                    }
                }
            } catch (err) {
                console.error('Error fetching commander name:', err);
                // Fallback to showing the ID
                setCommanderName(commanderId);
                if (partner) setPartnerName(partner);
            } finally {
                setLoading(false);
            }
        };

        fetchCardNames();
    }, [commanderId, propCommanderName, propPartnerName, partner, showPartner]);

    if (loading) {
        return <span style={{ color: 'var(--text-secondary)' }}>Loading...</span>;
    }

    if (!commanderName) {
        return <span style={{ color: 'var(--text-secondary)' }}>No commander</span>;
    }

    return (
        <>
            {commanderName}
            {partnerName && showPartner && (
                <>{' // '}{partnerName}</>
            )}
        </>
    );
};

CommanderDisplay.propTypes = {
    commanderId: PropTypes.string,
    commanderName: PropTypes.string,
    partner: PropTypes.string,
    partnerName: PropTypes.string,
    showPartner: PropTypes.bool,
};

export default CommanderDisplay;
