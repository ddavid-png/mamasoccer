import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { motion } from 'framer-motion';
import { BracketTree } from '../components/BracketTree';

export const TvDisplay = () => {
    // The TV view needs to pick a service to display, typically passed via query param or default to 1. 
    // For simplicity, we'll listen to Service 1 by default, but you could add a ?service=2 parameter to the URL to project the other.
    const urlParams = new URLSearchParams(window.location.search);
    const serviceId = urlParams.get('service') === '2' ? 2 : 1;

    const [matches, setMatches] = useState<any[]>([]);
    const [timerState, setTimerState] = useState<any>(null);
    const [timeRemaining, setTimeRemaining] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();

        const channel = supabase
            .channel('tv-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `service_id=eq.${serviceId}` }, () => {
                fetchData();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_state', filter: `service_id=eq.${serviceId}` }, () => {
                fetchData();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchData = async () => {
        const { data: matchesData } = await supabase.from('matches').select('*, team1:team1_id(name), team2:team2_id(name)').eq('service_id', serviceId).order('round', { ascending: false });
        const { data: stateData } = await supabase.from('tournament_state').select('*').eq('service_id', serviceId).single();

        if (matchesData) setMatches(matchesData);
        if (stateData) setTimerState(stateData);
        setLoading(false);
    };

    // Timer logic
    useEffect(() => {
        if (!timerState || timerState.timer_status !== 'running' || !timerState.timer_ends_at) {
            setTimeRemaining(0);
            return;
        }

        const interval = setInterval(() => {
            const ends = new Date(timerState.timer_ends_at).getTime();
            const now = new Date().getTime();
            const distance = ends - now;

            if (distance < 0) {
                setTimeRemaining(0);
                clearInterval(interval);
            } else {
                setTimeRemaining(Math.floor(distance / 1000));
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [timerState]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Find active matches
    const table1Match = matches.find(m => m.table_number === 1 && m.status === 'active');
    const table2Match = matches.find(m => m.table_number === 2 && m.status === 'active');

    // Timer Visual States
    const isRunning = timerState?.timer_status === 'running' && timeRemaining > 0;
    const isWarning = isRunning && timeRemaining <= 30 && timeRemaining > 10;
    const isDanger = isRunning && timeRemaining <= 10;

    if (loading) {
        return <div className="min-h-screen bg-mama-dark"></div>;
    }

    if (matches.length === 0) {
        return (
            <div className="min-h-screen p-12 bg-mama-dark flex flex-col items-center justify-center relative overflow-hidden">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 60, ease: "linear" }}
                    className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"
                />

                <h1 className="text-[8rem] font-black uppercase text-white tracking-widest text-center leading-[0.85] z-10">
                    <span className="mama-highlight font-black text-black px-8">Foosball</span><br />
                    Tournament
                </h1>

                <div className="mt-16 bg-white p-4 z-10">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=http://localhost:5173" alt="QR Code" />
                </div>
                <p className="mt-6 text-3xl text-mama-pink font-black uppercase tracking-wider z-10">Scan to Register Your Team</p>
                <p className="mt-4 text-2xl text-gray-500 font-bold uppercase z-10">Service {serviceId}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-mama-dark text-white p-8 font-sans flex flex-col justify-between overflow-hidden relative">

            {/* GIANT TIMER */}
            <motion.div
                className="absolute inset-0 pointer-events-none z-0 border-[24px] border-transparent"
                animate={
                    isDanger ? { borderColor: ['#FF0066', '#1A1A1A', '#FF0066'] } :
                        isWarning ? { borderColor: ['#FFFF00', '#1A1A1A', '#FFFF00'] } :
                            { borderColor: 'transparent' }
                }
                transition={isDanger || isWarning ? { repeat: Infinity, duration: isDanger ? 0.5 : 1 } : {}}
            />

            <header className="flex justify-between items-start z-10">
                <h1 className="text-5xl font-black uppercase leading-none tracking-tight">
                    <span className="mama-highlight font-black text-black px-2">Mama</span> Shelter<br />
                    Foosball
                </h1>

                <motion.div
                    className={`font-black uppercase tracking-tighter px-8 py-2 border-4 ${isDanger ? 'text-red-500 border-red-500 bg-red-500/20' : isWarning ? 'text-mama-yellow border-mama-yellow bg-mama-yellow/20' : 'text-mama-green border-mama-green bg-mama-green/20'}`}
                    animate={isDanger ? { scale: [1, 1.1, 1], opacity: [1, 0.8, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 0.5 }}
                >
                    <span className="text-8xl leading-none">{formatTime(timeRemaining)}</span>
                </motion.div>
            </header>

            {/* NOW PLAYING BANNERS */}
            <div className="flex-1 flex flex-col justify-center gap-12 z-10 py-12">

                {/* TABLE 1 */}
                <div className="flex bg-black/80 border-l-8 border-mama-pink shadow-[12px_12px_0_var(--color-mama-pink)]">
                    <div className="w-32 bg-mama-pink flex items-center justify-center p-4">
                        <span className="text-black font-black uppercase text-3xl -rotate-90">Mesa 1</span>
                    </div>
                    {table1Match ? (
                        <div className="flex-1 flex items-stretch">
                            <div className="flex-1 flex items-center justify-center p-8 border-r-2 border-gray-800">
                                <span className={`text-6xl font-black uppercase truncate max-w-[500px] ${table1Match.team1_score > table1Match.team2_score ? 'text-white' : 'text-gray-400'}`}>
                                    {table1Match.team1?.name}
                                </span>
                            </div>
                            <div className="w-48 bg-gray-900 flex items-center justify-center flex-col">
                                <span className="text-[8rem] font-black leading-none text-mama-pink">{table1Match.team1_score}</span>
                            </div>
                            <div className="w-16 flex items-center justify-center bg-gray-950">
                                <span className="text-4xl font-black text-gray-700">VS</span>
                            </div>
                            <div className="w-48 bg-gray-900 flex items-center justify-center flex-col border-l-2 border-gray-800">
                                <span className="text-[8rem] font-black leading-none text-mama-blue">{table1Match.team2_score}</span>
                            </div>
                            <div className="flex-1 flex items-center justify-center p-8 border-l-2 border-gray-800">
                                <span className={`text-6xl font-black uppercase truncate max-w-[500px] ${table1Match.team2_score > table1Match.team1_score ? 'text-white' : 'text-gray-400'}`}>
                                    {table1Match.team2?.name}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center p-8 text-4xl font-bold text-gray-600 uppercase tracking-widest">
                            Awaiting Match
                        </div>
                    )}
                </div>

                {/* TABLE 2 */}
                <div className="flex bg-black/80 border-l-8 border-mama-blue shadow-[12px_12px_0_var(--color-mama-blue)]">
                    <div className="w-32 bg-mama-blue flex items-center justify-center p-4">
                        <span className="text-black font-black uppercase text-3xl -rotate-90">Mesa 2</span>
                    </div>
                    {table2Match ? (
                        <div className="flex-1 flex items-stretch">
                            <div className="flex-1 flex items-center justify-center p-8 border-r-2 border-gray-800">
                                <span className={`text-6xl font-black uppercase truncate max-w-[500px] ${table2Match.team1_score > table2Match.team2_score ? 'text-white' : 'text-gray-400'}`}>
                                    {table2Match.team1?.name}
                                </span>
                            </div>
                            <div className="w-48 bg-gray-900 flex items-center justify-center flex-col">
                                <span className="text-[8rem] font-black leading-none text-mama-pink">{table2Match.team1_score}</span>
                            </div>
                            <div className="w-16 flex items-center justify-center bg-gray-950">
                                <span className="text-4xl font-black text-gray-700">VS</span>
                            </div>
                            <div className="w-48 bg-gray-900 flex items-center justify-center flex-col border-l-2 border-gray-800">
                                <span className="text-[8rem] font-black leading-none text-mama-blue">{table2Match.team2_score}</span>
                            </div>
                            <div className="flex-1 flex items-center justify-center p-8 border-l-2 border-gray-800">
                                <span className={`text-6xl font-black uppercase truncate max-w-[500px] ${table2Match.team2_score > table2Match.team1_score ? 'text-white' : 'text-gray-400'}`}>
                                    {table2Match.team2?.name}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center p-8 text-4xl font-bold text-gray-600 uppercase tracking-widest">
                            Awaiting Match
                        </div>
                    )}
                </div>

            </div>

            <div className="z-10 w-full mb-2">
                <BracketTree matches={matches} />
            </div>

            <footer className="z-10 text-center flex justify-between items-end">
                <div className="text-left text-gray-500 font-bold uppercase">Service {serviceId} Active</div>

                {/* Simplified Bracket Summary */}
                <div className="flex gap-4 items-center bg-black/50 px-6 py-2 border border-gray-800">
                    <span className="text-mama-yellow font-black uppercase mr-4">Rounds:</span>
                    {[16, 8, 4, 2].map(r => (
                        <span key={r} className={`px-3 py-1 text-sm font-bold uppercase ${matches.some(m => m.round === r && (m.status === 'active' || m.status === 'pending')) ? 'text-white bg-gray-700' : 'text-gray-600'}`}>
                            {r === 2 ? 'Final' : r === 4 ? 'Semi' : `1/${r / 2}`}
                        </span>
                    ))}
                </div>
            </footer>
        </div>
    );
};
