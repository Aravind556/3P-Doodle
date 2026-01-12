import { motion, type Variants } from 'framer-motion';

/**
 * Cat decoration positions and animation configurations.
 * Each cat has unique entrance animation and breathing float.
 */
const catConfig = [
    {
        id: 'cat-top',
        src: '/assets/cats/cat-top.png',
        alt: 'Decorative cat with floral wreath',
        // Position: top-right corner, peeping from edge
        className: 'absolute -top-4 -right-1 w-48 md:w-56 lg:w-64',
        depth: 60, // Higher translateZ for more pop-out effect
        initial: { x: 60, y: -60, rotate: -10, opacity: 0 },
        final: { x: 0, y: 0, rotate: -2, opacity: 1 },
        duration: 2.2,
        delay: 0.2,
    },
    {
        id: 'cat-mid',
        src: '/assets/cats/cat-mid.png',
        alt: 'Decorative cat with headscarf',
        // Position: bottom middle-right
        className: 'absolute bottom-8 right-24 md:right-32 lg:right-40 w-40 md:w-48 lg:w-56',
        depth: 50, // Medium depth
        initial: { x: 0, y: 70, rotate: 0, opacity: 0 },
        final: { x: 0, y: 0, rotate: 0, opacity: 1 },
        duration: 2.5,
        delay: 0.55,
    },
    {
        id: 'cat-bottom',
        src: '/assets/cats/cat-bottom.png',
        alt: 'Decorative cat with strawberry scarf',
        // Position: bottom-right corner
        className: 'absolute -bottom-4 -right-4 w-44 md:w-52 lg:w-60',
        depth: 55, // High depth for layered effect
        initial: { x: 70, y: 0, rotate: 0, opacity: 0 },
        final: { x: 0, y: 0, rotate: 0, opacity: 1 },
        duration: 2.7,
        delay: 0.85,
    },
];

/**
 * Breathing float animation for after entrance.
 * Subtle up-down movement.
 */
const breathingFloat: Variants = {
    float: {
        y: [0, -6, 0],
        transition: {
            duration: 5,
            repeat: Infinity,
            ease: 'easeInOut',
        },
    },
};

/**
 * Cat decorations component.
 * Positions cats absolutely with staggered entrance animations
 * and 3D depth effect using translateZ.
 */
export function CatDecorations() {
    return (
        <>
            {catConfig.map((cat) => (
                <motion.div
                    key={cat.id}
                    className={`${cat.className} z-30 pointer-events-none`}
                    style={{
                        // 3D depth layering - cats pop out from the card
                        transform: `translateZ(${cat.depth}px)`,
                        // Preserve 3D for nested transforms
                        transformStyle: 'preserve-3d',
                        // Add drop shadow for extra depth perception
                        filter: `drop-shadow(0 ${cat.depth / 4}px ${cat.depth / 2}px rgba(0, 0, 0, 0.4))`,
                    }}
                    initial={{
                        x: cat.initial.x,
                        y: cat.initial.y,
                        rotate: cat.initial.rotate,
                        opacity: cat.initial.opacity,
                    }}
                    animate={{
                        x: cat.final.x,
                        y: cat.final.y,
                        rotate: cat.final.rotate,
                        opacity: cat.final.opacity,
                    }}
                    transition={{
                        duration: cat.duration,
                        delay: cat.delay,
                        ease: 'easeOut',
                    }}
                    aria-hidden="true"
                >
                    <motion.img
                        src={cat.src}
                        alt={cat.alt}
                        className="w-full h-auto object-contain"
                        variants={breathingFloat}
                        animate="float"
                        // Delay breathing until entrance is complete
                        transition={{
                            delay: cat.delay + cat.duration,
                        }}
                    />
                </motion.div>
            ))}
        </>
    );
}
