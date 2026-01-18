import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface StartProps {
    onStart?: () => void;
}

/**
 * Start Button Component - Handles the transition to Google Auth
 * Can be reused anywhere a login/start action is needed.
 */
export function Start({ onStart }: StartProps) {
    const { user, login } = useAuth();
    const navigate = useNavigate();

    const handleAction = async () => {
        try {
            if (onStart) onStart();

            if (user) {
                // If already logged in, just go to success page
                navigate('/Home');
            } else {
                // Otherwise, start the OAuth flow
                await login();
            }
        } catch (err: any) {
            console.error('Action failed:', err.message);
            alert('Action failed');
        }
    };

    return (
        <motion.button
            onClick={handleAction}
            className="landing-button"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
        >
            Start
        </motion.button>
    );
}
