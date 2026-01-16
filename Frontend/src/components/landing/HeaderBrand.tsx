import { motion } from 'framer-motion';
import { useState } from 'react';

/**
 * Header brand component with logo and app name.
 * Logo rotates 360° on hover.
 */
export function HeaderBrand() {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div className="flex items-center gap-2 z-20">
            <motion.img
                src="/assets/icons/logo.png"
                alt="3P-Doodle Logo"
                className="w-12 h-12 cursor-pointer"
                animate={{ rotate: isHovered ? 360 : 0 }}
                transition={{
                    duration: 0.8,
                    ease: 'easeInOut',
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onAnimationComplete={() => {
                    // Reset rotation after animation completes
                    if (isHovered) setIsHovered(false);
                }}
            />
            <span
                className="text-3xl font-bold font-serif tracking-wide"
                style={{
                    fontFamily: 'var(--font-serif)',
                    color: 'var(--color-bone)',
                    fontVariantNumeric: 'lining-nums'
                }}
            >
                3P-Doodle
            </span>
        </div>
    );
}
