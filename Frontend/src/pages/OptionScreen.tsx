import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './OptionScreen.css';
import './HomePage.css';
import { Loading } from '../components/Loading';

export function OptionScreen() {
    const navigate = useNavigate();
    const { logout, user, session } = useAuth();

    const [partnerName, setPartnerName] = useState<string>('');
    const [menuOpen, setMenuOpen] = useState<boolean>(false);
    const [showUserName, setShowUserName] = useState<boolean>(false);
    const [showPartnerName, setShowPartnerName] = useState<boolean>(false);

    // Loading states
    const [imagesLoaded, setImagesLoaded] = useState(false);
    const apiUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8080';

    const myName = useMemo(() => {
        const meta: any = user?.user_metadata || {};
        return (
            meta.full_name ||
            meta.name ||
            (user?.email ? user.email.split('@')[0] : '') ||
            'You'
        );
    }, [user]);

    // Preload images
    useEffect(() => {
        const imageUrls = [
            '/assets/optional_page/bluebg.png',
            '/assets/optional_page/yellowbut.png',
            '/assets/optional_page/greenbut.png',
            '/assets/optional_page/redbut.png',
            '/assets/optional_page/whitecat.png',
            '/assets/optional_page/blackcat.png'
        ];

        let loadedCount = 0;
        const total = imageUrls.length;

        const handleImageLoad = () => {
            loadedCount++;
            if (loadedCount >= total) {
                setImagesLoaded(true);
            }
        };

        imageUrls.forEach(url => {
            const img = new Image();
            img.src = url;
            img.onload = handleImageLoad;
            img.onerror = handleImageLoad;
        });
    }, []);

    useEffect(() => {
        let interval: number | undefined;
        let attempts = 0;

        const fetchStatus = async () => {
            if (!session) return;
            try {
                const res = await fetch(`${apiUrl}/room/status`, {
                    headers: { Authorization: `Bearer ${session.access_token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === 'PAIRED') {
                        if (data.partner) setPartnerName(data.partner);
                        // Stop polling once we have partner value
                        if (data.partner) {
                            if (interval) window.clearInterval(interval);
                        }
                    } else if (res.status === 401) {
                        // Session expired or missing; stop polling and surface via logout
                        if (interval) window.clearInterval(interval);
                        await logout();
                    }
                }
            } catch (e) {
                // ignore
            } finally {
                attempts++;
                if (attempts >= 10 && interval) {
                    // Stop after ~30s (10 * 3s)
                    window.clearInterval(interval);
                }
            }
        };

        // Initial fetch
        fetchStatus();
        // Poll every 3s until partner data is available (or timeout)
        interval = window.setInterval(fetchStatus, 3000);

        return () => {
            if (interval) window.clearInterval(interval);
        };
    }, [session, apiUrl]);

    const breakLink = async () => {
        if (!session) return;
        try {
            const res = await fetch(`${apiUrl}/room/leave`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (res.ok) {
                navigate('/Home');
            }
        } catch (e) {
            // ignore
        }
    };

    const handleMenuItemClick = (action: 'logout' | 'breaklink') => {
        setMenuOpen(false);
        if (action === 'logout') {
            logout();
        } else if (action === 'breaklink') {
            breakLink();
        }
    };

    if (!imagesLoaded) {
        return <Loading />;
    }

    return (
        <div className="option-screen-container">
            <div className="top-right-buttons">
                <motion.img
                    src="/assets/optional_page/yellowbut.png"
                    alt="user button"
                    className="top-button yellow-btn"
                    onClick={() => setShowUserName(!showUserName)}
                />
                {showUserName && (
                    <motion.div
                        className="name-tooltip user-tooltip"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {myName}
                    </motion.div>
                )}
                <motion.img
                    src="/assets/optional_page/greenbut.png"
                    alt="partner button"
                    className="top-button green-btn"
                    onClick={() => setShowPartnerName(!showPartnerName)}
                />
                {showPartnerName && (
                    <motion.div
                        className="name-tooltip partner-tooltip"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {partnerName || 'Partner'}
                    </motion.div>
                )}
            </div>
            <motion.div
                className="top-left-section"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
            >
                <motion.h2
                    className="mode-title"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                >
                    Playground Space
                </motion.h2>
                <motion.p
                    className="mode-description"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                >
                    Free drawing <br /> with your Doodlemates
                </motion.p>
                <motion.button
                    className="lets-doodle-btn"
                    onClick={() => navigate('/playground')}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    Let's Doodle
                </motion.button>
            </motion.div>
            <motion.div
                className="top-right-section"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
            >
                <motion.h2
                    className="mode-title"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                >
                    Make your <br /> own Stencil
                </motion.h2>
                <motion.p
                    className="mode-description"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                >
                    create custom <br /> templates together
                </motion.p>
                <motion.button
                    className="lets-doodle-btn"
                    onClick={() => navigate('/stencil')}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    Let's Doodle
                </motion.button>
            </motion.div>
            <motion.img
                src="/assets/optional_page/redbut.png"
                alt="menu button"
                className="corner-decoration"
                onClick={() => setMenuOpen(!menuOpen)}
            />
            {menuOpen && (
                <motion.div
                    className="corner-menu"
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 10 }}
                    transition={{ duration: 0.2 }}
                >
                    <button
                        className="menu-item"
                        onClick={() => handleMenuItemClick('logout')}
                    >
                        Sign Out
                    </button>
                    <button
                        className="menu-item"
                        onClick={() => handleMenuItemClick('breaklink')}
                    >
                        Break Link
                    </button>
                </motion.div>
            )}
            <motion.div
                className="cat-left white-cat"
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
            >
                <img src="/assets/optional_page/whitecat.png" alt="white cat" />
            </motion.div>
            <motion.div
                className="cat-right black-cat"
                initial={{ opacity: 0, y: -100 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                style={{ transform: 'scale(0.5) scaleX(-1)' }}
            >
                <img src="/assets/optional_page/blackcat.png" alt="black cat" />
            </motion.div>
        </div>
    );
}
