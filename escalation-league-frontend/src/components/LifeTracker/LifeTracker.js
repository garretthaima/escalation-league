import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPods, getLifeTrackerState, updateLifeTrackerState } from '../../api/podsApi';
import ScryfallApi from '../../api/scryfallApi';
import './LifeTracker.css';

const STARTING_LIFE = 40;
const PLAYER_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6'];

const PlayerLife = ({ player, index, onLifeChange, onPoisonChange, onCommanderDamageChange, allPlayers, rotation, commanderImage, allCommanderImages }) => {
    const [showCommanderDamage, setShowCommanderDamage] = useState(false);
    const [showPoisonControls, setShowPoisonControls] = useState(false);
    const [deltaIndicator, setDeltaIndicator] = useState({ value: 0, visible: false, key: 0 });
    const touchHandledRef = useRef(false);
    const deltaTimeoutRef = useRef(null);
    const cumulativeDeltaRef = useRef(0);
    const color = PLAYER_COLORS[index % PLAYER_COLORS.length];

    const handleLifeChange = (delta) => {
        onLifeChange(index, delta);

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
                        className={`overlay-btn cmd-btn ${showCommanderDamage ? 'active' : ''}`}
                        onClick={() => setShowCommanderDamage(!showCommanderDamage)}
                    >
                        <i className="fas fa-shield-alt"></i>
                        <span>CMD</span>
                    </button>
                    <button
                        className={`overlay-btn poison-btn ${showPoisonControls ? 'active' : ''} ${(player.poison || 0) > 0 ? 'has-poison' : ''} ${(player.poison || 0) >= 10 ? 'lethal' : ''}`}
                        onClick={() => setShowPoisonControls(!showPoisonControls)}
                    >
                        <i className="fas fa-skull-crossbones"></i>
                        <span>{player.poison || 0}</span>
                    </button>
                </div>

                {/* Poison controls overlay */}
                {showPoisonControls && (
                    <div className="poison-overlay">
                        <button
                            className="poison-close-x"
                            onClick={() => setShowPoisonControls(false)}
                        >
                            ×
                        </button>
                        <div className="poison-controls">
                            <button
                                className="poison-ctrl-btn poison-minus"
                                onClick={() => onPoisonChange(index, -1)}
                            >−</button>
                            <div className="poison-display">
                                <i className="fas fa-skull-crossbones"></i>
                                <span className={`poison-count ${(player.poison || 0) >= 10 ? 'lethal' : ''}`}>
                                    {player.poison || 0}
                                </span>
                            </div>
                            <button
                                className="poison-ctrl-btn poison-plus"
                                onClick={() => onPoisonChange(index, 1)}
                            >+</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Commander damage overlay - outside player-content so it fills the cell */}
            {showCommanderDamage && (() => {
                // Rotate entire grid to face the player at this position
                // Players 0,3 are left column (face left = 90°), players 1,2 are right column (face right = -90°)
                const isLeftColumn = index === 0 || index === 3;
                const gridRotation = isLeftColumn ? 90 : -90;

                // Grid position to player mapping, adjusted for rotation
                // Main layout: P0=top-left, P1=top-right, P2=bottom-right, P3=bottom-left
                // For 90° (left column): grid renders then rotates CW, so we pre-map CCW
                // For -90° (right column): grid renders then rotates CCW, so we pre-map CW
                const gridToPlayer = isLeftColumn
                    ? [1, 2, 0, 3]  // After 90° CW rotation: [0,1,2,3] -> P0 top-left, P1 top-right, P3 bottom-left, P2 bottom-right
                    : [3, 0, 2, 1]; // After 90° CCW rotation

                // Grid dimensions - cell is 50vw x 50vh, grid rotates 90°
                // After rotation: CSS width becomes visual height, CSS height becomes visual width
                // Slightly taller than wide for rectangular cells after rotation
                const gridWidth = '38vh';  // Becomes visual height after rotation
                const gridHeight = '40vw'; // Becomes visual width after rotation

                return (
                    <div className={`commander-overlay cmd-overlay-player-${index}`}>
                        <button
                            className="cmd-close-x"
                            onClick={() => setShowCommanderDamage(false)}
                        >
                            ×
                        </button>
                        <div
                            className="commander-damage-grid-2x2"
                            style={{
                                transform: `translate(-50%, -50%) rotate(${gridRotation}deg)`,
                                width: gridWidth,
                                height: gridHeight
                            }}
                        >
                            {/* Grid positions after rotation should match main layout */}
                            {[0, 1, 2, 3].map((gridPos) => {
                                const playerIdx = gridToPlayer[gridPos];
                                const isSelf = playerIdx === index;
                                const opponent = allPlayers[playerIdx];
                                // Only show dual damage tracking for true partners, not backgrounds
                                const opponentImages = opponent?.playerId ? allCommanderImages[opponent.playerId] : null;
                                const hasPartner = opponent?.partnerUuid && !opponentImages?.isBackground;
                                // Get damage - for partners, use key format "playerIdx_1" for second commander
                                const damage1 = player.commanderDamage[playerIdx] || 0;
                                const damage2 = player.commanderDamage[`${playerIdx}_1`] || 0;
                                // Get commander image(s) for this opponent
                                const cmdImage1 = opponentImages?.main || null;
                                const cmdImage2 = opponentImages?.partner || null;

                                return (
                                    <div
                                        key={gridPos}
                                        className={`cmd-grid-cell ${isSelf ? 'cmd-grid-self' : ''} ${hasPartner ? 'cmd-grid-partner' : ''} ${cmdImage1 && !isSelf ? 'has-cmd-bg' : ''}`}
                                        style={{
                                            '--cell-color': PLAYER_COLORS[playerIdx],
                                            '--cmd-bg-image': cmdImage1 && !isSelf ? `url(${cmdImage1})` : 'none'
                                        }}
                                    >
                                    {isSelf ? (
                                        <span className="cmd-grid-self-label">YOU</span>
                                    ) : hasPartner ? (
                                        <div className="cmd-partner-container">
                                            <div
                                                className="cmd-partner-col"
                                                style={cmdImage1 ? {
                                                    backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${cmdImage1})`,
                                                    backgroundSize: 'cover',
                                                    backgroundPosition: 'center'
                                                } : {}}
                                            >
                                                <button
                                                    className="cmd-grid-btn cmd-grid-plus"
                                                    onClick={() => onCommanderDamageChange(index, playerIdx, 1, 0)}
                                                >+</button>
                                                <span className={`cmd-grid-value ${damage1 >= 21 ? 'lethal' : ''}`}>
                                                    {damage1}
                                                </span>
                                                <button
                                                    className="cmd-grid-btn cmd-grid-minus"
                                                    onClick={() => onCommanderDamageChange(index, playerIdx, -1, 0)}
                                                >−</button>
                                            </div>
                                            <div
                                                className="cmd-partner-col"
                                                style={cmdImage2 ? {
                                                    backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${cmdImage2})`,
                                                    backgroundSize: 'cover',
                                                    backgroundPosition: 'center'
                                                } : {}}
                                            >
                                                <button
                                                    className="cmd-grid-btn cmd-grid-plus"
                                                    onClick={() => onCommanderDamageChange(index, playerIdx, 1, 1)}
                                                >+</button>
                                                <span className={`cmd-grid-value ${damage2 >= 21 ? 'lethal' : ''}`}>
                                                    {damage2}
                                                </span>
                                                <button
                                                    className="cmd-grid-btn cmd-grid-minus"
                                                    onClick={() => onCommanderDamageChange(index, playerIdx, -1, 1)}
                                                >−</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <button
                                                className="cmd-grid-btn cmd-grid-plus"
                                                onClick={() => onCommanderDamageChange(index, playerIdx, 1, 0)}
                                            >+</button>
                                            <span className={`cmd-grid-value ${damage1 >= 21 ? 'lethal' : ''}`}>
                                                {damage1}
                                            </span>
                                            <button
                                                className="cmd-grid-btn cmd-grid-minus"
                                                onClick={() => onCommanderDamageChange(index, playerIdx, -1, 0)}
                                            >−</button>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
                );
            })()}
        </div>
    );
};

const LifeTracker = () => {
    const { podId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(!!podId);
    const [pod, setPod] = useState(null);
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
                setPod(podData);

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
                    history: history.slice(-10) // Only save last 10 history items
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
    }, [podId, players, history]);

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
            updated[playerIndex] = {
                ...updated[playerIndex],
                commanderDamage: {
                    ...updated[playerIndex].commanderDamage,
                    [damageKey]: newDamage,
                },
            };
            return updated;
        });
    }, [saveToHistory]);

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
                    history: history.slice(-10)
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

            {/* 2x2 Grid */}
            <div className="players-table">
                {players.map((player, index) => (
                    <PlayerLife
                        key={player.playerId || index}
                        player={player}
                        index={index}
                        rotation={rotations[index]}
                        onLifeChange={handleLifeChange}
                        onPoisonChange={handlePoisonChange}
                        onCommanderDamageChange={handleCommanderDamageChange}
                        allPlayers={players}
                        commanderImage={player.playerId ? commanderImages[player.playerId] : null}
                        allCommanderImages={commanderImages}
                    />
                ))}
            </div>
        </div>
    );
};

export default LifeTracker;
