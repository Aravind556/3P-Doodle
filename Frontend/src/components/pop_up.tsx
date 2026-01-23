import React from 'react';
import { motion } from 'framer-motion';
import './PopUp.css';

interface PopUpProps {
    setShowPairedPopup: (show: boolean) => void;
    roomStatus: {
        partner?: string;
    };
}

export const PopUp: React.FC<PopUpProps> = ({ setShowPairedPopup, roomStatus }) => {
    return (
        <motion.div
            className="pairing-popup-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowPairedPopup(false)}
        >
            <motion.div
                className="pairing-popup-card"
                initial={{ scale: 0.8, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="popup-visuals-container">
                    <div className="visual-glow" />
                    <motion.img
                        src="/assets/PopUp/_1__Instagram-removebg-preview 1.png"
                        alt="Black Cat"
                        className="visual-element cat-black"
                        initial={{ x: "-100%", opacity: 0 }}
                        animate={{ x: "-50%", opacity: 1 }}
                        transition={{
                            duration: 2.5,
                            ease: "easeOut",
                            delay: 0.2
                        }}
                    />
                    <img
                        src="/assets/PopUp/By_illustrator_Selwyn_Lee__Babushcats_-removebg-preview 2.png"
                        alt="White Cat"
                        className="visual-element cat-white"
                    />
                    <img
                        src="/assets/PopUp/_moodboardpngs___png_collection-removebg-preview 1.png"
                        alt="Palette"
                        className="visual-element palette"
                    />
                    <img
                        src="/assets/PopUp/ˏˋ___⁀_elisha-removebg-preview 1.png"
                        alt="Chalk Box"
                        className="visual-element chalk-box"
                    />
                </div>

                <h2>
                    You're Doodlemates!
                </h2>

                <p className="popup-message">
                    You and <strong>{roomStatus.partner || 'your friend'}</strong> are now connected
                </p>

                <button
                    className="lets-doodle-btn"
                    onClick={() => setShowPairedPopup(false)}
                >
                    Let's Doodle
                </button>
            </motion.div>
        </motion.div>
    );
};