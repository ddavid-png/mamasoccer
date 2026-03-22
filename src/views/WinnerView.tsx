export const WinnerView = () => {
    return (
        <div style={{
            minHeight: '100vh', width: '100vw',
            background: '#0a0a0a',
            color: 'white',
            fontFamily: 'Outfit, sans-serif',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', position: 'relative',
            textAlign: 'center',
        }}>
            <style>{`
                @keyframes pulse-glow {
                    0%, 100% { text-shadow: 0 0 40px #FFFF00, 0 0 80px #FFFF00aa, 0 0 120px #FFFF0066; }
                    50%       { text-shadow: 0 0 80px #FFFF00, 0 0 160px #FFFF00cc, 0 0 200px #FFFF0099; }
                }
                @keyframes float-up {
                    0%   { transform: translateY(100vh) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(-120px) rotate(720deg); opacity: 0; }
                }
                @keyframes logo-bounce {
                    0%, 100% { transform: scale(1) rotate(-2deg); }
                    50%       { transform: scale(1.08) rotate(2deg); }
                }
                @keyframes trophy-shake {
                    0%, 100% { transform: rotate(-6deg) scale(1); }
                    25%       { transform: rotate(6deg) scale(1.1); }
                    50%       { transform: rotate(-4deg) scale(1); }
                    75%       { transform: rotate(4deg) scale(1.05); }
                }
                @keyframes slide-up {
                    0%   { transform: translateY(60px); opacity: 0; }
                    100% { transform: translateY(0); opacity: 1; }
                }
                .winner-name {
                    animation: pulse-glow 2s ease-in-out infinite;
                }
                .logo-anim {
                    animation: logo-bounce 3s ease-in-out infinite;
                }
                .trophy-anim {
                    animation: trophy-shake 1.2s ease-in-out infinite;
                    display: inline-block;
                }
                .slide-in-1 { animation: slide-up 0.6s ease-out 0.1s both; }
                .slide-in-2 { animation: slide-up 0.6s ease-out 0.3s both; }
                .slide-in-3 { animation: slide-up 0.6s ease-out 0.5s both; }
                .slide-in-4 { animation: slide-up 0.6s ease-out 0.7s both; }
                .confetti-piece {
                    position: absolute;
                    width: 12px; height: 12px;
                    border-radius: 2px;
                    animation: float-up linear infinite;
                }
            `}</style>

            {/* Confetti pieces */}
            {[
                { left:'5%',  delay:'0s',   dur:'3.2s', color:'#FFFF00', size:14 },
                { left:'12%', delay:'0.4s', dur:'2.8s', color:'#FF0066', size:10 },
                { left:'20%', delay:'1.1s', dur:'3.5s', color:'#00cfff', size:16 },
                { left:'30%', delay:'0.7s', dur:'2.6s', color:'#FFFF00', size:12 },
                { left:'40%', delay:'1.5s', dur:'3.1s', color:'#FF0066', size:8  },
                { left:'50%', delay:'0.2s', dur:'2.9s', color:'#FFFF00', size:14 },
                { left:'60%', delay:'1.0s', dur:'3.3s', color:'#00cfff', size:10 },
                { left:'70%', delay:'0.6s', dur:'2.7s', color:'#FF0066', size:16 },
                { left:'80%', delay:'1.3s', dur:'3.0s', color:'#FFFF00', size:12 },
                { left:'88%', delay:'0.9s', dur:'2.5s', color:'#FF0066', size:8  },
                { left:'95%', delay:'0.3s', dur:'3.4s', color:'#00cfff', size:14 },
                { left:'25%', delay:'1.8s', dur:'3.0s', color:'#FFFF00', size:10 },
                { left:'55%', delay:'2.0s', dur:'2.8s', color:'#FF0066', size:12 },
                { left:'75%', delay:'2.2s', dur:'3.2s', color:'#FFFF00', size:8  },
            ].map((c, i) => (
                <div key={i} className="confetti-piece" style={{
                    left: c.left, bottom: '-20px',
                    animationDelay: c.delay, animationDuration: c.dur,
                    background: c.color, width: c.size, height: c.size,
                }} />
            ))}

            {/* Background glow */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(ellipse at center, #FFFF0015 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />

            {/* Logo */}
            <div className="logo-anim slide-in-1" style={{ marginBottom: 28 }}>
                <img
                    src="/LISBOA CMYK.png"
                    alt="Mama Lisboa"
                    style={{ width: 110, height: 110, borderRadius: '50%', objectFit: 'contain' }}
                />
            </div>

            {/* Title */}
            <div className="slide-in-2" style={{
                fontSize: '1.75rem', fontWeight: 900,
                textTransform: 'uppercase', letterSpacing: '0.2em',
                color: '#6b7280', marginBottom: 20,
            }}>
                Mama Lisboa · <span style={{ color: '#FFFF00' }}>Foosball</span> Tournament
            </div>

            {/* Trophy */}
            <div className="slide-in-3" style={{ fontSize: '8rem', lineHeight: 1, marginBottom: 20 }}>
                <span className="trophy-anim">🏆</span>
            </div>

            {/* WINNERS label */}
            <div className="slide-in-3" style={{
                fontSize: '2rem', fontWeight: 900,
                textTransform: 'uppercase', letterSpacing: '0.35em',
                color: '#ffffff99', marginBottom: 28,
            }}>
                Tournament Winners
            </div>

            {/* TEAM NAME — the big one */}
            <div className="winner-name slide-in-4" style={{
                fontSize: 'clamp(3rem, 10vw, 7rem)',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#FFFF00',
                lineHeight: 1,
                padding: '0 24px',
                marginBottom: 32,
            }}>
                Os Moconheiros
            </div>

            {/* Yellow divider */}
            <div className="slide-in-4" style={{
                width: 120, height: 4, background: '#FFFF00', marginBottom: 20,
            }} />

            {/* Subtitle */}
            <div className="slide-in-4" style={{
                fontSize: '0.85rem', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.2em',
                color: '#6b7280',
            }}>
                🎉 Congratulations 🎉
            </div>

            {/* Back button (small, bottom) */}
            <a href="/tv" style={{
                position: 'absolute', bottom: 24, right: 24,
                color: '#374151', fontSize: '0.7rem', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.1em',
                textDecoration: 'none',
            }}>
                ← Back to TV
            </a>
        </div>
    );
};
