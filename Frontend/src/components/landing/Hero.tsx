import { motion } from 'framer-motion';

interface HeroProps {
    onStart: () => void;
}

/**
 * Hero section with main title and Start CTA button.
 */
export function Hero({ onStart }: HeroProps) {
    return (
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
                onClick={onStart}
                className="landing-button"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 1.0 }}
            >
                Start
            </motion.button>
        </div>
    );
}
