import { motion } from 'framer-motion';
import { useState } from 'react';
import './LandingPage.css';

/**
 * Landing page - First impression of 3P-Doodle.
 * Full-screen maroon page with playful cat illustrations.
 * Uses CSS classes for truly responsive design with media queries.
 */
export function LandingPage() {
    const [logoHovered, setLogoHovered] = useState(false);

    const handleStart = () => {
        window.location.href = 'https://google.com';
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
                    <motion.img
                        src="/assets/icons/logo.png"
                        alt="Logo"
                        className="landing-header__logo"
                        animate={{ rotate: logoHovered ? 360 : 0 }}
                        transition={{ duration: 0.8, ease: 'easeInOut' }}
                        onMouseEnter={() => setLogoHovered(true)}
                        onMouseLeave={() => setLogoHovered(false)}
                        onAnimationComplete={() => { if (logoHovered) setLogoHovered(false); }}
                    />
                    <span className="landing-header__brand">3P-Doodle</span>
                </motion.header>

                {/* ========== CONTENT AREA ========== */}
                <div className="landing-content">
                    {/* Title */}
                    <motion.div
                        className="landing-title-wrapper"
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                    >
                        <h1 className="landing-title">
                            Playground for<br />
                            Pencils and<br />
                            People
                        </h1>
                    </motion.div>

                    {/* Start Button */}
                    <motion.button
                        onClick={handleStart}
                        className="landing-button"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 1.0 }}
                    >
                        Start
                    </motion.button>
                </div>

                {/* ========== CAT ILLUSTRATIONS ========== */}
                <motion.img
                    src="/assets/cats/cat-top.png"
                    alt=""
                    aria-hidden="true"
                    className="cat-decoration cat-top"
                    initial={{ x: 200, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 2.0, delay: 0.3, ease: 'easeOut' }}
                />

                <motion.img
                    src="/assets/cats/cat-mid.png"
                    alt=""
                    aria-hidden="true"
                    className="cat-decoration cat-mid"
                    initial={{ x: 200, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 2.2, delay: 0.6, ease: 'easeOut' }}
                />

                <motion.img
                    src="/assets/cats/cat-bottom.png"
                    alt=""
                    aria-hidden="true"
                    className="cat-decoration cat-bottom"
                    initial={{ y: 250, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 2.4, delay: 0.9, ease: 'easeOut' }}
                />

                {/* ========== PAPER DECORATION ========== */}
                <motion.img
                    src="/assets/decor/paper-left.png"
                    alt=""
                    aria-hidden="true"
                    className="paper-decoration"
                    initial={{ opacity: 0, x: -100, y: 80 }}
                    animate={{ opacity: 1, x: 0, y: 0 }}
                    transition={{ duration: 1.8, delay: 0.5, ease: 'easeOut' }}
                />
            </motion.main>
        </div>
    );
}
