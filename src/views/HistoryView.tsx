import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export const HistoryView = () => {
    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchMatches = async () => {
        const { data } = await supabase
            .from('matches')
            .select('*, team1:team1_id(id,name,player1,player2), team2:team2_id(id,name,player1,player2)')
            .eq('status', 'completed')
            .order('match_number', { ascending: false });
        if (data) setMatches(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchMatches();
        const sub = supabase
            .channel('history-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, fetchMatches)
            .subscribe();
        return () => { supabase.removeChannel(sub); };
    }, []);

    return (
        <div style={{ minHeight: '100vh', background: '#111', color: 'white', fontFamily: 'Outfit, sans-serif', padding: '24px 16px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
                <img src="/LISBOA CMYK.png" alt="Mama Lisboa" style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'contain' }} />
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Mama Lisboa <span style={{ background: '#FFFF00', color: 'black', padding: '0 6px' }}>Foosball</span> Tournament
                    </h1>
                    <p style={{ margin: 0, color: '#6b7280', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        Match History
                    </p>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Loading...</div>
            ) : matches.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#6b7280', padding: 40, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    No matches played yet
                </div>
            ) : (
                <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <p style={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px 0' }}>
                        {matches.length} match{matches.length !== 1 ? 'es' : ''} played
                    </p>
                    {matches.map((m, i) => {
                        const t1Win = m.team1_score > m.team2_score;
                        const t2Win = m.team2_score > m.team1_score;
                        const draw = m.team1_score === m.team2_score;
                        return (
                            <div key={m.id} style={{
                                background: '#1a1a1a',
                                borderLeft: `4px solid ${t1Win ? '#FFFF00' : t2Win ? '#FF0066' : '#444'}`,
                                padding: '14px 20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 16
                            }}>
                                {/* Match number */}
                                <span style={{ color: '#444', fontWeight: 900, fontSize: '0.85rem', width: 28, flexShrink: 0 }}>
                                    #{matches.length - i}
                                </span>

                                {/* Team 1 */}
                                <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                                    <p style={{
                                        margin: 0, fontWeight: 900, fontSize: '1.1rem', textTransform: 'uppercase',
                                        color: t1Win ? '#FFFF00' : draw ? 'white' : '#6b7280',
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                    }}>
                                        {m.team1?.name || '—'}
                                    </p>
                                    <p style={{ margin: 0, color: '#4b5563', fontSize: '0.65rem', fontWeight: 600 }}>
                                        {m.team1?.player1} &amp; {m.team1?.player2}
                                    </p>
                                </div>

                                {/* Score */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
                                    background: '#0a0a0a', padding: '6px 16px', borderRadius: 4
                                }}>
                                    <span style={{ fontSize: '2rem', fontWeight: 900, color: t1Win ? '#FFFF00' : 'white', lineHeight: 1 }}>
                                        {m.team1_score}
                                    </span>
                                    <span style={{ color: '#444', fontWeight: 900, fontSize: '1rem' }}>—</span>
                                    <span style={{ fontSize: '2rem', fontWeight: 900, color: t2Win ? '#FF0066' : 'white', lineHeight: 1 }}>
                                        {m.team2_score}
                                    </span>
                                </div>

                                {/* Team 2 */}
                                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                                    <p style={{
                                        margin: 0, fontWeight: 900, fontSize: '1.1rem', textTransform: 'uppercase',
                                        color: t2Win ? '#FF0066' : draw ? 'white' : '#6b7280',
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                    }}>
                                        {m.team2?.name || '—'}
                                    </p>
                                    <p style={{ margin: 0, color: '#4b5563', fontSize: '0.65rem', fontWeight: 600 }}>
                                        {m.team2?.player1} &amp; {m.team2?.player2}
                                    </p>
                                </div>

                                {/* Result badge */}
                                <div style={{ flexShrink: 0, width: 36, textAlign: 'center' }}>
                                    {draw ? (
                                        <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Draw</span>
                                    ) : (
                                        <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#FFFF00', textTransform: 'uppercase', letterSpacing: '0.05em' }}>✓ Win</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Back link */}
            <div style={{ textAlign: 'center', marginTop: 40 }}>
                <a href="/admin" style={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', textDecoration: 'none' }}>
                    ← Back to Admin
                </a>
            </div>
        </div>
    );
};
