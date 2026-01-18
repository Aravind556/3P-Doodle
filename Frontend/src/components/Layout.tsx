import { motion } from 'framer-motion';
import { HeaderBrand } from './landing/HeaderBrand';
import { CatDecorations } from './landing/CatDecorations';
import { useAuth } from '../context/AuthContext';
import '../pages/LandingPage.css';

interface LayoutProps {
    children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
    const { user, logout } = useAuth();

    return (
        <div style={{ perspective: '1500px', width: '100%', minHeight: '100vh' }}>
            <motion.main className="landing-page">
                {/* ========== HEADER ========== */}
                <motion.header
                    className="landing-header"
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                >
                    <HeaderBrand />
                    {user && (
                        <button
                            onClick={logout}
                            className="logout-button-mini"
                        >
                            Logout
                        </button>
                    )}
                </motion.header>

                {/* ========== MAIN CONTENT ========== */}
                {children}

                {/* ========== DECORATIONS ========== */}
                <CatDecorations />

                <motion.img
                    src="/assets/decor/paper-left.png"
                    className="paper-decoration"
                    initial={{ opacity: 0, x: -100, y: 80 }}
                    animate={{ opacity: 1, x: 0, y: 0 }}
                    transition={{ duration: 1.8, delay: 0.5 }}
                    draggable={false}
                />
            </motion.main>
        </div>
    );
}
