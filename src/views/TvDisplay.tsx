import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

export const TvDisplay = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const defaultService = urlParams.get('service') === '2' ? 2 : 1;

    const [serviceId, setServiceId] = useState(defaultService);
    const [teams, setTeams] = useState<any[]>([]);
    const [matches, setMatches] = useState<any[]>([]);
    const [timerState, setTimerState] = useState<any>(null);
    const [timeRemaining, setTimeRemaining] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    const serviceIdRef = useRef(serviceId);

    useEffect(() => {
        serviceIdRef.current = serviceId;
        fetchData(serviceId);
    }, [serviceId]);

    useEffect(() => {
        const dataChannel = supabase
            .channel('tv-data-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => fetchData(serviceIdRef.current))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => fetchData(serviceIdRef.current))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_state' }, () => fetchData(serviceIdRef.current))
            .subscribe();

        const controlChannel = supabase
            .channel('tv-control')
            .on('broadcast', { event: 'service-change' }, (payload: any) => {
                const newService = payload.payload?.serviceId;
                if (newService === 1 || newService === 2) setServiceId(newService);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(dataChannel);
            supabase.removeChannel(controlChannel);
        };
    }, []);

    const fetchData = async (sId: number) => {
        const { data: teamsData } = await supabase.from('teams').select('*').eq('service_id', sId);
        const { data: matchesData } = await supabase.from('matches').select('*, team1:team1_id(id,name), team2:team2_id(id,name)').eq('service_id', sId).order('match_number');
        const { data: stateData } = await supabase.from('tournament_state').select('*').eq('service_id', sId).single();

        if (teamsData) setTeams(teamsData);
        if (matchesData) setMatches(matchesData);
        if (stateData) setTimerState(stateData);
        setLoading(false);
    };

    useEffect(() => {
        if (!timerState || timerState.timer_status !== 'running' || !timerState.timer_ends_at) {
            setTimeRemaining(0);
            return;
        }
        const interval = setInterval(() => {
            const distance = new Date(timerState.timer_ends_at).getTime() - Date.now();
            if (distance < 0) { setTimeRemaining(0); clearInterval(interval); }
            else setTimeRemaining(Math.floor(distance / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, [timerState]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return m + ':' + (s < 10 ? '0' : '') + s;
    };

    const leaderboard = teams.map(team => {
        let goals = 0, wins = 0, played = 0;
        matches.forEach(m => {
            if (m.status !== 'completed') return;
            if (m.team1 && m.team1.id === team.id) { goals += m.team1_score; played++; if (m.team1_score > m.team2_score) wins++; }
            else if (m.team2 && m.team2.id === team.id) { goals += m.team2_score; played++; if (m.team2_score > m.team1_score) wins++; }
        });
        return { id: team.id, name: team.name, player1: team.player1, player2: team.player2, goals, wins, played };
    }).sort((a, b) => b.wins - a.wins || b.goals - a.goals);

    const activeMatch = matches.find(m => m.status === 'active');
    const completedCount = matches.filter(m => m.status === 'completed').length;

    const isRunning = timerState && timerState.timer_status === 'running' && timeRemaining > 0;
    const isWarning = isRunning && timeRemaining <= 30 && timeRemaining > 10;
    const isDanger = isRunning && timeRemaining <= 10;

    if (loading) return <div style={{ height: '100vh', background: '#1A1A1A' }} />;

    // Registration screen — only when no teams
    if (teams.length === 0) {
        return (
            <div style={{ height: '100vh', background: '#1A1A1A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'Outfit, sans-serif' }}>
                <img src="/LISBOA CMYK.png" alt="Mama Lisboa" style={{ width: 160, height: 160, borderRadius: '50%', objectFit: 'contain', marginBottom: 32 }} />
                <h1 style={{ fontSize: '6rem', fontWeight: 900, textTransform: 'uppercase', textAlign: 'center', lineHeight: 0.9, margin: '0 0 32px' }}>
                    <span style={{ background: '#FFFF00', color: 'black', padding: '0 16px' }}>Foosball</span><br />
                    Tournament
                </h1>
                <div style={{ background: 'white', padding: 16, marginBottom: 24 }}>
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://mamasoccer.vercel.app" alt="QR" width={200} height={200} />
                </div>
                <p style={{ fontSize: '2rem', color: '#FF0066', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Scan to Register Your Team</p>
            </div>
        );
    }

    // Border color for timer flash — CSS keyframe done via inline style + className
    const borderColor = isDanger ? '#FF0066' : isWarning ? '#FFFF00' : 'transparent';
    const timerColor = isDanger ? '#ef4444' : isWarning ? '#FFFF00' : '#39FF14';

    return (
        <div style={{ height: '100vh', background: '#1A1A1A', color: 'white', padding: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', fontFamily: 'Outfit, sans-serif', boxSizing: 'border-box' }}>

            {/* Timer border flash */}
            {(isDanger || isWarning) && (
                <div className={isDanger ? 'tv-border-danger' : 'tv-border-warning'} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, border: '16px solid ' + borderColor }} />
            )}

            {/* HEADER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, zIndex: 10, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img src="/LISBOA CMYK.png" alt="Mama Lisboa" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'contain', flexShrink: 0 }} />
                    <h1 style={{ fontSize: '1.6rem', fontWeight: 900, textTransform: 'uppercase', margin: 0, lineHeight: 1 }}>
                        Mama Lisboa <span style={{ background: '#FFFF00', color: 'black', padding: '0 8px' }}>Foosball</span> Tournament
                    </h1>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 8 }}>
                    <div className={isDanger ? 'tv-timer-pulse' : ''} style={{ fontWeight: 900, textTransform: 'uppercase', padding: '4px 24px', border: '4px solid ' + timerColor, color: timerColor, background: timerColor + '20', textAlign: 'center' }}>
                        <span style={{ fontSize: '6rem', lineHeight: 1 }}>{formatTime(timeRemaining)}</span>
                    </div>
                    <a href="/winner" style={{
                        display: 'block', textAlign: 'center',
                        padding: '10px 0', background: '#FFFF00', color: 'black',
                        fontWeight: 900, fontSize: '0.9rem', textTransform: 'uppercase',
                        letterSpacing: '0.15em', textDecoration: 'none',
                    }}>
                        🏆 Winner
                    </a>
                </div>
            </div>

            {/* ACTIVE MATCH */}
            <div style={{ flexShrink: 0, marginBottom: 12, zIndex: 10 }}>
                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.8)', borderLeft: '4px solid #FF0066', boxShadow: '6px 6px 0 #FF0066' }}>
                    <div style={{ width: 64, background: '#FF0066', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ color: 'black', fontWeight: 900, textTransform: 'uppercase', fontSize: '1.1rem', writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }}>Mesa</span>
                    </div>
                    {activeMatch ? (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'stretch' }}>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 16px', borderRight: '1px solid #333' }}>
                                <span style={{ fontSize: '2rem', fontWeight: 900, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: activeMatch.team1_score >= activeMatch.team2_score ? 'white' : '#666' }}>
                                    {activeMatch.team1 ? activeMatch.team1.name : ''}
                                </span>
                            </div>
                            <div style={{ width: 80, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: '3rem', fontWeight: 900, color: '#FF0066' }}>{activeMatch.team1_score}</span>
                            </div>
                            <div style={{ width: 40, background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontSize: '1.2rem', fontWeight: 900, color: '#444' }}>VS</span>
                            </div>
                            <div style={{ width: 80, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', borderLeft: '1px solid #333' }}>
                                <span style={{ fontSize: '3rem', fontWeight: 900, color: '#FF0066' }}>{activeMatch.team2_score}</span>
                            </div>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 16px', borderLeft: '1px solid #333' }}>
                                <span style={{ fontSize: '2rem', fontWeight: 900, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: activeMatch.team2_score >= activeMatch.team1_score ? 'white' : '#666' }}>
                                    {activeMatch.team2 ? activeMatch.team2.name : ''}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', fontSize: '1.5rem', fontWeight: 700, color: '#444', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            Awaiting Match
                        </div>
                    )}
                </div>
            </div>

            {/* LEADERBOARD */}
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', zIndex: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexShrink: 0 }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#FFFF00' }}>
                        Leaderboard — Most Wins
                    </h2>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#666', textTransform: 'uppercase' }}>{completedCount}/{matches.length} matches played</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, overflowY: 'auto', flex: 1 }}>
                    {leaderboard.map((team, index) => {
                        const borderCol = index === 0 ? '#FFFF00' : index === 1 ? '#d1d5db' : index === 2 ? '#d97706' : '#374151';
                        const rankCol = index === 0 ? '#FFFF00' : index === 1 ? '#d1d5db' : index === 2 ? '#d97706' : '#4b5563';
                        const goalCol = index === 0 ? '#FFFF00' : 'white';
                        const bg = index === 0 ? 'rgba(255,255,0,0.07)' : index === 1 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.3)';
                        return (
                            <div key={team.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderLeft: '4px solid ' + borderCol, background: bg }}>
                                <span style={{ fontSize: '2.5rem', fontWeight: 900, width: 40, textAlign: 'right', flexShrink: 0, color: rankCol }}>{index + 1}</span>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <p style={{ margin: 0, fontWeight: 900, fontSize: '1.25rem', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team.name}</p>
                                    <p style={{ margin: 0, color: '#6b7280', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>{team.player1} &amp; {team.player2}</p>
                                    <p style={{ margin: 0, color: '#6b7280', fontSize: '0.7rem' }}>{team.played} played · {team.wins}W</p>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                                    <span style={{ fontSize: '3rem', fontWeight: 900, lineHeight: 1, color: goalCol }}>{team.wins}</span>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: goalCol, textTransform: 'uppercase', letterSpacing: '0.1em' }}>wins</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* FOOTER */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, flexShrink: 0, zIndex: 10 }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase' }}>Service {serviceId} · Round-Robin</span>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase' }}>{teams.length} Teams · {matches.length} Total Matches</span>
            </div>
        </div>
    );
};
