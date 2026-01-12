import { useMotionValue, useSpring, MotionValue } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';

interface ParallaxTiltResult {
    rotateX: MotionValue<number>;
    rotateY: MotionValue<number>;
    handleMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
    handleMouseLeave: () => void;
}

/**
 * Custom hook for 3D parallax tilt effect based on mouse position.
 * Respects prefers-reduced-motion setting.
 * 
 * @param maxTilt - Maximum tilt angle in degrees (default: 5)
 * @returns Object with motion values and event handlers
 */
export function useParallaxTilt(maxTilt: number = 5): ParallaxTiltResult {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    // Check for reduced motion preference
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReducedMotion(mediaQuery.matches);

        const handleChange = (e: MediaQueryListEvent) => {
            setPrefersReducedMotion(e.matches);
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    // Raw motion values for rotation
    const rotateXValue = useMotionValue(0);
    const rotateYValue = useMotionValue(0);

    // Spring physics for smooth, natural feel
    const springConfig = { stiffness: 150, damping: 20 };
    const rotateX = useSpring(rotateXValue, springConfig);
    const rotateY = useSpring(rotateYValue, springConfig);

    const handleMouseMove = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (prefersReducedMotion) return;

            const rect = e.currentTarget.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            // Calculate normalized position from center (-1 to 1)
            const normalizedX = (e.clientX - centerX) / (rect.width / 2);
            const normalizedY = (e.clientY - centerY) / (rect.height / 2);

            // Apply tilt (inverted for natural feel)
            // RotateX is based on Y position (top tilts back, bottom tilts forward)
            // RotateY is based on X position (left tilts left, right tilts right)
            rotateXValue.set(-normalizedY * maxTilt);
            rotateYValue.set(normalizedX * maxTilt);
        },
        [maxTilt, prefersReducedMotion, rotateXValue, rotateYValue]
    );

    const handleMouseLeave = useCallback(() => {
        // Return to neutral position
        rotateXValue.set(0);
        rotateYValue.set(0);
    }, [rotateXValue, rotateYValue]);

    return {
        rotateX,
        rotateY,
        handleMouseMove,
        handleMouseLeave,
    };
}
