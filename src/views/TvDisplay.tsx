import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { motion } from 'framer-motion';
import { BracketTree } from '../components/BracketTree';

export const TvDisplay = () => {
    // Auto-detect which service has active matches, or fall back to query param / default
    const urlParams = new URLSearchParams(window.location.search);
    const defaultService = urlParams.get('service') === '2' ? 2 : 1;

    const [serviceId, setServiceId] = useState(defaultService);
    const [matches, setMatches] = useState<any[]>([]);
    const [timerState, setTimerState] = useState<any>(null);
    const [timeRemaining, setTimeRemaining] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    // Use a ref so fetchData always uses the latest serviceId
    const serviceIdRef = { current: serviceId };

    useEffect(() => {
        serviceIdRef.current = serviceId;
        fetchData(serviceId);
    }, [serviceId]);

    useEffect(() => {
        // Listen for data changes
        const dataChannel = supabase
            .channel('tv-data-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
                fetchData(serviceIdRef.current);
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_state' }, () => {
                fetchData(serviceIdRef.current);
            })
            .subscribe();

        // Listen for admin service selection broadcasts
        const controlChannel = supabase
            .channel('tv-control')
            .on('broadcast', { event: 'service-change' }, (payload: any) => {
                const newService = payload.payload?.serviceId;
                if (newService === 1 || newService === 2) {
                    setServiceId(newService);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(dataChannel);
            supabase.removeChannel(controlChannel);
        };
    }, []);

    const fetchData = async (sId: number) => {
        const { data: matchesData } = await supabase.from('matches').select('*, team1:team1_id(name), team2:team2_id(name)').eq('service_id', sId).order('round', { ascending: false });

        if (matchesData) setMatches(matchesData);

        const { data: stateData } = await supabase.from('tournament_state').select('*').eq('service_id', sId).single();
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
        return <div className="h-screen bg-mama-dark"></div>;
    }

    if (matches.length === 0) {
        return (
            <div className="h-screen p-12 bg-mama-dark flex flex-col items-center justify-center relative overflow-hidden">
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
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://mamasoccer.vercel.app`} alt="QR Code" />
                </div>
                <p className="mt-6 text-3xl text-mama-pink font-black uppercase tracking-wider z-10">Scan to Register Your Team</p>
                <p className="mt-4 text-2xl text-gray-500 font-bold uppercase z-10">Service {serviceId}</p>
            </div>
        );
    }

    // Table match card renderer (compact for TV)
    const TableMatchCard = ({ match, tableNum, color }: { match: any, tableNum: number, color: string }) => {
        const colorClasses = color === 'pink' 
            ? { border: 'border-mama-pink', bg: 'bg-mama-pink', shadow: 'shadow-[6px_6px_0_var(--color-mama-pink)]', score: 'text-mama-pink' }
            : { border: 'border-mama-blue', bg: 'bg-mama-blue', shadow: 'shadow-[6px_6px_0_var(--color-mama-blue)]', score: 'text-mama-blue' };

        return (
            <div className={`flex bg-black/80 border-l-4 ${colorClasses.border} ${colorClasses.shadow}`}>
                <div className={`w-16 ${colorClasses.bg} flex items-center justify-center shrink-0`}>
                    <span className="text-black font-black uppercase text-lg -rotate-90 whitespace-nowrap">Mesa {tableNum}</span>
                </div>
                {match ? (
                    <div className="flex-1 flex items-stretch">
                        <div className="flex-1 flex items-center justify-center px-4 py-2 border-r border-gray-800">
                            <span className={`text-2xl 2xl:text-4xl font-black uppercase truncate ${match.team1_score > match.team2_score ? 'text-white' : 'text-gray-400'}`}>
                                {match.team1?.name}
                            </span>
                        </div>
                        <div className="w-20 2xl:w-28 bg-gray-900 flex items-center justify-center">
                            <span className={`text-4xl 2xl:text-6xl font-black leading-none ${colorClasses.score}`}>{match.team1_score}</span>
                        </div>
                        <div className="w-10 flex items-center justify-center bg-gray-950">
                            <span className="text-xl font-black text-gray-700">VS</span>
                        </div>
                        <div className="w-20 2xl:w-28 bg-gray-900 flex items-center justify-center border-l border-gray-800">
                            <span className={`text-4xl 2xl:text-6xl font-black leading-none ${colorClasses.score}`}>{match.team2_score}</span>
                        </div>
                        <div className="flex-1 flex items-center justify-center px-4 py-2 border-l border-gray-800">
                            <span className={`text-2xl 2xl:text-4xl font-black uppercase truncate ${match.team2_score > match.team1_score ? 'text-white' : 'text-gray-400'}`}>
                                {match.team2?.name}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center px-4 py-2 text-2xl font-bold text-gray-600 uppercase tracking-widest">
                        Awaiting Match
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="h-screen bg-mama-dark text-white p-4 2xl:p-6 font-sans flex flex-col overflow-hidden relative">

            {/* GIANT TIMER BORDER FLASH */}
            <motion.div
                className="absolute inset-0 pointer-events-none z-0 border-[16px] border-transparent"
                animate={
                    isDanger ? { borderColor: ['#FF0066', '#1A1A1A', '#FF0066'] } :
                        isWarning ? { borderColor: ['#FFFF00', '#1A1A1A', '#FFFF00'] } :
                            { borderColor: 'transparent' }
                }
                transition={isDanger || isWarning ? { repeat: Infinity, duration: isDanger ? 0.5 : 1 } : {}}
            />

            {/* HEADER: Title + Timer */}
            <header className="flex justify-between items-center z-10 shrink-0 mb-2">
                <h1 className="text-2xl 2xl:text-4xl font-black uppercase leading-none tracking-tight">
                    <span className="mama-highlight font-black text-black px-2">Mama</span> Shelter Foosball
                </h1>

                <motion.div
                    className={`font-black uppercase tracking-tighter px-4 py-1 border-4 ${isDanger ? 'text-red-500 border-red-500 bg-red-500/20' : isWarning ? 'text-mama-yellow border-mama-yellow bg-mama-yellow/20' : 'text-mama-green border-mama-green bg-mama-green/20'}`}
                    animate={isDanger ? { scale: [1, 1.1, 1], opacity: [1, 0.8, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 0.5 }}
                >
                    <span className="text-5xl 2xl:text-7xl leading-none">{formatTime(timeRemaining)}</span>
                </motion.div>
            </header>

            {/* NOW PLAYING - compact */}
            <div className="z-10 shrink-0 flex flex-col gap-2 mb-2">
                <TableMatchCard match={table1Match} tableNum={1} color="pink" />
                <TableMatchCard match={table2Match} tableNum={2} color="blue" />
            </div>

            {/* BRACKET - fills remaining space */}
            <div className="z-10 flex-1 min-h-0 w-full">
                <BracketTree matches={matches} />
            </div>

            {/* FOOTER */}
            <footer className="z-10 flex justify-between items-center shrink-0 mt-1">
                <div className="text-gray-500 font-bold uppercase text-xs">Service {serviceId} Active</div>
                <div className="flex gap-2 items-center bg-black/50 px-3 py-1 border border-gray-800">
                    <span className="text-mama-yellow font-black uppercase text-xs mr-2">Rounds:</span>
                    {[16, 8, 4, 2].map(r => (
                        <span key={r} className={`px-2 py-0.5 text-xs font-bold uppercase ${matches.some(m => m.round === r && (m.status === 'active' || m.status === 'pending')) ? 'text-white bg-gray-700' : 'text-gray-600'}`}>
                            {r === 2 ? 'Final' : r === 4 ? 'Semi' : `1/${r / 2}`}
                        </span>
                    ))}
                </div>
            </footer>
        </div>
    );
};
