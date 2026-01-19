import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import './HomePage.css';

export function AuthSuccess() {
    const { session, logout } = useAuth();
    const [apiResponse, setApiResponse] = useState<string>('Connecting...');

    useEffect(() => {
        if (session) {
            fetchBackendData(session.access_token);
        }
    }, [session]);

    const fetchBackendData = async (token: string) => {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
        try {
            const res = await fetch(`${apiUrl}/Home/`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const text = await res.text();
            setApiResponse(res.ok ? text : `Error: ${res.status}`);
        } catch (err) {
            setApiResponse(err instanceof Error ? err.message : String(err));
        }
    };

    return (
        <div className="home-page-container">
            {/* Background layers */}
            <img src="/assets/Home/Left.png" alt="" className="patchwork-left" />
            <img src="/assets/Home/right-top.png" alt="" className="patchwork-right-top" />
            <img src="/assets/Home/right-bottom.png" alt="" className="patchwork-right-bottom" />

            {/* Central Panel */}
            <motion.div
                className="central-panel"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, ease: "easeOut" }}
            >
                <div className="central-panel-text">
                    <div className="line-1">Playground space</div>
                    <div className="line-2">Make your own stencil</div>
                </div>

                {/* Subtle Backend Status indicator */}
                <div className="backend-status-hint">
                    {apiResponse}
                </div>
            </motion.div>

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
