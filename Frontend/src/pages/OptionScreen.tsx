import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './OptionScreen.css';
import './HomePage.css'; // For sign-out button styles

export function OptionScreen() {
    const navigate = useNavigate();
    const { logout, user, session } = useAuth();

    const [partnerName, setPartnerName] = useState<string>('');
    const [partnerEmail, setPartnerEmail] = useState<string>('');
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
                        if (data.partnerEmail) setPartnerEmail(data.partnerEmail);
                        // Stop polling once we have both values
                        if (data.partner && data.partnerEmail) {
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

    return (
        <div className="option-screen-container">
            <div className="top-right-controls">
                <span className="name-badge you" title={user?.email || ''}>{myName}</span>
                <span className="name-badge partner" title={partnerEmail || ''}>{partnerName || 'Partner'}</span>
                <button onClick={logout} className="sign-out-button">Sign Out</button>
            </div>
            <motion.div
                className="option-panel"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
            >
                <h1 className="option-title">Choose Your Mode</h1>
                
                <div className="option-cards">
                    <motion.div
                        className="option-card playground"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate('/playground')}
                    >
                        <div className="option-icon">🎨</div>
                        <h2>Playground Space</h2>
                        <p>Free drawing with your doodlemate</p>
                    </motion.div>

                    <motion.div
                        className="option-card stencil"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate('/stencil')}
                    >
                        <div className="option-icon">📝</div>
                        <h2>Make Your Own Stencil</h2>
                        <p>Create custom templates together</p>
                    </motion.div>
                </div>

                <button className="break-link-btn" onClick={breakLink}>
                    Break Link & Return Home
                </button>
            </motion.div>
        </div>
    );
}
