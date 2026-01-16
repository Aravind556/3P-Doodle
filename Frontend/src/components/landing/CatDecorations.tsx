import { motion } from 'framer-motion';

/**
 * Cat decorations component.
 * Renders the playful cat illustrations with their respective animations
 * and hover effects.
 */
export function CatDecorations() {
    const hoverScale = 1.15;
    const hoverTransition = { type: 'spring', stiffness: 300, damping: 75 } as const;

    return (
        <>
            <motion.img
                src="/assets/cats/cat-top.png"
                alt="Cat Top"
                aria-hidden="true"
                draggable="false"
                className="cat-decoration cat-top"
                initial={{ x: 200, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                whileHover={{ scale: hoverScale }}
                transition={{
                    duration: 2.0,
                    delay: 0.3,
                    ease: 'easeOut',
                    scale: hoverTransition
                }}
            />

            <motion.img
                src="/assets/cats/cat-mid.png"
                alt="Cat Mid"
                aria-hidden="true"
                draggable="false"
                className="cat-decoration cat-mid"
                initial={{ x: 200, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                whileHover={{ scale: hoverScale }}
                transition={{
                    duration: 2.2,
                    delay: 0.6,
                    ease: 'easeOut',
                    scale: hoverTransition
                }}
            />

            <motion.img
                src="/assets/cats/cat-bottom.png"
                alt="Cat Bottom"
                aria-hidden="true"
                draggable="false"
                className="cat-decoration cat-bottom"
                initial={{ y: 250, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                whileHover={{ scale: hoverScale }}
                transition={{
                    duration: 2.4,
                    delay: 0.9,
                    ease: 'easeOut',
                    scale: hoverTransition
                }}
            />
        </>
    );
}
