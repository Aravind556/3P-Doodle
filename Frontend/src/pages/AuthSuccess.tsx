import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PopUp } from '../components/pop_up';
import { Loading } from '../components/Loading';
import './HomePage.css';

interface RoomStatus {
    status: 'NO_ROOM' | 'WAITING' | 'PAIRED';
    code?: string;
    partner?: string;
}

export function AuthSuccess() {
    const { session, logout } = useAuth();
    const navigate = useNavigate();
    const [roomStatus, setRoomStatus] = useState<RoomStatus | null>(null);
    const [friendCode, setFriendCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPairedPopup, setShowPairedPopup] = useState(false);
    const [hasShownPopup, setHasShownPopup] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    useEffect(() => {
        if (session) {
            checkRoomStatus();
            // Poll every 3 seconds for updates
            const interval = setInterval(checkRoomStatus, 3000);
            return () => clearInterval(interval);
        }
    }, [session]);

    useEffect(() => {
        if (roomStatus?.status === 'PAIRED' && !hasShownPopup) {
            setShowPairedPopup(true);
            setHasShownPopup(true);
        }
    }, [roomStatus, hasShownPopup]);

    // Auto-redirect if already paired
    useEffect(() => {
        if (roomStatus?.status === 'PAIRED' && !showPairedPopup) {
            // User is already paired, skip to options screen
            navigate('/options');
        }
    }, [roomStatus, showPairedPopup, navigate]);

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';

    const checkRoomStatus = async () => {
        if (!session) return;

        try {
            const res = await fetch(`${apiUrl}/room/status`, {
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
                },
            });

            if (res.ok) {
                const data = await res.json();
                console.log('Room status:', data); // Debug log
                setRoomStatus(data);
            } else {
                console.error('Status check failed:', res.status, await res.text());
            }
        } catch (err) {
            console.error('Failed to check room status', err);
        } finally {
            setInitialLoading(false);
        }
    };

    const createRoom = async () => {
        setLoading(true);
        setError('');

        try {
            const res = await fetch(`${apiUrl}/room/create`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${session!.access_token}`,
                },
            });

            const data = await res.json();

            if (res.ok) {
                setRoomStatus(data);
            } else {
                console.error('Create room error:', res.status, data);
                setError(data.error || 'Failed to create room');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    };

    const joinRoom = async () => {
        if (!friendCode.trim()) {
            setError('Please enter a room code');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch(`${apiUrl}/room/join`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session!.access_token}`,
                },
                body: JSON.stringify({ code: friendCode.toUpperCase() }),
            });

            const data = await res.json();
            console.log('Join response:', data); // Debug log

            if (res.ok) {
                setRoomStatus(data);
                setShowPairedPopup(true);
            } else {
                console.error('Join error:', data); // Debug log
                setError(data.error || data.message || 'Failed to join room');
            }
        } catch (err) {
            console.error('Join exception:', err); // Debug log
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    };

    const leaveRoom = async () => {
        try {
            const res = await fetch(`${apiUrl}/room/leave`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${session!.access_token}`,
                },
            });

            if (res.ok) {
                // Reset to NO_ROOM state
                setRoomStatus({ status: 'NO_ROOM' });
                setFriendCode('');
                setError('');
            } else {
                console.error('Leave room error:', res.status);
                setError('Failed to leave room');
            }
        } catch (err) {
            console.error('Leave room exception:', err);
            setError(err instanceof Error ? err.message : String(err));
        }
    };

    return (
        <div className="home-page-container">
            {/* Background layers */}
            <img src="/assets/Home/Left.png" alt="" className="patchwork-left" />
            <div className="patchwork-right">
                <img src="/assets/Home/right-top.png" alt="" className="patchwork-right-top" />
                <img src="/assets/Home/right-bottom.png" alt="" className="patchwork-right-bottom" />
            </div>

            {/* Central Panel */}
            <motion.div
                className="central-panel"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, ease: "easeOut" }}
            >
                {(initialLoading || loading) && <Loading />}

                {!(initialLoading || loading) && (
                    <>
                        {roomStatus?.status === 'NO_ROOM' && (
                            <div className="room-setup">
                                <h2>Welcome to Doodle!</h2>
                                <div className="room-actions">
                                    <button
                                        onClick={createRoom}
                                        disabled={loading}
                                        className="create-room-btn"
                                    >
                                        {loading ? 'Creating...' : 'Get My Code'}
                                    </button>

                                    <div className="divider">OR</div>

                                    <div className="join-room-section">
                                        <input
                                            type="text"
                                            placeholder="Enter friend's code"
                                            value={friendCode}
                                            onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
                                            className="room-code-input"
                                            maxLength={6}
                                        />
                                        <button
                                            onClick={joinRoom}
                                            disabled={loading || !friendCode.trim()}
                                            className="join-room-btn"
                                        >
                                            {loading ? 'Joining...' : 'Join Room'}
                                        </button>
                                    </div>
                                </div>
                                {error && <p className="error-message">{error}</p>}
                            </div>
                        )}

                        {roomStatus?.status === 'WAITING' && (
                            <div className="waiting-room">
                                <h2>Your Room Code</h2>
                                <div className="room-code-display">{roomStatus.code}</div>
                                <p className="waiting-text">Waiting for friend to join...</p>
                                <div className="loading-dots">
                                    <span></span><span></span><span></span>
                                </div>
                                <button
                                    onClick={leaveRoom}
                                    className="cancel-room-btn"
                                >
                                    Start Over
                                </button>
                            </div>
                        )}

                        {/* Removed the PAIRED state UI since we auto-redirect to /options */}
                    </>
                )}
            </motion.div>

            {/* Pairing Success Popup */}
            <AnimatePresence>
                {showPairedPopup && roomStatus?.status === 'PAIRED' && (
                    <PopUp
                        setShowPairedPopup={setShowPairedPopup}
                        roomStatus={{ partner: roomStatus.partner }}
                    />
                )}
            </AnimatePresence>

            {/* Bear Character */}
            <motion.img
                src="/assets/Home/bear.png"
                alt="Bear"
                className="bear-character"
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 100, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.8 }}
            />

            <button
                onClick={logout}
                className="sign-out-button"
            >
                Sign Out
            </button>
        </div>
    );
}
