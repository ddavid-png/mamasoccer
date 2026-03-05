import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { BracketTree } from '../components/BracketTree';
import { ArrowLeft, RefreshCw, Edit3, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';

export const TreeEditor = () => {
    const [matches, setMatches] = useState<any[]>([]);
    const [allTeams, setAllTeams] = useState<any[]>([]);
    const [currentService, setCurrentService] = useState<number>(1);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
    const [editScoreTeam1, setEditScoreTeam1] = useState(0);
    const [editScoreTeam2, setEditScoreTeam2] = useState(0);
    const [editTeam1Id, setEditTeam1Id] = useState<string | null>(null);
    const [editTeam2Id, setEditTeam2Id] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchData();

        const matchesSubscription = supabase
            .channel('matches-tree-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, fetchData)
            .subscribe();

        const teamsSubscription = supabase
            .channel('teams-tree-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, fetchData)
            .subscribe();

        return () => {
            matchesSubscription.unsubscribe();
            teamsSubscription.unsubscribe();
        };
    }, [currentService]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [{ data: matchesData }, { data: teamsData }] = await Promise.all([
                supabase.from('matches').select(`*, team1:teams!team1_id(name), team2:teams!team2_id(name)`).eq('service_id', currentService).order('created_at'),
                supabase.from('teams').select('*').eq('service_id', currentService).order('name'),
            ]);

            setMatches(matchesData || []);
            setAllTeams(teamsData || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleMatchClick = (match: any) => {
        setSelectedMatch(match);
        setEditScoreTeam1(match.team1_score || 0);
        setEditScoreTeam2(match.team2_score || 0);
        setEditTeam1Id(match.team1_id || null);
        setEditTeam2Id(match.team2_id || null);
    };

    const handleSaveMatch = async () => {
        if (!selectedMatch) return;
        setIsSaving(true);

        try {
            const updates: any = {
                team1_score: editScoreTeam1,
                team2_score: editScoreTeam2,
                team1_id: editTeam1Id,
                team2_id: editTeam2Id,
            };

            await supabase.from('matches').update(updates).eq('id', selectedMatch.id);
            
            setSelectedMatch(null);
        } catch (error) {
            console.error('Error updating match:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSetWinner = async (winnerId: string, team1Score: number, team2Score: number) => {
        if (!selectedMatch) return;
        setIsSaving(true);

        try {
            // 1. Complete current match
            await supabase.from('matches').update({
                team1_score: team1Score,
                team2_score: team2Score,
                winner_id: winnerId,
                status: 'completed'
            }).eq('id', selectedMatch.id);

            // 2. Auto-advance the winner to the next round
            if (selectedMatch.round > 2) {
                const currentRoundMatches = matches
                    .filter(m => m.round === selectedMatch.round)
                    .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

                const nextRoundMatches = matches
                    .filter(m => m.round === selectedMatch.round / 2)
                    .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

                const mIndex = currentRoundMatches.findIndex(m => m.id === selectedMatch.id);
                if (mIndex !== -1) {
                    const nextMatchIndex = Math.floor(mIndex / 2);
                    const nextMatch = nextRoundMatches[nextMatchIndex];
                    if (nextMatch) {
                        const isTeam1 = mIndex % 2 === 0;
                        const updatePayload = isTeam1 ? { team1_id: winnerId } : { team2_id: winnerId };
                        await supabase.from('matches').update(updatePayload).eq('id', nextMatch.id);
                    }
                }
            }

            setSelectedMatch(null);
        } catch (error) {
            console.error('Error setting winner:', error);
        } finally {
            setIsSaving(false);
        }
    };

    // Get the display name for a team by its id
    const getTeamName = (teamId: string | null) => {
        if (!teamId) return 'TBD';
        const team = allTeams.find(t => t.id === teamId);
        return team?.name || 'Unknown';
    };

    return (
        <div className="min-h-screen bg-black text-white p-6 font-sans">
            <div className="max-w-7xl mx-auto">
                <header className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
                    <div>
                        <Link to="/admin" className="flex items-center text-mama-pink mb-2 hover:opacity-80 transition-opacity">
                            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
                        </Link>
                        <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Tree Editor <span className="text-mama-blue">Admin</span></h1>
                        <p className="text-gray-400 text-sm mt-1">Click any match to edit scores, assign teams, or declare winners.</p>
                    </div>

                    <div className="flex space-x-4 items-center">
                        <div className="bg-gray-900 border border-gray-800 p-1 flex">
                            <button
                                onClick={() => setCurrentService(1)}
                                className={`px-4 py-2 text-sm font-bold uppercase transition-colors ${currentService === 1 ? 'bg-mama-pink text-black' : 'text-gray-400 hover:text-white'}`}
                            >
                                Service 1 (12h-14h)
                            </button>
                            <button
                                onClick={() => setCurrentService(2)}
                                className={`px-4 py-2 text-sm font-bold uppercase transition-colors ${currentService === 2 ? 'bg-mama-blue text-black' : 'text-gray-400 hover:text-white'}`}
                            >
                                Service 2 (14h-16h)
                            </button>
                        </div>
                        <button
                            onClick={fetchData}
                            className="bg-gray-800 p-2 border border-gray-700 hover:bg-gray-700 transition-colors"
                            title="Force Refresh"
                        >
                            <RefreshCw className={`w-5 h-5 text-gray-300 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </header>

                {/* The Bracket Interactive View */}
                <div className="mb-8 h-[500px]">
                    <BracketTree matches={matches} isAdminMode={true} onMatchClick={handleMatchClick} />
                </div>

                {/* Edit Modal / Form */}
                {selectedMatch && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                        <div className="bg-gray-900 border border-gray-700 p-6 max-w-lg w-full relative">
                            <div className="flex items-center mb-6 border-b border-gray-800 pb-4">
                                <Edit3 className="text-mama-yellow w-5 h-5 mr-3" />
                                <h2 className="text-xl font-black uppercase">Edit Matchup</h2>
                                <span className="ml-auto text-xs text-gray-500 uppercase font-bold">Round of {selectedMatch.round}</span>
                            </div>

                            <div className="space-y-6">
                                {/* Team 1 Edit */}
                                <div className="p-4 bg-black/50 border border-gray-800">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="font-bold text-gray-300 text-sm uppercase">Team 1</span>
                                    </div>
                                    
                                    {/* Team Selector */}
                                    <div className="relative mb-3">
                                        <select
                                            value={editTeam1Id || ''}
                                            onChange={(e) => setEditTeam1Id(e.target.value || null)}
                                            className="w-full bg-black border border-gray-700 text-white p-3 font-bold uppercase appearance-none cursor-pointer focus:border-mama-pink outline-none"
                                        >
                                            <option value="">-- No Team (TBD) --</option>
                                            {allTeams.map(t => (
                                                <option key={t.id} value={t.id}>{t.name} ({t.player1} & {t.player2})</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-500">Score</span>
                                        <div className="flex space-x-2">
                                            <button onClick={() => setEditScoreTeam1(Math.max(0, editScoreTeam1 - 1))} className="bg-gray-800 px-3 py-1 text-white hover:bg-gray-700">-</button>
                                            <span className="w-8 text-center font-bold">{editScoreTeam1}</span>
                                            <button onClick={() => setEditScoreTeam1(editScoreTeam1 + 1)} className="bg-gray-800 px-3 py-1 text-white hover:bg-gray-700">+</button>
                                        </div>
                                    </div>
                                    {editTeam1Id && (
                                        <button 
                                            onClick={() => handleSetWinner(editTeam1Id, editScoreTeam1, editScoreTeam2)}
                                            className="w-full mt-4 bg-gray-800 text-gray-300 text-xs py-2 uppercase font-bold hover:bg-mama-green hover:text-black transition-colors"
                                            disabled={isSaving}
                                        >
                                            🏆 Declare {getTeamName(editTeam1Id)} Winner
                                        </button>
                                    )}
                                </div>

                                {/* Team 2 Edit */}
                                <div className="p-4 bg-black/50 border border-gray-800">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="font-bold text-gray-300 text-sm uppercase">Team 2</span>
                                    </div>

                                    {/* Team Selector */}
                                    <div className="relative mb-3">
                                        <select
                                            value={editTeam2Id || ''}
                                            onChange={(e) => setEditTeam2Id(e.target.value || null)}
                                            className="w-full bg-black border border-gray-700 text-white p-3 font-bold uppercase appearance-none cursor-pointer focus:border-mama-blue outline-none"
                                        >
                                            <option value="">-- No Team (TBD) --</option>
                                            {allTeams.map(t => (
                                                <option key={t.id} value={t.id}>{t.name} ({t.player1} & {t.player2})</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-500">Score</span>
                                        <div className="flex space-x-2">
                                            <button onClick={() => setEditScoreTeam2(Math.max(0, editScoreTeam2 - 1))} className="bg-gray-800 px-3 py-1 text-white hover:bg-gray-700">-</button>
                                            <span className="w-8 text-center font-bold">{editScoreTeam2}</span>
                                            <button onClick={() => setEditScoreTeam2(editScoreTeam2 + 1)} className="bg-gray-800 px-3 py-1 text-white hover:bg-gray-700">+</button>
                                        </div>
                                    </div>
                                    {editTeam2Id && (
                                        <button 
                                            onClick={() => handleSetWinner(editTeam2Id, editScoreTeam1, editScoreTeam2)}
                                            className="w-full mt-4 bg-gray-800 text-gray-300 text-xs py-2 uppercase font-bold hover:bg-mama-green hover:text-black transition-colors"
                                            disabled={isSaving}
                                        >
                                            🏆 Declare {getTeamName(editTeam2Id)} Winner
                                        </button>
                                    )}
                                </div>

                            </div>

                            <div className="mt-8 flex space-x-4">
                                <button 
                                    onClick={() => setSelectedMatch(null)}
                                    className="flex-1 py-3 bg-transparent border border-gray-700 text-gray-300 font-bold uppercase hover:bg-gray-800 transition-colors"
                                    disabled={isSaving}
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSaveMatch}
                                    className="flex-1 py-3 bg-mama-pink text-black font-black uppercase hover:opacity-90 transition-opacity"
                                    disabled={isSaving}
                                >
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
