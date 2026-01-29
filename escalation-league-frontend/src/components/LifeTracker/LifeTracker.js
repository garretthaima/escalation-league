import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPods, getLifeTrackerState, updateLifeTrackerState } from '../../api/podsApi';
import ScryfallApi from '../../api/scryfallApi';
import './LifeTracker.css';

const STARTING_LIFE = 40;
const PLAYER_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6'];

const PlayerLife = ({ player, index, playerIndex, onLifeChange, onOpenOverlay, rotation, commanderImage }) => {
    const [deltaIndicator, setDeltaIndicator] = useState({ value: 0, visible: false, key: 0 });
    const touchHandledRef = useRef(false);
    const deltaTimeoutRef = useRef(null);
    const cumulativeDeltaRef = useRef(0);
    // Use playerIndex for the actual player in the array (for callbacks)
    // Use index for visual seat position (for grid layout and rotations)
    const actualIndex = playerIndex !== undefined ? playerIndex : index;
    const color = PLAYER_COLORS[actualIndex % PLAYER_COLORS.length];

    const handleLifeChange = (delta) => {
        onLifeChange(actualIndex, delta);

        // Accumulate delta for display
        cumulativeDeltaRef.current += delta;
        setDeltaIndicator(prev => ({
            value: cumulativeDeltaRef.current,
            visible: true,
            key: prev.key + 1 // Force re-render for animation restart
        }));

        // Clear existing timeout
        if (deltaTimeoutRef.current) {
            clearTimeout(deltaTimeoutRef.current);
        }

        // Reset after 1.5 seconds of no taps
        deltaTimeoutRef.current = setTimeout(() => {
            setDeltaIndicator(prev => ({ ...prev, visible: false }));
            cumulativeDeltaRef.current = 0;
        }, 1500);
    };

    // Handle touch events to support multi-touch (multiple players tapping simultaneously)
    // We use onTouchEnd to match the timing of onClick, and track if touch was used
    const handleTouchEnd = (delta) => (e) => {
        e.preventDefault(); // Prevent click from firing after touch
        touchHandledRef.current = true;
        handleLifeChange(delta);
        // Reset after a short delay to allow click events on non-touch devices
        setTimeout(() => { touchHandledRef.current = false; }, 100);
    };

    // Only fire click if touch wasn't used (for mouse/desktop users)
    const handleClick = (delta) => () => {
        if (!touchHandledRef.current) {
            handleLifeChange(delta);
        }
    };

    const cellStyle = {
        '--player-color': color
    };

    return (
        <div
            className={`player-cell player-${index} ${commanderImage?.main ? 'has-commander-bg' : ''}`}
            style={cellStyle}
        >
            {/* Commander background image - rotated to face outward like player content */}
            {commanderImage?.main && (
                commanderImage.partner ? (
                    // Partner commanders: two images side by side
                    <div
                        className="commander-bg commander-bg-partners"
                        style={{ transform: `translate(-50%, -50%) rotate(${rotation}deg)` }}
                    >
                        <div
                            className="commander-bg-half"
                            style={{ backgroundImage: `url(${commanderImage.main})` }}
                        />
                        <div
                            className="commander-bg-half"
                            style={{ backgroundImage: `url(${commanderImage.partner})` }}
                        />
                    </div>
                ) : (
                    // Single commander
                    <div
                        className="commander-bg"
                        style={{
                            backgroundImage: `url(${commanderImage.main})`,
                            transform: `translate(-50%, -50%) rotate(${rotation}deg)`
                        }}
                    />
                )
            )}
            <div
                className="player-content"
                style={{ transform: `translate(-50%, -50%) rotate(${rotation}deg)` }}
            >
                <input
                    type="text"
                    value={player.name}
                    onChange={(e) => onLifeChange(index, 0, e.target.value)}
                    className="player-name-input"
                    placeholder={`Player ${index + 1}`}
                    style={{ color }}
                    readOnly={!!player.playerId}
                />

                <div className="life-controls">
                    <button
                        className="life-zone life-zone-minus"
                        onTouchEnd={handleTouchEnd(-1)}
                        onClick={handleClick(-1)}
                    >
                        <span className="life-delta">−1</span>
                    </button>

                    <div className="life-total-container">
                        <div className="life-total" style={{ color }}>
                            {player.life}
                        </div>
                        {deltaIndicator.visible && deltaIndicator.value !== 0 && (
                            <div
                                key={deltaIndicator.key}
                                className={`delta-indicator ${deltaIndicator.value > 0 ? 'delta-positive' : 'delta-negative'}`}
                            >
                                {deltaIndicator.value > 0 ? '+' : ''}{deltaIndicator.value}
                            </div>
                        )}
                    </div>

                    <button
                        className="life-zone life-zone-plus"
                        onTouchEnd={handleTouchEnd(1)}
                        onClick={handleClick(1)}
                    >
                        <span className="life-delta">+1</span>
                    </button>
                </div>

                {/* Overlay toggle buttons */}
                <div className="overlay-buttons">
                    <button
                        className="overlay-btn cmd-btn"
                        onClick={() => onOpenOverlay('cmd', actualIndex, index)}
                    >
                        <i className="fas fa-shield-alt"></i>
                        <span>CMD</span>
                    </button>
                    <button
                        className={`overlay-btn poison-btn ${(player.poison || 0) > 0 ? 'has-poison' : ''} ${(player.poison || 0) >= 10 ? 'lethal' : ''}`}
                        onClick={() => onOpenOverlay('poison', actualIndex, index)}
                    >
                        <i className="fas fa-skull-crossbones"></i>
                        <span>{player.poison || 0}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

const LifeTracker = () => {
    const { podId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(!!podId);
    const [commanderImages, setCommanderImages] = useState({});
    const saveTimeoutRef = useRef(null);
    const isInitializedRef = useRef(false);
    const wakeLockRef = useRef(null);

    const [players, setPlayers] = useState([
        { name: '', life: STARTING_LIFE, poison: 0, commanderDamage: {} },
        { name: '', life: STARTING_LIFE, poison: 0, commanderDamage: {} },
        { name: '', life: STARTING_LIFE, poison: 0, commanderDamage: {} },
        { name: '', life: STARTING_LIFE, poison: 0, commanderDamage: {} },
    ]);
    const [history, setHistory] = useState([]);
    const [showMenu, setShowMenu] = useState(false);
    // Seat order: maps physical seat index to turn order index
    // null means not yet configured (show seat selection)
    // e.g., [2, 3, 0, 1] means: seat 0 has P3, seat 1 has P4, seat 2 has P1, seat 3 has P2
    const [seatOrder, setSeatOrder] = useState(null);
    const [showSeatSelection, setShowSeatSelection] = useState(false);
    // Centered overlay state: { type: 'cmd'|'poison', playerIndex: number } or null
    const [overlay, setOverlay] = useState(null);
    // Link commander damage to life loss (when true, CMD damage also subtracts life)
    const [linkCmdDamage, setLinkCmdDamage] = useState(true);

    // Rotations for phone flat on table, each player faces outward to their seat
    const rotations = [90, -90, -90, 90];

    // Auto-request fullscreen on mobile
    useEffect(() => {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
            || window.navigator.standalone
            || document.referrer.includes('android-app://');

        // Detect mobile device
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
            || window.matchMedia('(max-width: 768px)').matches;

        // Auto-request fullscreen on mount for mobile only (if not already in PWA/fullscreen)
        // Note: This requires a user gesture on most browsers, so it may not work
        // on initial page load, but will work when navigating from another page
        if (isMobile && !isStandalone && !document.fullscreenElement) {
            document.documentElement.requestFullscreen?.().catch(() => {
                // Fullscreen request failed (likely no user gesture) - that's ok
            });
        }
    }, []);

    // Keep screen awake using Wake Lock API
    useEffect(() => {
        const requestWakeLock = async () => {
            try {
                if ('wakeLock' in navigator) {
                    wakeLockRef.current = await navigator.wakeLock.request('screen');
                    wakeLockRef.current.addEventListener('release', () => {
                        console.log('Wake Lock released');
                    });
                }
            } catch (err) {
                console.log('Wake Lock request failed:', err.message);
            }
        };

        // Request wake lock on mount
        requestWakeLock();

        // Re-request wake lock when page becomes visible again
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                requestWakeLock();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Cleanup on unmount
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (wakeLockRef.current) {
                wakeLockRef.current.release();
                wakeLockRef.current = null;
            }
        };
    }, []);

    // Fetch pod data and saved state on mount
    useEffect(() => {
        if (!podId) {
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                // Fetch pod data
                const podData = await getPods({ podId });

                // Fetch saved life tracker state
                const savedStateResponse = await getLifeTrackerState(podId).catch(() => ({ state: null }));

                if (savedStateResponse.state) {
                    // Restore saved state
                    const saved = savedStateResponse.state;
                    if (saved.players) {
                        setPlayers(saved.players);
                    }
                    if (saved.history) {
                        setHistory(saved.history);
                    }
                    if (saved.seatOrder) {
                        setSeatOrder(saved.seatOrder);
                    } else {
                        // Has saved state but no seat order - show selection
                        setShowSeatSelection(true);
                    }
                    if (saved.linkCmdDamage !== undefined) {
                        setLinkCmdDamage(saved.linkCmdDamage);
                    }
                } else if (podData?.participants) {
                    // Initialize from pod participants
                    const sortedParticipants = [...podData.participants].sort((a, b) =>
                        (a.turn_order || 999) - (b.turn_order || 999)
                    );

                    const initialPlayers = sortedParticipants.slice(0, 4).map(p => ({
                        name: `${p.firstname} ${p.lastname}`,
                        life: STARTING_LIFE,
                        commanderDamage: {},
                        playerId: p.player_id,
                        commanderUuid: p.current_commander,
                        partnerUuid: p.commander_partner
                    }));

                    // Pad to 4 players if needed
                    while (initialPlayers.length < 4) {
                        initialPlayers.push({ name: '', life: STARTING_LIFE, commanderDamage: {} });
                    }

                    setPlayers(initialPlayers);
                    // New game - show seat selection
                    setShowSeatSelection(true);
                }

                // Fetch commander images
                if (podData?.participants) {
                    await fetchCommanderImages(podData.participants);
                }

                isInitializedRef.current = true;
            } catch (error) {
                console.error('Error loading life tracker:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [podId]);

    // Fetch commander art images (supports partner commanders)
    const fetchCommanderImages = async (participants) => {
        const images = {};

        for (const p of participants) {
            if (p.current_commander) {
                try {
                    const card = await ScryfallApi.getCardById(p.current_commander);
                    const mainImage = card?.image_uris?.art_crop || card?.image_uris?.normal;

                    // Check for partner commander
                    let partnerImage = null;
                    let isBackground = false;
                    if (p.commander_partner) {
                        try {
                            const partnerCard = await ScryfallApi.getCardById(p.commander_partner);
                            partnerImage = partnerCard?.image_uris?.art_crop || partnerCard?.image_uris?.normal;
                            // Check if partner is a Background (doesn't deal commander damage)
                            isBackground = partnerCard?.type_line?.includes('Background') || false;
                        } catch (error) {
                            console.error('Error fetching partner commander image:', error);
                        }
                    }

                    // Store as object with main, partner, and whether partner is a background
                    images[p.player_id] = {
                        main: mainImage,
                        partner: partnerImage,
                        isBackground: isBackground
                    };
                } catch (error) {
                    console.error('Error fetching commander image:', error);
                }
            }
        }

        setCommanderImages(images);
    };

    // Auto-save with debounce (only for pod-linked games)
    useEffect(() => {
        if (!podId || !isInitializedRef.current) return;

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(async () => {
            try {
                await updateLifeTrackerState(podId, {
                    players,
                    history: history.slice(-10), // Only save last 10 history items
                    seatOrder,
                    linkCmdDamage
                });
            } catch (error) {
                console.error('Error auto-saving life tracker:', error);
            }
        }, 1500);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [podId, players, history, seatOrder, linkCmdDamage]);

    const saveToHistory = useCallback(() => {
        setHistory((prev) => [...prev.slice(-49), JSON.parse(JSON.stringify(players))]);
    }, [players]);

    const handleLifeChange = useCallback((playerIndex, delta, newName = null) => {
        saveToHistory();
        setPlayers((prev) => {
            const updated = [...prev];
            if (newName !== null) {
                updated[playerIndex] = { ...updated[playerIndex], name: newName };
            } else {
                updated[playerIndex] = {
                    ...updated[playerIndex],
                    life: updated[playerIndex].life + delta,
                };
            }
            return updated;
        });
    }, [saveToHistory]);

    const handlePoisonChange = useCallback((playerIndex, delta) => {
        saveToHistory();
        setPlayers((prev) => {
            const updated = [...prev];
            const currentPoison = updated[playerIndex].poison || 0;
            updated[playerIndex] = {
                ...updated[playerIndex],
                poison: Math.max(0, currentPoison + delta),
            };
            return updated;
        });
    }, [saveToHistory]);

    const handleCommanderDamageChange = useCallback((playerIndex, fromIndex, delta, commanderIndex = 0) => {
        saveToHistory();
        setPlayers((prev) => {
            const updated = [...prev];
            // Use key format "playerIndex" for single commander or "playerIndex_cmdIndex" for partners
            const damageKey = commanderIndex === 0 ? fromIndex : `${fromIndex}_${commanderIndex}`;
            const currentDamage = updated[playerIndex].commanderDamage[damageKey] || 0;
            const newDamage = Math.max(0, currentDamage + delta);

            // Calculate actual delta (in case we hit 0 floor)
            const actualDelta = newDamage - currentDamage;

            updated[playerIndex] = {
                ...updated[playerIndex],
                commanderDamage: {
                    ...updated[playerIndex].commanderDamage,
                    [damageKey]: newDamage,
                },
                // If linked, also adjust life (damage increase = life decrease)
                ...(linkCmdDamage && actualDelta !== 0 ? {
                    life: updated[playerIndex].life - actualDelta
                } : {})
            };
            return updated;
        });
    }, [saveToHistory, linkCmdDamage]);

    const handleUndo = () => {
        if (history.length > 0) {
            const previousState = history[history.length - 1];
            setPlayers(previousState);
            setHistory((prev) => prev.slice(0, -1));
        }
        setShowMenu(false);
    };

    const handleReset = () => {
        saveToHistory();
        setPlayers((prev) =>
            prev.map((p) => ({
                ...p,
                life: STARTING_LIFE,
                poison: 0,
                commanderDamage: {},
            }))
        );
        setShowMenu(false);
    };

    const handleClose = async () => {
        // Save state before leaving
        if (podId) {
            try {
                console.log('Saving life tracker state for pod:', podId);
                const result = await updateLifeTrackerState(podId, {
                    players,
                    history: history.slice(-10),
                    seatOrder
                });
                console.log('Save result:', result);
            } catch (error) {
                console.error('Error saving before close:', error);
                alert('Failed to save game state: ' + (error.response?.data?.error || error.message));
                return; // Don't navigate if save failed
            }
        }
        navigate('/pods');
    };

    // Handle opening centered overlay
    // seatIndex determines rotation: left column (0,3) = 90°, right column (1,2) = -90°
    const handleOpenOverlay = useCallback((type, playerIndex, seatIndex) => {
        setOverlay({ type, playerIndex, seatIndex });
    }, []);

    const handleCloseOverlay = useCallback(() => {
        setOverlay(null);
    }, []);

    // Handle seat selection - P1 taps their seat, rest fill clockwise
    const handleSeatSelection = (seatIndex) => {
        // seatIndex is where P1 (turn order 0) sits
        // Fill clockwise: seat 0 -> 1 -> 2 -> 3 maps to grid positions
        // Grid clockwise order: 0 (top-left) -> 1 (top-right) -> 2 (bottom-right) -> 3 (bottom-left)
        const newSeatOrder = [];
        for (let i = 0; i < 4; i++) {
            // Which turn order player sits at seat i?
            // If P1 is at seatIndex, then seat i has player (i - seatIndex + 4) % 4
            const turnOrderAtSeat = (i - seatIndex + 4) % 4;
            newSeatOrder[i] = turnOrderAtSeat;
        }
        setSeatOrder(newSeatOrder);
        setShowSeatSelection(false);
    };

    // Get the player for a given seat position based on seatOrder
    const getPlayerForSeat = (seatIndex) => {
        if (!seatOrder) {
            // Default: seat index = turn order
            return players[seatIndex];
        }
        return players[seatOrder[seatIndex]];
    };

    // Get the original player index for a seat (needed for callbacks)
    const getPlayerIndexForSeat = (seatIndex) => {
        if (!seatOrder) {
            return seatIndex;
        }
        return seatOrder[seatIndex];
    };

    if (loading) {
        return (
            <div className="life-tracker-fullscreen life-tracker-loading">
                <div className="spinner-border text-light" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="life-tracker-fullscreen">
            {/* Center menu button */}
            <button
                className="center-menu-btn"
                onClick={() => setShowMenu(!showMenu)}
            >
                <i className="fas fa-cog"></i>
            </button>

            {showMenu && (
                <div className="center-menu">
                    <button onClick={handleUndo} disabled={history.length === 0}>
                        <i className="fas fa-undo"></i> Undo
                    </button>
                    <button onClick={handleReset}>
                        <i className="fas fa-sync"></i> Reset Life
                    </button>
                    <button
                        onClick={() => setLinkCmdDamage(prev => !prev)}
                        className={linkCmdDamage ? 'toggle-active' : ''}
                    >
                        <i className={`fas fa-${linkCmdDamage ? 'link' : 'unlink'}`}></i>
                        {linkCmdDamage ? 'CMD → Life: On' : 'CMD → Life: Off'}
                    </button>
                    <button onClick={() => { setShowSeatSelection(true); setShowMenu(false); }}>
                        <i className="fas fa-chair"></i> Rearrange Seats
                    </button>
                    {podId && (
                        <button onClick={handleClose}>
                            <i className="fas fa-sign-out-alt"></i> Close & Save
                        </button>
                    )}
                    <button onClick={() => setShowMenu(false)}>
                        <i className="fas fa-times"></i> Close Menu
                    </button>
                </div>
            )}

            {/* Seat Selection Overlay */}
            {showSeatSelection && (
                <div className="seat-selection-overlay">
                    <div className="seat-selection-prompt">
                        <i className="fas fa-hand-pointer"></i>
                        <span>Tap where <strong>{players[0]?.name || 'Player 1'}</strong> is sitting</span>
                    </div>
                    <div className="seat-selection-grid">
                        {[0, 1, 2, 3].map((seatIndex) => (
                            <button
                                key={seatIndex}
                                className={`seat-selection-cell seat-${seatIndex}`}
                                onClick={() => handleSeatSelection(seatIndex)}
                                style={{ '--seat-color': PLAYER_COLORS[0] }}
                            >
                                <span className="seat-label">Tap if P1 sits here</span>
                            </button>
                        ))}
                    </div>
                    {seatOrder && (
                        <button
                            className="seat-selection-cancel"
                            onClick={() => setShowSeatSelection(false)}
                        >
                            Cancel
                        </button>
                    )}
                </div>
            )}

            {/* 2x2 Grid */}
            <div className="players-table">
                {[0, 1, 2, 3].map((seatIndex) => {
                    const playerIndex = getPlayerIndexForSeat(seatIndex);
                    const player = getPlayerForSeat(seatIndex);
                    return (
                        <PlayerLife
                            key={player.playerId || seatIndex}
                            player={player}
                            index={seatIndex}
                            playerIndex={playerIndex}
                            rotation={rotations[seatIndex]}
                            onLifeChange={handleLifeChange}
                            onOpenOverlay={handleOpenOverlay}
                            commanderImage={player.playerId ? commanderImages[player.playerId] : null}
                        />
                    );
                })}
            </div>

            {/* Centered Overlay for CMD/Poison */}
            {overlay && (() => {
                // Seat positions: 0=top-left, 1=top-right, 2=bottom-right, 3=bottom-left
                // Left column (0, 3) faces left = 90° rotation
                // Right column (1, 2) faces right = -90° rotation
                const isLeftColumn = overlay.seatIndex === 0 || overlay.seatIndex === 3;
                const overlayRotation = isLeftColumn ? 90 : -90;

                return (
                <div className="centered-overlay" onClick={handleCloseOverlay}>
                    <div
                        className="centered-overlay-content"
                        onClick={(e) => e.stopPropagation()}
                        style={{ transform: `rotate(${overlayRotation}deg)` }}
                    >
                        <button className="overlay-close-x" onClick={handleCloseOverlay}>×</button>

                        {/* Player indicator */}
                        <div
                            className="overlay-player-indicator"
                            style={{ '--player-color': PLAYER_COLORS[overlay.playerIndex] }}
                        >
                            <span className="overlay-player-name">
                                {players[overlay.playerIndex]?.name || `Player ${overlay.playerIndex + 1}`}
                            </span>
                        </div>

                        {overlay.type === 'poison' && (
                            <div className="centered-poison-controls">
                                <button
                                    className="centered-ctrl-btn poison-minus"
                                    onClick={() => handlePoisonChange(overlay.playerIndex, -1)}
                                >−</button>
                                <div className="centered-value-display">
                                    <i className="fas fa-skull-crossbones"></i>
                                    <span className={`centered-value ${(players[overlay.playerIndex]?.poison || 0) >= 10 ? 'lethal' : ''}`}>
                                        {players[overlay.playerIndex]?.poison || 0}
                                    </span>
                                    <span className="centered-value-label">Poison</span>
                                </div>
                                <button
                                    className="centered-ctrl-btn poison-plus"
                                    onClick={() => handlePoisonChange(overlay.playerIndex, 1)}
                                >+</button>
                            </div>
                        )}

                        {overlay.type === 'cmd' && (() => {
                            // Grid order depends on rotation to match visual layout
                            // Left column (90° rotation): CSS grid flows differently when viewed rotated
                            // Right column (-90° rotation): opposite transformation
                            // Main grid visual order: 0=top-left, 1=top-right, 3=bottom-left, 2=bottom-right
                            const gridOrder = isLeftColumn
                                ? [1, 2, 0, 3]  // After 90° rotation: top-right→top-left, bottom-right→top-right, etc.
                                : [3, 0, 2, 1]; // After -90° rotation
                            return (
                            <div className="centered-cmd-grid">
                                {gridOrder.map((seatIdx) => {
                                    // Map seat index to player index using seatOrder
                                    const playerIdx = seatOrder ? seatOrder[seatIdx] : seatIdx;
                                    // isSelf: is this the seat that opened the overlay?
                                    const isSelf = seatIdx === overlay.seatIndex;
                                    const opponent = players[playerIdx];
                                    const opponentImages = opponent?.playerId ? commanderImages[opponent.playerId] : null;
                                    const hasPartner = opponent?.partnerUuid && !opponentImages?.isBackground;
                                    const damage1 = players[overlay.playerIndex]?.commanderDamage[playerIdx] || 0;
                                    const damage2 = players[overlay.playerIndex]?.commanderDamage[`${playerIdx}_1`] || 0;
                                    const cmdImage1 = opponentImages?.main || null;
                                    const cmdImage2 = opponentImages?.partner || null;

                                    return (
                                        <div
                                            key={seatIdx}
                                            className={`centered-cmd-cell ${isSelf ? 'cmd-self' : ''} ${hasPartner ? 'cmd-has-partner' : ''}`}
                                            style={{
                                                '--cell-color': PLAYER_COLORS[playerIdx],
                                                backgroundImage: cmdImage1 && !isSelf && !hasPartner
                                                    ? `linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url(${cmdImage1})`
                                                    : 'none',
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center'
                                            }}
                                        >
                                            {isSelf ? (
                                                <span className="cmd-self-label">YOU</span>
                                            ) : hasPartner ? (
                                                <div className="cmd-partner-row">
                                                    {/* Partner 1 - tap zone style */}
                                                    <div
                                                        className="cmd-partner-half cmd-tap-zone-container"
                                                        style={cmdImage1 ? {
                                                            backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${cmdImage1})`,
                                                            backgroundSize: 'cover',
                                                            backgroundPosition: 'center'
                                                        } : {}}
                                                    >
                                                        <button
                                                            className="cmd-tap-zone cmd-tap-minus"
                                                            onClick={() => handleCommanderDamageChange(overlay.playerIndex, playerIdx, -1, 0)}
                                                        >
                                                            <span className="cmd-tap-delta">−1</span>
                                                        </button>
                                                        <span className={`cmd-damage-value ${damage1 >= 21 ? 'lethal' : ''}`}>{damage1}</span>
                                                        <button
                                                            className="cmd-tap-zone cmd-tap-plus"
                                                            onClick={() => handleCommanderDamageChange(overlay.playerIndex, playerIdx, 1, 0)}
                                                        >
                                                            <span className="cmd-tap-delta">+1</span>
                                                        </button>
                                                    </div>
                                                    {/* Partner 2 - tap zone style */}
                                                    <div
                                                        className="cmd-partner-half cmd-tap-zone-container"
                                                        style={cmdImage2 ? {
                                                            backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${cmdImage2})`,
                                                            backgroundSize: 'cover',
                                                            backgroundPosition: 'center'
                                                        } : {}}
                                                    >
                                                        <button
                                                            className="cmd-tap-zone cmd-tap-minus"
                                                            onClick={() => handleCommanderDamageChange(overlay.playerIndex, playerIdx, -1, 1)}
                                                        >
                                                            <span className="cmd-tap-delta">−1</span>
                                                        </button>
                                                        <span className={`cmd-damage-value ${damage2 >= 21 ? 'lethal' : ''}`}>{damage2}</span>
                                                        <button
                                                            className="cmd-tap-zone cmd-tap-plus"
                                                            onClick={() => handleCommanderDamageChange(overlay.playerIndex, playerIdx, 1, 1)}
                                                        >
                                                            <span className="cmd-tap-delta">+1</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                /* Single commander - tap zone style like main life counter */
                                                <div className="cmd-tap-zone-container">
                                                    <span className="cmd-opponent-name">{opponent?.name?.split(' ')[0] || `P${playerIdx + 1}`}</span>
                                                    <div className="cmd-tap-controls">
                                                        <button
                                                            className="cmd-tap-zone cmd-tap-minus"
                                                            onClick={() => handleCommanderDamageChange(overlay.playerIndex, playerIdx, -1, 0)}
                                                        >
                                                            <span className="cmd-tap-delta">−1</span>
                                                        </button>
                                                        <div className="cmd-value-container">
                                                            <span className={`cmd-damage-value ${damage1 >= 21 ? 'lethal' : ''}`}>{damage1}</span>
                                                        </div>
                                                        <button
                                                            className="cmd-tap-zone cmd-tap-plus"
                                                            onClick={() => handleCommanderDamageChange(overlay.playerIndex, playerIdx, 1, 0)}
                                                        >
                                                            <span className="cmd-tap-delta">+1</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            );
                        })()}
                    </div>
                </div>
                );
            })()}
        </div>
    );
};

export default LifeTracker;
