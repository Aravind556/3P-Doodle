import React, { memo } from 'react';

export const HomeBackground = memo(() => {
    return (
        <>
            <img
                src="/assets/Home/Left.png"
                alt=""
                className="patchwork-left"
                style={{ willChange: 'transform' }}
            />
            <div className="patchwork-right">
                <img src="/assets/Home/right-top.png" alt="" className="patchwork-right-top" />
                <img src="/assets/Home/right-bottom.png" alt="" className="patchwork-right-bottom" />
            </div>
        </>
    );
});

export const OptionBackground = memo(() => {
    return (
        <div
            className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat bg-fixed pointer-events-none"
            style={{
                backgroundImage: "url('/assets/optional_page/bluebg.png')",
                willChange: 'transform'
            }}
        />
    );
});
