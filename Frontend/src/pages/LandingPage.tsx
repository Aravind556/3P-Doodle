import { motion } from 'framer-motion';
import { HeaderBrand } from '../components/landing/HeaderBrand';
import { Hero } from '../components/landing/Hero';
import { CatDecorations } from '../components/landing/CatDecorations';
import './LandingPage.css';

/**
 * Landing page - First impression of 3P-Doodle.
 * Full-screen maroon page with playful cat illustrations.
 * Uses components for organized and maintainable code.
 */
export function LandingPage() {

    const handleStart = () => {
        window.location.href = 'https://findtheinvisiblecow.com/';
    };

    return (
        <div style={{ perspective: '1500px', width: '100%', minHeight: '100vh' }}>
            <motion.main className="landing-page">
                {/* ========== HEADER ========== */}
                <motion.header
                    className="landing-header"
                    initial={{ y: -100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 1.5, ease: 'easeOut', delay: 0.1 }}
                >
                    <HeaderBrand />
                </motion.header>

                {/* ========== HERO CONTENT ========== */}
                <Hero onStart={handleStart} />

                {/* ========== CAT ILLUSTRATIONS ========== */}
                <CatDecorations />

                {/* ========== PAPER DECORATION ========== */}
                <motion.img
                    src="/assets/decor/paper-left.png"
                    alt=""
                    aria-hidden="true"
                    draggable="false"
                    className="paper-decoration"
                    initial={{ opacity: 0, x: -100, y: 80 }}
                    animate={{ opacity: 1, x: 0, y: 0 }}
                    transition={{ duration: 1.8, delay: 0.5, ease: 'easeOut' }}
                />
            </motion.main>
        </div>
    );
}
