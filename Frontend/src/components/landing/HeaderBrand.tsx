/**
 * Header brand component with logo and app name.
 */
export function HeaderBrand() {
    return (
        <div className="flex items-center gap-2 z-20">
            <img
                src="/assets/icons/logo.png"
                alt="3P-Doodle Logo"
                className="landing-header__logo w-12 h-12 cursor-pointer"
            />
            <span
                className="landing-header__brand font-medium font-serif tracking-wide"
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
