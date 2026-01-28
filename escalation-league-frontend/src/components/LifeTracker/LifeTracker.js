import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPods, getLifeTrackerState, updateLifeTrackerState } from '../../api/podsApi';
import ScryfallApi from '../../api/scryfallApi';
import './LifeTracker.css';

const STARTING_LIFE = 40;
const PLAYER_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6'];

const PlayerLife = ({ player, index, onLifeChange, onCommanderDamageChange, allPlayers, rotation, commanderImage }) => {
    const [showCommanderDamage, setShowCommanderDamage] = useState(false);
    const touchHandledRef = useRef(false);
    const color = PLAYER_COLORS[index % PLAYER_COLORS.length];

    const handleLifeChange = (delta) => {
        onLifeChange(index, delta);
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
        '--player-color': color,
        ...(commanderImage && {
            backgroundImage: `url(${commanderImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
        })
    };

    return (
        <div
            className={`player-cell player-${index} ${commanderImage ? 'has-commander-bg' : ''}`}
            style={cellStyle}
        >
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

                    <div className="life-total" style={{ color }}>
                        {player.life}
                    </div>

                    <button
                        className="life-zone life-zone-plus"
                        onTouchEnd={handleTouchEnd(1)}
                        onClick={handleClick(1)}
                    >
                        <span className="life-delta">+1</span>
                    </button>
                </div>

                <div className="quick-buttons">
                    <button className="quick-btn" onTouchEnd={handleTouchEnd(-5)} onClick={handleClick(-5)}>−5</button>
                    <button className="quick-btn" onTouchEnd={handleTouchEnd(-10)} onClick={handleClick(-10)}>−10</button>
                    <button
                        className="quick-btn cmd-toggle"
                        onClick={() => setShowCommanderDamage(!showCommanderDamage)}
                    >
                        CMD
                    </button>
                    <button className="quick-btn" onTouchEnd={handleTouchEnd(+10)} onClick={handleClick(+10)}>+10</button>
                    <button className="quick-btn" onTouchEnd={handleTouchEnd(+5)} onClick={handleClick(+5)}>+5</button>
                </div>

                {showCommanderDamage && (
                    <div className="commander-overlay">
                        <div className="commander-damage-grid">
                            {allPlayers.map((opponent, oppIndex) => {
                                if (oppIndex === index) return null;
                                const damage = player.commanderDamage[oppIndex] || 0;
                                return (
                                    <div key={oppIndex} className="cmd-damage-item">
                                        <span
                                            className="cmd-color-dot"
                                            style={{ backgroundColor: PLAYER_COLORS[oppIndex] }}
                                        />
                                        <button
                                            className="cmd-btn"
                                            onClick={() => onCommanderDamageChange(index, oppIndex, -1)}
                                        >−</button>
                                        <span className={`cmd-value ${damage >= 21 ? 'lethal' : ''}`}>
                                            {damage}
                                        </span>
                                        <button
                                            className="cmd-btn"
                                            onClick={() => onCommanderDamageChange(index, oppIndex, 1)}
                                        >+</button>
                                    </div>
                                );
                            })}
                        </div>
                        <button
                            className="cmd-close"
                            onClick={() => setShowCommanderDamage(false)}
                        >
                            Close
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

const LifeTracker = () => {
    const { podId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(!!podId);
    const [pod, setPod] = useState(null);
    const [commanderImages, setCommanderImages] = useState({});
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isPWA, setIsPWA] = useState(false);
    const saveTimeoutRef = useRef(null);
    const isInitializedRef = useRef(false);
    const wakeLockRef = useRef(null);

    const [players, setPlayers] = useState([
        { name: '', life: STARTING_LIFE, commanderDamage: {} },
        { name: '', life: STARTING_LIFE, commanderDamage: {} },
        { name: '', life: STARTING_LIFE, commanderDamage: {} },
        { name: '', life: STARTING_LIFE, commanderDamage: {} },
    ]);
    const [history, setHistory] = useState([]);
    const [showMenu, setShowMenu] = useState(false);

    // Rotations for phone flat on table, each player faces outward to their seat
    const rotations = [90, -90, -90, 90];

    // Detect PWA mode and fullscreen state
    useEffect(() => {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
            || window.navigator.standalone
            || document.referrer.includes('android-app://');
        setIsPWA(isStandalone);

        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
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

    // Fetch commander art images
    const fetchCommanderImages = async (participants) => {
        const images = {};

        for (const p of participants) {
            if (p.current_commander) {
                try {
                    const card = await ScryfallApi.getCardById(p.current_commander);
                    if (card?.image_uris?.art_crop) {
                        images[p.player_id] = card.image_uris.art_crop;
                    } else if (card?.image_uris?.normal) {
                        images[p.player_id] = card.image_uris.normal;
                    }
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

    const handleCommanderDamageChange = useCallback((playerIndex, fromIndex, delta) => {
        saveToHistory();
        setPlayers((prev) => {
            const updated = [...prev];
            const currentDamage = updated[playerIndex].commanderDamage[fromIndex] || 0;
            const newDamage = Math.max(0, currentDamage + delta);
            updated[playerIndex] = {
                ...updated[playerIndex],
                commanderDamage: {
                    ...updated[playerIndex].commanderDamage,
                    [fromIndex]: newDamage,
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
                commanderDamage: {},
            }))
        );
        setShowMenu(false);
    };

    const handleClose = async () => {
        // Save state before leaving
        if (podId) {
            try {
                await updateLifeTrackerState(podId, {
                    players,
                    history: history.slice(-10)
                });
            } catch (error) {
                console.error('Error saving before close:', error);
            }
        }
        navigate('/pods');
    };

    const handleNewGame = () => {
        if (pod?.participants) {
            // Reset with pod player names preserved
            const sortedParticipants = [...pod.participants].sort((a, b) =>
                (a.turn_order || 999) - (b.turn_order || 999)
            );

            const resetPlayers = sortedParticipants.slice(0, 4).map(p => ({
                name: `${p.firstname} ${p.lastname}`,
                life: STARTING_LIFE,
                commanderDamage: {},
                playerId: p.player_id,
                commanderUuid: p.current_commander,
                partnerUuid: p.commander_partner
            }));

            while (resetPlayers.length < 4) {
                resetPlayers.push({ name: '', life: STARTING_LIFE, commanderDamage: {} });
            }

            setPlayers(resetPlayers);
        } else {
            setPlayers([
                { name: '', life: STARTING_LIFE, commanderDamage: {} },
                { name: '', life: STARTING_LIFE, commanderDamage: {} },
                { name: '', life: STARTING_LIFE, commanderDamage: {} },
                { name: '', life: STARTING_LIFE, commanderDamage: {} },
            ]);
        }
        setHistory([]);
        setShowMenu(false);
    };

    const toggleFullscreen = async () => {
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen?.();
            } else {
                await document.exitFullscreen?.();
            }
        } catch (error) {
            console.error('Fullscreen error:', error);
        }
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
            {/* Fullscreen prompt for non-PWA users */}
            {!isPWA && !isFullscreen && (
                <button className="fullscreen-prompt" onClick={toggleFullscreen}>
                    <i className="fas fa-expand"></i>
                </button>
            )}

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
                    <button onClick={handleNewGame}>
                        <i className="fas fa-plus"></i> New Game
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
                        onCommanderDamageChange={handleCommanderDamageChange}
                        allPlayers={players}
                        commanderImage={player.playerId ? commanderImages[player.playerId] : null}
                    />
                ))}
            </div>
        </div>
    );
};

export default LifeTracker;
