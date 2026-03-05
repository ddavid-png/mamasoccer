import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { RefreshCw, Play, Plus, Minus } from 'lucide-react';

const broadcastServiceChange = (newServiceId: number) => {
    supabase.channel('tv-control').send({
        type: 'broadcast',
        event: 'service-change',
        payload: { serviceId: newServiceId },
    });
};

export const AdminDashboard = () => {
    const [serviceId, setServiceId] = useState<1 | 2>(1);
    const [teams, setTeams] = useState<any[]>([]);
    const [matches, setMatches] = useState<any[]>([]);
    const [timerState, setTimerState] = useState<any>(null);
    const [editingTeam, setEditingTeam] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ name: '', player1: '', player2: '' });

    useEffect(() => {
        fetchData();

        // Subscribe to real-time changes
        const matchesSub = supabase
            .channel('custom-all-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
                fetchData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_state' }, () => {
                fetchData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
                fetchData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(matchesSub);
        };
    }, [serviceId]);

    const fetchData = async () => {
        const { data: teamsData } = await supabase.from('teams').select('*').eq('service_id', serviceId);
        const { data: matchesData } = await supabase.from('matches').select('*, team1:team1_id(name), team2:team2_id(name)').eq('service_id', serviceId).order('round', { ascending: false });
        const { data: stateData } = await supabase.from('tournament_state').select('*').eq('service_id', serviceId).single();

        if (teamsData) setTeams(teamsData);
        if (matchesData) setMatches(matchesData);
        if (stateData) setTimerState(stateData);
    };

    const generateBracket = async () => {
        if (!teams || teams.length < 2) return alert("Not enough teams to start!");
        if (matches.length > 0) {
            if (!confirm("A bracket already exists. Are you sure you want to overwrite it?")) return;
        }

        // 1. Clear existing matches for this service
        await supabase.from('matches').delete().eq('service_id', serviceId);

        // 2. Shuffle teams randomly
        const shuffled = [...teams].sort(() => 0.5 - Math.random());

        // 3. Determine starting round and placement order for perfect BYE distribution
        let startingRound = 16;
        let placementOrder = [0, 8, 4, 12, 2, 10, 6, 14, 1, 9, 5, 13, 3, 11, 7, 15];
        if (shuffled.length <= 8) {
            startingRound = 8;
            placementOrder = [0, 4, 2, 6, 1, 5, 3, 7];
        }
        if (shuffled.length <= 4) {
            startingRound = 4;
            placementOrder = [0, 2, 1, 3];
        }

        // 4. Fill the slots evenly to distribute BYEs organically
        const flatSlots = new Array(startingRound).fill(null);
        for (let i = 0; i < shuffled.length; i++) {
            flatSlots[placementOrder[i]] = shuffled[i];
        }

        const newMatches: any[] = [];
        const baseTime = Date.now();
        let matchIndex = 0;

        const bracket: Record<number, any[]> = {};
        let currentRound = startingRound;
        let tableCounter = 1;

        while (currentRound >= 2) {
            bracket[currentRound] = [];
            const matchesInRound = currentRound / 2;

            for (let i = 0; i < matchesInRound; i++) {
                let t1_id: string | null = null;
                let t2_id: string | null = null;
                let m_status = 'pending';
                let w_id: string | null = null;

                if (currentRound === startingRound) {
                    const t1 = flatSlots[i * 2];
                    const t2 = flatSlots[i * 2 + 1];
                    t1_id = t1?.id || null;
                    t2_id = t2?.id || null;
                } else {
                    const prevRound = currentRound * 2;
                    const prev1 = bracket[prevRound][i * 2];
                    const prev2 = bracket[prevRound][i * 2 + 1];

                    if (prev1.status === 'completed') t1_id = prev1.winner_id;
                    if (prev2.status === 'completed') t2_id = prev2.winner_id;
                }

                // Determine state and winner logic (auto byes)
                if (t1_id && t2_id) {
                    m_status = 'pending';
                } else if (t1_id && !t2_id) {
                    let isT2Dead = false;
                    if (currentRound === startingRound) {
                        isT2Dead = true;
                    } else {
                        const prev2 = bracket[currentRound * 2][i * 2 + 1];
                        if (prev2.status === 'completed' && !prev2.winner_id) isT2Dead = true;
                    }
                    if (isT2Dead) {
                        m_status = 'completed';
                        w_id = t1_id;
                    }
                } else if (!t1_id && t2_id) {
                    let isT1Dead = false;
                    if (currentRound === startingRound) {
                        isT1Dead = true;
                    } else {
                        const prev1 = bracket[currentRound * 2][i * 2];
                        if (prev1.status === 'completed' && !prev1.winner_id) isT1Dead = true;
                    }
                    if (isT1Dead) {
                        m_status = 'completed';
                        w_id = t2_id;
                    }
                } else { // !t1_id && !t2_id
                    let isT1Dead = currentRound === startingRound ? true : (bracket[currentRound * 2][i * 2].status === 'completed');
                    let isT2Dead = currentRound === startingRound ? true : (bracket[currentRound * 2][i * 2 + 1].status === 'completed');
                    if (isT1Dead && isT2Dead) {
                        m_status = 'completed';
                        w_id = null;
                    }
                }

                const matchObj = {
                    service_id: serviceId,
                    round: currentRound,
                    table_number: tableCounter,
                    team1_id: t1_id,
                    team2_id: t2_id,
                    status: m_status,
                    winner_id: w_id,
                    created_at: new Date(baseTime + matchIndex * 1000).toISOString()
                };

                tableCounter = tableCounter === 1 ? 2 : 1;
                bracket[currentRound].push(matchObj);
                newMatches.push(matchObj);
                matchIndex++;
            }
            currentRound = currentRound / 2;
        }

        const { error } = await supabase.from('matches').insert(newMatches);
        if (error) console.error("Error generating bracket", error);
        fetchData();
    };

    const updateScore = async (matchId: string, team: 1 | 2, currentScore: number, change: 1 | -1) => {
        const newScore = Math.max(0, currentScore + change);
        const field = team === 1 ? 'team1_score' : 'team2_score';
        await supabase.from('matches').update({ [field]: newScore }).eq('id', matchId);
    };

    const startTimer = async () => {
        // 4 minutes from now
        const endsAt = new Date(Date.now() + 4 * 60 * 1000).toISOString();
        await supabase.from('tournament_state').update({
            timer_status: 'running',
            timer_ends_at: endsAt
        }).eq('service_id', serviceId);
    };

    const stopTimer = async () => {
        await supabase.from('tournament_state').update({
            timer_status: 'stopped',
        }).eq('service_id', serviceId);
    };

    const setMatchActive = async (matchId: string, tableNumber: number) => {
        await supabase.from('matches').update({ status: 'active', table_number: tableNumber }).eq('id', matchId);
    };

    const declareWinner = async (matchId: string, winnerId: string) => {
        await supabase.from('matches').update({ status: 'completed', winner_id: winnerId }).eq('id', matchId);

        // Auto-advance logic
        const match = matches.find(m => m.id === matchId);
        if (!match || match.round === 2) return; // Final match

        const currentRoundMatches = matches
            .filter(m => m.round === match.round)
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        const nextRoundMatches = matches
            .filter(m => m.round === match.round / 2)
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        const mIndex = currentRoundMatches.findIndex(m => m.id === matchId);
        if (mIndex === -1) return;

        const nextMatchIndex = Math.floor(mIndex / 2);
        const nextMatch = nextRoundMatches[nextMatchIndex];

        if (nextMatch) {
            const isTeam1 = mIndex % 2 === 0;
            const updatePayload = isTeam1 ? { team1_id: winnerId } : { team2_id: winnerId };
            await supabase.from('matches').update(updatePayload).eq('id', nextMatch.id);
        }
    };

    const deleteTeam = async (teamId: string) => {
        if (!confirm("Are you sure you want to delete this team?")) return;
        const { error } = await supabase.from('teams').delete().eq('id', teamId);
        if (error) {
            alert("Could not delete team! They might already be assigned to a bracket. If so, generate a new bracket first to clear matches.\\n\\nDetails: " + error.message);
        }
    };

    const startEdit = (team: any) => {
        setEditingTeam(team.id);
        setEditForm({ name: team.name, player1: team.player1, player2: team.player2 });
    };

    const saveEdit = async (teamId: string) => {
        const { error } = await supabase.from('teams').update(editForm).eq('id', teamId);
        if (error) {
            alert("Error updating team: " + error.message);
        } else {
            setEditingTeam(null);
            fetchData();
        }
    };

    const cancelEdit = () => {
        setEditingTeam(null);
    };

    return (
        <div className="min-h-screen bg-mama-dark text-white p-6 pb-24 font-sans">
            <header className="flex justify-between items-center mb-8 bg-black/50 p-4 border-b-4 border-mama-pink">
                <h1 className="text-3xl font-black uppercase tracking-widest text-mama-yellow">
                    Admin Dashboard
                </h1>

                <div className="flex bg-gray-800 rounded-lg overflow-hidden">
                    <button
                        onClick={() => { setServiceId(1); broadcastServiceChange(1); }}
                        className={`px-6 py-3 font-bold uppercase transition-colors ${serviceId === 1 ? 'bg-mama-pink text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        Service 1
                    </button>
                    <button
                        onClick={() => { setServiceId(2); broadcastServiceChange(2); }}
                        className={`px-6 py-3 font-bold uppercase transition-colors ${serviceId === 2 ? 'bg-mama-pink text-white' : 'text-gray-400 hover:text-white'}`}
                    >
                        Service 2
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* LEFT COLUMN: Operations */}
                <div className="space-y-6">
                    <div className="bg-black/60 p-6 border-l-4 border-mama-blue">
                        <h2 className="text-xl font-black uppercase text-mama-blue mb-4">Bracket Controls</h2>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-gray-400 font-bold uppercase">{teams.length} Teams Registered</span>
                            <button onClick={fetchData} className="p-2 text-gray-400 hover:text-white"><RefreshCw size={20} /></button>
                        </div>
                        <button
                            onClick={generateBracket}
                            className="w-full py-4 bg-mama-blue text-black font-black uppercase tracking-wider hover:bg-white transition-colors flex items-center justify-center gap-2"
                        >
                            <RefreshCw size={20} /> Generate Random Bracket
                        </button>
                    </div>

                    <div className="bg-black/60 p-6 border-l-4 border-mama-yellow">
                        <h2 className="text-xl font-black uppercase text-mama-yellow mb-4">Global Timer</h2>
                        <div className="text-center mb-6">
                            <p className="text-gray-400 font-bold uppercase mb-2">Current Status</p>
                            <span className={`px-4 py-1 text-sm font-bold uppercase border ${timerState?.timer_status === 'running' ? 'border-mama-green text-mama-green' : 'border-gray-500 text-gray-500'}`}>
                                {timerState?.timer_status || 'UNKNOWN'}
                            </span>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={startTimer}
                                className="flex-1 py-4 bg-mama-green text-black font-black uppercase tracking-wider hover:bg-white transition-colors flex items-center justify-center gap-2"
                            >
                                <Play size={20} /> Start 4:00
                            </button>
                            <button
                                onClick={stopTimer}
                                className="px-6 py-4 bg-red-600 text-white font-black uppercase hover:bg-red-500 transition-colors"
                            >
                                STOP
                            </button>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Active Matches */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-2xl font-black uppercase tracking-widest"><span className="mama-highlight-pink text-black px-2">Now Playing</span></h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Table 1 & 2 Renderers */}
                        {[1, 2].map(tableNum => {
                            const activeMatch = matches.find(m => m.table_number === tableNum && m.status === 'active');

                            return (
                                <div key={tableNum} className="bg-black/40 border-2 border-gray-700 p-6 flex flex-col">
                                    <h3 className="text-2xl font-black text-center text-gray-500 mb-6 uppercase tracking-widest">Mesa {tableNum}</h3>

                                    {activeMatch ? (
                                        <div className="flex-1 flex flex-col justify-between">
                                            <div className="flex items-center justify-between mb-4 bg-gray-900 p-4">
                                                <span className="font-bold text-center flex-1">{activeMatch.team1?.name || 'TBA'}</span>
                                                <div className="flex items-center gap-3">
                                                    <button onClick={() => updateScore(activeMatch.id, 1, activeMatch.team1_score, -1)} className="p-2 bg-gray-800 hover:bg-gray-700 text-white"><Minus size={16} /></button>
                                                    <span className="text-3xl font-black text-mama-pink w-12 text-center">{activeMatch.team1_score}</span>
                                                    <button onClick={() => updateScore(activeMatch.id, 1, activeMatch.team1_score, 1)} className="p-2 bg-gray-800 hover:bg-gray-700 text-white"><Plus size={16} /></button>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between bg-gray-900 p-4">
                                                <span className="font-bold text-center flex-1">{activeMatch.team2?.name || 'TBA'}</span>
                                                <div className="flex items-center gap-3">
                                                    <button onClick={() => updateScore(activeMatch.id, 2, activeMatch.team2_score, -1)} className="p-2 bg-gray-800 hover:bg-gray-700 text-white"><Minus size={16} /></button>
                                                    <span className="text-3xl font-black text-mama-blue w-12 text-center">{activeMatch.team2_score}</span>
                                                    <button onClick={() => updateScore(activeMatch.id, 2, activeMatch.team2_score, 1)} className="p-2 bg-gray-800 hover:bg-gray-700 text-white"><Plus size={16} /></button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 mt-6">
                                                <button onClick={() => declareWinner(activeMatch.id, activeMatch.team1_id)} className="py-2 bg-gray-800 hover:bg-mama-pink hover:text-black font-bold uppercase text-xs transition-colors">
                                                    Team 1 Wins
                                                </button>
                                                <button onClick={() => declareWinner(activeMatch.id, activeMatch.team2_id)} className="py-2 bg-gray-800 hover:bg-mama-blue hover:text-black font-bold uppercase text-xs transition-colors">
                                                    Team 2 Wins
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
                                            <p className="mb-4">No active match to handle.</p>

                                            {/* Show pending matches for this table */}
                                            {matches.filter(m => m.status === 'pending').length > 0 && (
                                                <div className="w-full">
                                                    <p className="text-xs uppercase text-gray-500 font-bold mb-2">Queue Next:</p>
                                                    {matches.filter(m => m.status === 'pending').slice(0, 3).map(m => (
                                                        <button
                                                            key={m.id}
                                                            onClick={() => setMatchActive(m.id, tableNum)}
                                                            className="w-full text-left bg-gray-900 p-3 text-sm flex justify-between items-center mb-2 hover:bg-gray-800"
                                                        >
                                                            <span className="truncate pr-2">{m.team1?.name} vs {m.team2?.name || 'TBA'}</span>
                                                            <Play size={14} className="text-mama-green flex-shrink-0" />
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

            </div>

            {/* TEAM MANAGEMENT */}
            <div className="mt-12">
                <h2 className="text-2xl font-black uppercase tracking-widest mb-6"><span className="mama-highlight text-black px-2">Registered Teams</span></h2>
                <div className="bg-black/40 border-2 border-gray-700 p-6 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-gray-700">
                                <th className="p-3 text-gray-500 font-bold uppercase tracking-wider">Team Name</th>
                                <th className="p-3 text-gray-500 font-bold uppercase tracking-wider">Player 1</th>
                                <th className="p-3 text-gray-500 font-bold uppercase tracking-wider">Player 2</th>
                                <th className="p-3 text-gray-500 font-bold uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teams.length === 0 ? (
                                <tr><td colSpan={4} className="p-4 text-center text-gray-500 font-bold uppercase">No teams registered yet.</td></tr>
                            ) : teams.map(t => (
                                <tr key={t.id} className="border-b border-gray-800 hover:bg-gray-900 transition-colors">
                                    {editingTeam === t.id ? (
                                        <>
                                            <td className="p-2"><input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full bg-black/50 border border-gray-600 p-2 text-white outline-none focus:border-mama-blue" /></td>
                                            <td className="p-2"><input type="text" value={editForm.player1} onChange={e => setEditForm({ ...editForm, player1: e.target.value })} className="w-full bg-black/50 border border-gray-600 p-2 text-white outline-none focus:border-mama-blue" /></td>
                                            <td className="p-2"><input type="text" value={editForm.player2} onChange={e => setEditForm({ ...editForm, player2: e.target.value })} className="w-full bg-black/50 border border-gray-600 p-2 text-white outline-none focus:border-mama-blue" /></td>
                                            <td className="p-2 text-right">
                                                <button onClick={() => saveEdit(t.id)} className="px-3 py-1 bg-mama-green text-black font-bold uppercase text-xs transition-colors mr-2">Save</button>
                                                <button onClick={cancelEdit} className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white font-bold uppercase text-xs transition-colors">Cancel</button>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="p-3 font-bold text-lg">{t.name}</td>
                                            <td className="p-3 text-gray-300">{t.player1}</td>
                                            <td className="p-3 text-gray-300">{t.player2}</td>
                                            <td className="p-3 text-right">
                                                <button onClick={() => startEdit(t)} className="px-4 py-2 bg-mama-blue text-black hover:bg-white font-bold uppercase text-xs transition-colors mr-2">Edit</button>
                                                <button onClick={() => deleteTeam(t.id)} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold uppercase text-xs transition-colors">Delete</button>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
