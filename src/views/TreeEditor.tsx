import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { BracketTree } from '../components/BracketTree';
import { ArrowLeft, RefreshCw, Edit3 } from 'lucide-react';
import { Link } from 'react-router-dom';

export const TreeEditor = () => {
    const [matches, setMatches] = useState<any[]>([]);
    const [currentService, setCurrentService] = useState<number>(1);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
    const [editScoreTeam1, setEditScoreTeam1] = useState(0);
    const [editScoreTeam2, setEditScoreTeam2] = useState(0);
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
            const { data: matchesData } = await supabase.from('matches').select(`*, team1:teams!team1_id(name), team2:teams!team2_id(name)`).eq('service_id', currentService).order('created_at');

            setMatches(matchesData || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleMatchClick = (match: any) => {
        if (!match.team1_id && !match.team2_id) return; // Cannot edit empty match
        setSelectedMatch(match);
        setEditScoreTeam1(match.team1_score || 0);
        setEditScoreTeam2(match.team2_score || 0);
    };

    const handleSaveMatch = async () => {
        if (!selectedMatch) return;
        setIsSaving(true);

        try {
            const updates: any = {
                team1_score: editScoreTeam1,
                team2_score: editScoreTeam2
            };

            // Basic logic: if someone reaches 10, they win. Or if admin is overriding.
            // Just updating scores for now.
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
            await supabase.from('matches').update({
                team1_score: team1Score,
                team2_score: team2Score,
                winner_id: winnerId,
                status: 'completed'
            }).eq('id', selectedMatch.id);

            // Logic to advance the winner to the next round could go here
            // (Assuming there's a backend trigger, or we can handle it manually if needed)
            
            setSelectedMatch(null);
        } catch (error) {
            console.error('Error setting winner:', error);
        } finally {
            setIsSaving(false);
        }
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
                        <p className="text-gray-400 text-sm mt-1">Click any active or pending match to edit scores or assign winners.</p>
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
                <div className="mb-8">
                    <BracketTree matches={matches} isAdminMode={true} onMatchClick={handleMatchClick} />
                </div>

                {/* Edit Modal / Form */}
                {selectedMatch && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                        <div className="bg-gray-900 border border-gray-700 p-6 max-w-md w-full relative">
                            <div className="flex items-center mb-6 border-b border-gray-800 pb-4">
                                <Edit3 className="text-mama-yellow w-5 h-5 mr-3" />
                                <h2 className="text-xl font-black uppercase">Edit Matchup</h2>
                            </div>

                            <div className="space-y-6">
                                {/* Team 1 Edit */}
                                <div className="p-4 bg-black/50 border border-gray-800">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-gray-300">Team 1</span>
                                        <span className="text-xl font-black">{selectedMatch.team1?.name || (selectedMatch.team1_id ? 'Unknown' : 'TBD')}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-500">Score</span>
                                        <div className="flex space-x-2">
                                            <button onClick={() => setEditScoreTeam1(Math.max(0, editScoreTeam1 - 1))} className="bg-gray-800 px-3 py-1 text-white hover:bg-gray-700">-</button>
                                            <span className="w-8 text-center font-bold">{editScoreTeam1}</span>
                                            <button onClick={() => setEditScoreTeam1(editScoreTeam1 + 1)} className="bg-gray-800 px-3 py-1 text-white hover:bg-gray-700">+</button>
                                        </div>
                                    </div>
                                    {selectedMatch.team1_id && (
                                        <button 
                                            onClick={() => handleSetWinner(selectedMatch.team1_id, editScoreTeam1, editScoreTeam2)}
                                            className="w-full mt-4 bg-gray-800 text-gray-300 text-xs py-2 uppercase font-bold hover:bg-mama-green hover:text-black transition-colors"
                                            disabled={isSaving}
                                        >
                                            Declare Winner
                                        </button>
                                    )}
                                </div>

                                {/* Team 2 Edit */}
                                <div className="p-4 bg-black/50 border border-gray-800">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-gray-300">Team 2</span>
                                        <span className="text-xl font-black">{selectedMatch.team2?.name || (selectedMatch.team2_id ? 'Unknown' : 'TBD')}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-500">Score</span>
                                        <div className="flex space-x-2">
                                            <button onClick={() => setEditScoreTeam2(Math.max(0, editScoreTeam2 - 1))} className="bg-gray-800 px-3 py-1 text-white hover:bg-gray-700">-</button>
                                            <span className="w-8 text-center font-bold">{editScoreTeam2}</span>
                                            <button onClick={() => setEditScoreTeam2(editScoreTeam2 + 1)} className="bg-gray-800 px-3 py-1 text-white hover:bg-gray-700">+</button>
                                        </div>
                                    </div>
                                    {selectedMatch.team2_id && (
                                        <button 
                                            onClick={() => handleSetWinner(selectedMatch.team2_id, editScoreTeam1, editScoreTeam2)}
                                            className="w-full mt-4 bg-gray-800 text-gray-300 text-xs py-2 uppercase font-bold hover:bg-mama-green hover:text-black transition-colors"
                                            disabled={isSaving}
                                        >
                                            Declare Winner
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
                                    {isSaving ? 'Saving...' : 'Save Scores'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
