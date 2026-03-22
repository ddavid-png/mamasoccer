import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export const HistoryView = () => {
    const [matches, setMatches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeService, setActiveService] = useState<1 | 2>(1);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editScores, setEditScores] = useState<{ t1: number; t2: number }>({ t1: 0, t2: 0 });
    const [saving, setSaving] = useState(false);

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

    const startEdit = (m: any) => {
        setEditingId(m.id);
        setEditScores({ t1: m.team1_score, t2: m.team2_score });
    };

    const cancelEdit = () => {
        setEditingId(null);
    };

    const saveEdit = async (matchId: string) => {
        setSaving(true);
        await supabase
            .from('matches')
            .update({ team1_score: editScores.t1, team2_score: editScores.t2 })
            .eq('id', matchId);
        setSaving(false);
        setEditingId(null);
        fetchMatches();
    };

    const filtered = matches.filter(m => m.service_id === activeService);

    return (
        <div style={{ minHeight: '100vh', background: '#111', color: 'white', fontFamily: 'Outfit, sans-serif', padding: '24px 16px' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
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

            {/* Service tabs */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 28, maxWidth: 720, margin: '0 auto 28px auto', border: '2px solid #333' }}>
                {([1, 2] as const).map(s => {
                    const count = matches.filter(m => m.service_id === s).length;
                    return (
                        <button
                            key={s}
                            onClick={() => setActiveService(s)}
                            style={{
                                flex: 1, padding: '12px 0', fontWeight: 900, fontSize: '0.85rem',
                                textTransform: 'uppercase', letterSpacing: '0.1em', border: 'none',
                                cursor: 'pointer', transition: 'all 0.15s',
                                background: activeService === s ? '#FFFF00' : 'transparent',
                                color: activeService === s ? 'black' : '#6b7280',
                            }}
                        >
                            Table {s} · <span style={{ opacity: 0.7 }}>{count} games</span>
                        </button>
                    );
                })}
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>Loading...</div>
            ) : filtered.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#6b7280', padding: 40, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    No matches played yet on Table {activeService}
                </div>
            ) : (
                <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <p style={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px 0' }}>
                        {filtered.length} match{filtered.length !== 1 ? 'es' : ''} played · Table {activeService}
                    </p>
                    {filtered.map((m, i) => {
                        const isEditing = editingId === m.id;
                        const s1 = isEditing ? editScores.t1 : m.team1_score;
                        const s2 = isEditing ? editScores.t2 : m.team2_score;
                        const t1Win = s1 > s2;
                        const t2Win = s2 > s1;
                        const draw = s1 === s2;
                        const t1Name = m.team1?.name || m.team1_name || '—';
                        const t2Name = m.team2?.name || m.team2_name || '—';
                        const t1Players = m.team1 ? `${m.team1.player1 || ''} & ${m.team1.player2 || ''}` : m.team1_players || '';
                        const t2Players = m.team2 ? `${m.team2.player1 || ''} & ${m.team2.player2 || ''}` : m.team2_players || '';
                        const t1Deleted = !m.team1 && m.team1_name;
                        const t2Deleted = !m.team2 && m.team2_name;

                        return (
                            <div key={m.id} style={{
                                background: '#1a1a1a',
                                borderLeft: `4px solid ${isEditing ? '#3b82f6' : t1Win ? '#FFFF00' : t2Win ? '#FF0066' : '#444'}`,
                                padding: '14px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12
                            }}>
                                {/* Match number */}
                                <span style={{ color: '#444', fontWeight: 900, fontSize: '0.8rem', width: 26, flexShrink: 0 }}>
                                    #{filtered.length - i}
                                </span>

                                {/* Team 1 */}
                                <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                                    <p style={{
                                        margin: 0, fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase',
                                        color: t1Win ? '#FFFF00' : draw ? 'white' : '#6b7280',
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                    }}>
                                        {t1Name}
                                        {t1Deleted && <span style={{ fontSize: '0.55rem', color: '#6b7280', marginLeft: 5 }}>(removed)</span>}
                                    </p>
                                    <p style={{ margin: 0, color: '#4b5563', fontSize: '0.62rem', fontWeight: 600 }}>{t1Players}</p>
                                </div>

                                {/* Score — editable or static */}
                                {isEditing ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                        <input
                                            type="number" min={0} max={99}
                                            value={editScores.t1}
                                            onChange={e => setEditScores(s => ({ ...s, t1: Math.max(0, parseInt(e.target.value) || 0) }))}
                                            style={{ width: 52, textAlign: 'center', fontSize: '1.5rem', fontWeight: 900, background: '#0a0a0a', border: '2px solid #3b82f6', color: 'white', padding: '4px', borderRadius: 4 }}
                                        />
                                        <span style={{ color: '#444', fontWeight: 900 }}>—</span>
                                        <input
                                            type="number" min={0} max={99}
                                            value={editScores.t2}
                                            onChange={e => setEditScores(s => ({ ...s, t2: Math.max(0, parseInt(e.target.value) || 0) }))}
                                            style={{ width: 52, textAlign: 'center', fontSize: '1.5rem', fontWeight: 900, background: '#0a0a0a', border: '2px solid #3b82f6', color: 'white', padding: '4px', borderRadius: 4 }}
                                        />
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, background: '#0a0a0a', padding: '6px 14px', borderRadius: 4 }}>
                                        <span style={{ fontSize: '1.8rem', fontWeight: 900, color: t1Win ? '#FFFF00' : 'white', lineHeight: 1 }}>{s1}</span>
                                        <span style={{ color: '#444', fontWeight: 900 }}>—</span>
                                        <span style={{ fontSize: '1.8rem', fontWeight: 900, color: t2Win ? '#FF0066' : 'white', lineHeight: 1 }}>{s2}</span>
                                    </div>
                                )}

                                {/* Team 2 */}
                                <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                                    <p style={{
                                        margin: 0, fontWeight: 900, fontSize: '1rem', textTransform: 'uppercase',
                                        color: t2Win ? '#FF0066' : draw ? 'white' : '#6b7280',
                                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                    }}>
                                        {t2Name}
                                        {t2Deleted && <span style={{ fontSize: '0.55rem', color: '#6b7280', marginLeft: 5 }}>(removed)</span>}
                                    </p>
                                    <p style={{ margin: 0, color: '#4b5563', fontSize: '0.62rem', fontWeight: 600 }}>{t2Players}</p>
                                </div>

                                {/* Actions */}
                                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {isEditing ? (
                                        <>
                                            <button
                                                onClick={() => saveEdit(m.id)}
                                                disabled={saving}
                                                style={{ padding: '6px 12px', background: '#22c55e', color: 'black', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', border: 'none', cursor: 'pointer', borderRadius: 3 }}
                                            >
                                                {saving ? '...' : 'Save'}
                                            </button>
                                            <button
                                                onClick={cancelEdit}
                                                style={{ padding: '6px 10px', background: '#374151', color: 'white', fontWeight: 900, fontSize: '0.7rem', textTransform: 'uppercase', border: 'none', cursor: 'pointer', borderRadius: 3 }}
                                            >
                                                ✕
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <span style={{ fontSize: '0.6rem', fontWeight: 900, color: draw ? '#6b7280' : '#FFFF00', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 4 }}>
                                                {draw ? 'Draw' : '✓ Win'}
                                            </span>
                                            <button
                                                onClick={() => startEdit(m)}
                                                style={{ padding: '5px 10px', background: 'transparent', color: '#6b7280', fontWeight: 700, fontSize: '0.65rem', textTransform: 'uppercase', border: '1px solid #333', cursor: 'pointer', borderRadius: 3, letterSpacing: '0.05em' }}
                                            >
                                                Edit
                                            </button>
                                        </>
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
