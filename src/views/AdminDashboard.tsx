import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { RefreshCw, Play, Plus, Minus, Trophy } from 'lucide-react';

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
    const [addingTeam, setAddingTeam] = useState(false);
    const [addForm, setAddForm] = useState({ name: '', player1: '', player2: '' });

    useEffect(() => {
        fetchData();

        const sub = supabase
            .channel(`admin-channel-${serviceId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `service_id=eq.${serviceId}` }, fetchData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_state', filter: `service_id=eq.${serviceId}` }, fetchData)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'teams', filter: `service_id=eq.${serviceId}` }, (payload) => {
                // When a new team is added (from any source), add their matches if schedule exists
                addMatchesForNewTeam(payload.new.id).then(fetchData);
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'teams', filter: `service_id=eq.${serviceId}` }, fetchData)
            .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'teams', filter: `service_id=eq.${serviceId}` }, fetchData)
            .subscribe();

        return () => { supabase.removeChannel(sub); };
    }, [serviceId]);

    // When a new team joins, add their pending matches vs all existing teams (if schedule exists)
    const addMatchesForNewTeam = async (newTeamId: string) => {
        const { data: allTeams } = await supabase.from('teams').select('*').eq('service_id', serviceId);
        const { data: allMatches } = await supabase.from('matches').select('*').eq('service_id', serviceId);

        if (!allTeams || !allMatches || allMatches.length === 0) return; // No schedule yet

        // Safety: only handle teams that belong to this service
        const teamBelongsHere = allTeams.some(t => t.id === newTeamId);
        if (!teamBelongsHere) return;

        const otherTeams = allTeams.filter(t => t.id !== newTeamId);
        const maxNum = allMatches.reduce((max, m) => Math.max(max, m.match_number), 0);
        const newMatches: any[] = [];
        let counter = maxNum + 1;
        const baseTime = Date.now();

        for (const team of otherTeams) {
            const exists = allMatches.some(m =>
                (m.team1_id === newTeamId && m.team2_id === team.id) ||
                (m.team1_id === team.id && m.team2_id === newTeamId)
            );
            if (!exists) {
                newMatches.push({
                    service_id: serviceId,
                    match_number: counter++,
                    table_number: 1,
                    team1_id: newTeamId,
                    team2_id: team.id,
                    team1_score: 0,
                    team2_score: 0,
                    status: 'pending',
                    created_at: new Date(baseTime + counter * 1000).toISOString(),
                });
            }
        }

        if (newMatches.length > 0) {
            await supabase.from('matches').insert(newMatches);
        }
    };

    const fetchData = async () => {
        const { data: teamsData } = await supabase.from('teams').select('*').eq('service_id', serviceId).order('created_at');
        const { data: matchesData } = await supabase.from('matches').select('*, team1:team1_id(id,name), team2:team2_id(id,name)').eq('service_id', serviceId).order('match_number');
        const { data: stateData } = await supabase.from('tournament_state').select('*').eq('service_id', serviceId).single();

        if (teamsData) setTeams(teamsData);
        if (matchesData) setMatches(matchesData);
        if (stateData) setTimerState(stateData);
    };

    // --- Round-Robin Schedule Generation ---
    const generateSchedule = async () => {
        if (teams.length < 2) return alert('Need at least 2 teams!');
        const totalExpected = (teams.length * (teams.length - 1)) / 2;
        if (matches.length > 0) {
            if (!confirm(`Clear all ${matches.length} existing matches and regenerate ${totalExpected} matches for ${teams.length} teams?`)) return;
        }

        // Delete ALL existing matches for this service
        const { error: delErr } = await supabase.from('matches').delete().eq('service_id', serviceId);
        if (delErr) {
            console.error('Delete error:', delErr);
            return alert('Failed to clear old schedule: ' + delErr.message);
        }

        // Small pause to let delete commit before inserting
        await new Promise(r => setTimeout(r, 200));

        const shuffled = [...teams].sort(() => 0.5 - Math.random());
        const newMatches: any[] = [];
        let matchNumber = 1;
        const baseTime = Date.now();

        for (let i = 0; i < shuffled.length; i++) {
            for (let j = i + 1; j < shuffled.length; j++) {
                newMatches.push({
                    service_id: serviceId,
                    match_number: matchNumber,
                    table_number: 1,
                    team1_id: shuffled[i].id,
                    team2_id: shuffled[j].id,
                    team1_score: 0,
                    team2_score: 0,
                    status: 'pending',
                    created_at: new Date(baseTime + matchNumber * 1000).toISOString(),
                });
                matchNumber++;
            }
        }

        const { error: insertErr } = await supabase.from('matches').insert(newMatches);
        if (insertErr) {
            console.error('Insert error:', insertErr);
            alert('Error generating schedule: ' + insertErr.message);
        }
        await fetchData();
    };

    // --- Score & Match Controls ---
    const updateScore = async (matchId: string, team: 1 | 2, current: number, change: 1 | -1) => {
        const field = team === 1 ? 'team1_score' : 'team2_score';
        await supabase.from('matches').update({ [field]: Math.max(0, current + change) }).eq('id', matchId);
    };

    const setMatchActive = async (matchId: string, tableNumber: number) => {
        await supabase.from('matches').update({ status: 'active', table_number: tableNumber }).eq('id', matchId);
    };

    const completeMatch = async (matchId: string) => {
        await supabase.from('matches').update({ status: 'completed' }).eq('id', matchId);
    };

    // --- Timer ---
    const startTimer = async () => {
        const endsAt = new Date(Date.now() + 4 * 60 * 1000).toISOString();
        await supabase.from('tournament_state').update({ timer_status: 'running', timer_ends_at: endsAt }).eq('service_id', serviceId);
    };

    const stopTimer = async () => {
        await supabase.from('tournament_state').update({ timer_status: 'stopped' }).eq('service_id', serviceId);
    };

    // --- Team Management ---
    const deleteTeam = async (teamId: string) => {
        if (!confirm('Delete this team? Their pending matches will be removed, but completed games are preserved.')) return;
        // Only remove pending matches — completed matches stay so other teams keep their stats
        await supabase.from('matches')
            .delete()
            .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`)
            .eq('status', 'pending');
        await supabase.from('teams').delete().eq('id', teamId);
    };

    const startEdit = (team: any) => {
        setEditingTeam(team.id);
        setEditForm({ name: team.name, player1: team.player1, player2: team.player2 });
    };

    const saveEdit = async (teamId: string) => {
        await supabase.from('teams').update(editForm).eq('id', teamId);
        setEditingTeam(null);
    };

    const saveAdd = async () => {
        if (!addForm.name || !addForm.player1 || !addForm.player2) return;
        await supabase.from('teams').insert([{ ...addForm, service_id: serviceId }]);
        setAddForm({ name: '', player1: '', player2: '' });
        setAddingTeam(false);
    };

    // --- Leaderboard Computation ---
    const leaderboard = teams.map(team => {
        let goals = 0;
        let wins = 0;
        let played = 0;
        matches.forEach(m => {
            if (m.status !== 'completed') return;
            if (m.team1?.id === team.id) {
                goals += m.team1_score;
                played++;
                if (m.team1_score > m.team2_score) wins++;
            } else if (m.team2?.id === team.id) {
                goals += m.team2_score;
                played++;
                if (m.team2_score > m.team1_score) wins++;
            }
        });
        return { ...team, goals, wins, played };
    }).sort((a, b) => b.goals - a.goals || b.wins - a.wins);

    const pendingMatches = matches.filter(m => m.status === 'pending');
    const completedCount = matches.filter(m => m.status === 'completed').length;

    return (
        <div className="min-h-screen bg-mama-dark text-white p-6 pb-24 font-sans">
            <header className="flex justify-between items-center mb-8 bg-black/50 p-4 border-b-4 border-mama-pink">
                <h1 className="text-3xl font-black uppercase tracking-widest text-mama-yellow">Admin Dashboard</h1>
                <div className="flex bg-gray-800 rounded-lg overflow-hidden">
                    <button onClick={() => { setServiceId(1); broadcastServiceChange(1); }} className={`px-6 py-3 font-bold uppercase transition-colors ${serviceId === 1 ? 'bg-mama-pink text-white' : 'text-gray-400 hover:text-white'}`}>Service 1</button>
                    <button onClick={() => { setServiceId(2); broadcastServiceChange(2); }} className={`px-6 py-3 font-bold uppercase transition-colors ${serviceId === 2 ? 'bg-mama-pink text-white' : 'text-gray-400 hover:text-white'}`}>Service 2</button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* LEFT COLUMN */}
                <div className="space-y-6">
                    {/* Schedule Controls */}
                    <div className="bg-black/60 p-6 border-l-4 border-mama-blue">
                        <h2 className="text-xl font-black uppercase text-mama-blue mb-4">Round-Robin Controls</h2>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-gray-400 font-bold uppercase">{teams.length} Teams · {matches.length} Matches</span>
                            <button onClick={fetchData} className="p-2 text-gray-400 hover:text-white"><RefreshCw size={20} /></button>
                        </div>
                        {matches.length > 0 && (
                            <div className="mb-4 text-center text-sm font-bold text-gray-400">
                                <span className="text-mama-green">{completedCount}</span> / {matches.length} matches played
                            </div>
                        )}
                        <button onClick={generateSchedule} className="w-full py-4 bg-mama-blue text-black font-black uppercase tracking-wider hover:bg-white transition-colors flex items-center justify-center gap-2">
                            <RefreshCw size={20} /> Generate Schedule
                        </button>
                    </div>

                    {/* Timer */}
                    <div className="bg-black/60 p-6 border-l-4 border-mama-yellow">
                        <h2 className="text-xl font-black uppercase text-mama-yellow mb-4">Match Timer</h2>
                        <div className="text-center mb-4">
                            <span className={`px-4 py-1 text-sm font-bold uppercase border ${timerState?.timer_status === 'running' ? 'border-mama-green text-mama-green' : 'border-gray-500 text-gray-500'}`}>
                                {timerState?.timer_status || 'UNKNOWN'}
                            </span>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={startTimer} className="flex-1 py-4 bg-mama-green text-black font-black uppercase tracking-wider hover:bg-white transition-colors flex items-center justify-center gap-2">
                                <Play size={20} /> Start 5:00
                            </button>
                            <button onClick={stopTimer} className="px-6 py-4 bg-red-600 text-white font-black uppercase hover:bg-red-500 transition-colors">STOP</button>
                        </div>
                    </div>

                    {/* Leaderboard */}
                    <div className="bg-black/60 p-6 border-l-4 border-mama-pink">
                        <h2 className="text-xl font-black uppercase text-mama-pink mb-4 flex items-center gap-2"><Trophy size={20} /> Leaderboard</h2>
                        {leaderboard.length === 0 ? (
                            <p className="text-gray-500 text-sm uppercase font-bold text-center">No teams yet</p>
                        ) : leaderboard.map((team, index) => (
                            <div key={team.id} className={`flex items-center justify-between py-2 px-3 mb-1 ${index === 0 && team.goals > 0 ? 'bg-mama-yellow/10 border border-mama-yellow/30' : 'bg-black/30'}`}>
                                <div className="flex items-center gap-3">
                                    <span className={`text-lg font-black w-6 ${index === 0 ? 'text-mama-yellow' : 'text-gray-500'}`}>#{index + 1}</span>
                                    <div>
                                        <p className="font-bold text-sm">{team.name}</p>
                                        <p className="text-gray-500 text-xs">{team.played} played · {team.wins}W</p>
                                    </div>
                                </div>
                                <span className={`text-2xl font-black ${index === 0 && team.goals > 0 ? 'text-mama-yellow' : 'text-white'}`}>{team.goals}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT COLUMN: Active Match */}
                <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-2xl font-black uppercase tracking-widest"><span className="mama-highlight-pink text-black px-2">Now Playing</span></h2>

                    {(() => {
                        const activeMatch = matches.find(m => m.status === 'active');
                        return (
                            <div className="bg-black/40 border-2 border-gray-700 p-6 flex flex-col">
                                <h3 className="text-2xl font-black text-center text-gray-500 mb-6 uppercase tracking-widest">Mesa</h3>
                                {activeMatch ? (
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-center justify-between bg-gray-900 p-4">
                                            <span className="font-bold text-center flex-1 text-lg">{activeMatch.team1?.name || 'TBA'}</span>
                                            <div className="flex items-center gap-3">
                                                <button onClick={() => updateScore(activeMatch.id, 1, activeMatch.team1_score, -1)} className="p-2 bg-gray-800 hover:bg-gray-700 text-white"><Minus size={16} /></button>
                                                <span className="text-3xl font-black text-mama-pink w-12 text-center">{activeMatch.team1_score}</span>
                                                <button onClick={() => updateScore(activeMatch.id, 1, activeMatch.team1_score, 1)} className="p-2 bg-gray-800 hover:bg-gray-700 text-white"><Plus size={16} /></button>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between bg-gray-900 p-4">
                                            <span className="font-bold text-center flex-1 text-lg">{activeMatch.team2?.name || 'TBA'}</span>
                                            <div className="flex items-center gap-3">
                                                <button onClick={() => updateScore(activeMatch.id, 2, activeMatch.team2_score, -1)} className="p-2 bg-gray-800 hover:bg-gray-700 text-white"><Minus size={16} /></button>
                                                <span className="text-3xl font-black text-mama-blue w-12 text-center">{activeMatch.team2_score}</span>
                                                <button onClick={() => updateScore(activeMatch.id, 2, activeMatch.team2_score, 1)} className="p-2 bg-gray-800 hover:bg-gray-700 text-white"><Plus size={16} /></button>
                                            </div>
                                        </div>
                                        <button onClick={() => completeMatch(activeMatch.id)} className="py-3 bg-mama-green text-black font-black uppercase tracking-wider hover:bg-white transition-colors">
                                            End Match
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-center opacity-60 py-6">
                                        <p className="mb-4 text-sm">No active match.</p>
                                        {pendingMatches.length > 0 && (
                                            <div className="w-full">
                                                <p className="text-xs uppercase text-gray-500 font-bold mb-2">Queue Next:</p>
                                                {pendingMatches.slice(0, 5).map(m => (
                                                    <button key={m.id} onClick={() => setMatchActive(m.id, 1)} className="w-full text-left bg-gray-900 p-3 text-sm flex justify-between items-center mb-2 hover:bg-gray-800 opacity-100">
                                                        <span className="truncate pr-2">#{m.match_number} · {m.team1?.name} vs {m.team2?.name}</span>
                                                        <Play size={14} className="text-mama-green flex-shrink-0" />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* Pending Matches Queue */}
                    {pendingMatches.length > 0 && (
                        <div className="bg-black/40 border-2 border-gray-700 p-6">
                            <h3 className="text-lg font-black uppercase text-gray-400 mb-4">Remaining Matches ({pendingMatches.length})</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                                {pendingMatches.map(m => (
                                    <div key={m.id} className="bg-gray-900 px-3 py-2 text-sm flex items-center justify-between">
                                        <span className="text-gray-400 font-bold mr-2">#{m.match_number}</span>
                                        <span className="flex-1 truncate">{m.team1?.name} <span className="text-gray-600">vs</span> {m.team2?.name}</span>
                                        <button onClick={() => setMatchActive(m.id, 1)} className="ml-2 px-3 py-1 bg-mama-pink/20 text-mama-pink text-xs font-bold hover:bg-mama-pink hover:text-black transition-colors">
                                            <Play size={12} className="inline mr-1" />Play
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* TEAM MANAGEMENT */}
            <div className="mt-12">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-black uppercase tracking-widest"><span className="mama-highlight text-black px-2">Registered Teams</span></h2>
                    <button onClick={() => setAddingTeam(true)} className="px-4 py-2 bg-mama-green text-black font-black uppercase text-sm hover:bg-white transition-colors">+ Add Team</button>
                </div>
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
                            {/* Add team row */}
                            {addingTeam && (
                                <tr className="border-b border-gray-700 bg-mama-green/5">
                                    <td className="p-2"><input autoFocus type="text" placeholder="Team Name" value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} className="w-full bg-black/50 border border-gray-600 p-2 text-white outline-none focus:border-mama-green" /></td>
                                    <td className="p-2"><input type="text" placeholder="Player 1" value={addForm.player1} onChange={e => setAddForm({ ...addForm, player1: e.target.value })} className="w-full bg-black/50 border border-gray-600 p-2 text-white outline-none focus:border-mama-green" /></td>
                                    <td className="p-2"><input type="text" placeholder="Player 2" value={addForm.player2} onChange={e => setAddForm({ ...addForm, player2: e.target.value })} className="w-full bg-black/50 border border-gray-600 p-2 text-white outline-none focus:border-mama-green" /></td>
                                    <td className="p-2 text-right">
                                        <button onClick={saveAdd} className="px-3 py-1 bg-mama-green text-black font-bold uppercase text-xs mr-2">Save</button>
                                        <button onClick={() => setAddingTeam(false)} className="px-3 py-1 bg-gray-600 text-white font-bold uppercase text-xs">Cancel</button>
                                    </td>
                                </tr>
                            )}
                            {teams.length === 0 && !addingTeam ? (
                                <tr><td colSpan={4} className="p-4 text-center text-gray-500 font-bold uppercase">No teams registered yet.</td></tr>
                            ) : teams.map(t => (
                                <tr key={t.id} className="border-b border-gray-800 hover:bg-gray-900 transition-colors">
                                    {editingTeam === t.id ? (
                                        <>
                                            <td className="p-2"><input type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full bg-black/50 border border-gray-600 p-2 text-white outline-none focus:border-mama-blue" /></td>
                                            <td className="p-2"><input type="text" value={editForm.player1} onChange={e => setEditForm({ ...editForm, player1: e.target.value })} className="w-full bg-black/50 border border-gray-600 p-2 text-white outline-none focus:border-mama-blue" /></td>
                                            <td className="p-2"><input type="text" value={editForm.player2} onChange={e => setEditForm({ ...editForm, player2: e.target.value })} className="w-full bg-black/50 border border-gray-600 p-2 text-white outline-none focus:border-mama-blue" /></td>
                                            <td className="p-2 text-right">
                                                <button onClick={() => saveEdit(t.id)} className="px-3 py-1 bg-mama-green text-black font-bold uppercase text-xs mr-2">Save</button>
                                                <button onClick={() => setEditingTeam(null)} className="px-3 py-1 bg-gray-600 text-white font-bold uppercase text-xs">Cancel</button>
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
