import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Layout } from '../components/Layout';
import './LandingPage.css';

export function AuthSuccess() {
    const { session, logout } = useAuth();
    const [apiResponse, setApiResponse] = useState<string>('Connecting to backend...');

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
            setApiResponse('Failed to connect to backend.');
        }
    };

    return (
        <Layout>
            <motion.div
                className="landing-content"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
            >
                <h2>Authentication Successful</h2>
                <div className="backend-response" style={{ margin: '20px 0', padding: '15px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                    <strong>Backend Message:</strong> {apiResponse}
                </div>

                <p>You have successfully authenticated with Google.</p>

                <motion.button
                    onClick={logout}
                    className="landing-button"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    Sign Out
                </motion.button>
            </motion.div>
        </Layout>
    );
}
