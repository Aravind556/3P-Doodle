import React from 'react';

export const Loading: React.FC = () => {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#722F37]/30 backdrop-blur-md select-none">
            <div className="relative group pointer-events-none">
                {/* Premium glow effect */}
                <div className="absolute inset-[-20px] bg-white/10 blur-3xl rounded-full animate-pulse"></div>

                {/* Rotating Rabbit Icon */}
                <div className="relative">
                    <img
                        src="/assets/icons/Rabbit-removebg-preview.png"
                        alt="Loading..."
                        draggable={false}
                        className="w-32 h-32 object-contain animate-spin"
                        style={{ animationDuration: '4s' }}
                    />
                </div>
            </div>

            {/* Loading Text */}
            <p className="mt-8 text-white font-serif text-xl tracking-widest animate-pulse opacity-80 uppercase select-text cursor-text">
                Loading...
            </p>
        </div>
    );
};
