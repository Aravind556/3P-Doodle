import { motion } from 'framer-motion';

interface HeroProps {
    onStart: () => void;
}

/**
 * Hero section with main title and Start CTA button.
 * Has translateZ depth for 3D parallax effect.
 */
export function Hero({ onStart }: HeroProps) {
    return (
        <div
            className="relative z-20 flex flex-col items-start gap-8 md:gap-12"
            style={{
                transform: 'translateZ(20px)',
            }}
        >
            {/* Main Title */}
            <motion.h1
                className="text-4xl md:text-5xl lg:text-6xl font-serif leading-tight max-w-md"
                style={{
                    fontFamily: 'var(--font-serif)',
                    color: 'var(--color-bone)',
                }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
            >
                Playground for Pencils and People
            </motion.h1>

            {/* Start Button */}
            <motion.button
                onClick={onStart}
                className="px-8 py-2 text-lg cursor-pointer border-2 border-gray-700 
                   focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2
                   focus:ring-offset-[#722F37] transition-transform"
                style={{
                    backgroundColor: 'var(--color-button-gray)',
                    fontFamily: 'monospace',
                }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                aria-label="Start the doodle experience"
            >
                Start
            </motion.button>
        </div>
    );
}
