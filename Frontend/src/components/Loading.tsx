import React from 'react';

export const Loading: React.FC = () => {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#2d1b21] select-none">
            <div className="relative group pointer-events-none">
                {/* Premium glow effect - Optimized */}
                <div
                    className="absolute inset-[-20px] rounded-full animate-pulse"
                    style={{
                        background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%)',
                    }}
                ></div>

                {/* Rotating Rabbit Icon */}
                <div className="relative">
                    <img
                        src="/assets/icons/Rabbit-removebg-preview.png"
                        alt="Loading..."
                        draggable={false}
                        className="w-32 h-32 object-contain animate-spin will-change-transform"
                        style={{ animationDuration: '3s' }}
                    />
                </div>
            </div>

            {/* Loading Text */}
            <p className="mt-8 text-[#e6d5c3] font-serif text-xl tracking-widest animate-pulse opacity-90 uppercase select-text cursor-text">
                Loading...
            </p>
        </div>
    );
};
