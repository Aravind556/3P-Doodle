import { motion } from 'framer-motion';
import { useParallaxTilt } from '../../hooks/useParallaxTilt';
import { HeaderBrand } from './HeaderBrand';
import { Hero } from './Hero';
import { CatDecorations } from './CatDecorations';

interface LandingCardProps {
    onStart: () => void;
}

/**
 * Main landing card with 3D parallax tilt effect.
 * Contains all visual elements with depth layering.
 */
export function LandingCard({ onStart }: LandingCardProps) {
    const { rotateX, rotateY, handleMouseMove, handleMouseLeave } = useParallaxTilt(5);

    return (
        // Perspective wrapper for 3D effect
        <div className="perspective-1200 w-full max-w-5xl mx-4">
            <motion.div
                className="relative preserve-3d w-full rounded-lg overflow-hidden"
                style={{
                    backgroundColor: 'var(--color-card-maroon)',
                    rotateX,
                    rotateY,
                    // Aspect ratio similar to reference
                    aspectRatio: '16 / 9',
                }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                {/* Inner content with padding */}
                <div className="relative w-full h-full p-6 md:p-10 lg:p-12 preserve-3d">
                    {/* Header Brand - Top Left */}
                    <div
                        className="absolute top-6 left-6 md:top-10 md:left-10 z-20"
                        style={{ transform: 'translateZ(25px)' }}
                    >
                        <HeaderBrand />
                    </div>

                    {/* Hero Content - Left Side */}
                    <div className="flex items-center h-full pt-16 md:pt-20">
                        <div className="w-full md:w-1/2 lg:w-2/5">
                            <Hero onStart={onStart} />
                        </div>
                    </div>

                    {/* Paper texture decoration - Bottom Left */}
                    <motion.div
                        className="absolute -bottom-2 -left-2 w-40 md:w-48 lg:w-56 z-10 pointer-events-none"
                        style={{
                            transform: 'translateZ(15px)',
                            filter: 'drop-shadow(2px 4px 8px rgba(0, 0, 0, 0.3))',
                        }}
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 1.5, delay: 0.3, ease: 'easeOut' }}
                        aria-hidden="true"
                    >
                        <img
                            src="/assets/decor/paper-left.png"
                            alt=""
                            className="w-full h-auto object-contain"
                        />
                    </motion.div>

                    {/* Cat Decorations - Right Side */}
                    <CatDecorations />
                </div>

                {/* Subtle inner shadow for depth */}
                <div
                    className="absolute inset-0 pointer-events-none z-40"
                    style={{
                        boxShadow: 'inset 0 0 60px rgba(0, 0, 0, 0.15)',
                        borderRadius: 'inherit',
                    }}
                />
            </motion.div>
        </div>
    );
}
