import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { motion } from 'framer-motion';

export const PublicTeamsView = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const serviceId = urlParams.get('service') === '2' ? 2 : 1;
    const [teams, setTeams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTeams();

        const channel = supabase
            .channel('public-teams')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'teams', filter: `service_id=eq.${serviceId}` }, () => {
                fetchTeams();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchTeams = async () => {
        const { data } = await supabase.from('teams').select('*').eq('service_id', serviceId).order('created_at', { ascending: true });
        if (data) setTeams(data);
        setLoading(false);
    };

    if (loading) {
        return <div className="min-h-screen bg-mama-dark text-white p-6 flex justify-center items-center">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-mama-dark text-white p-6 md:p-12 font-sans">
            <div className="max-w-4xl mx-auto">
                <header className="text-center mb-12">
                    <h1 className="text-5xl md:text-6xl font-black uppercase leading-none tracking-tight mb-4">
                        <span className="mama-highlight font-black text-black px-2">Registered</span><br />
                        Teams
                    </h1>
                    <p className="text-2xl text-mama-pink font-bold tracking-widest uppercase">Service {serviceId}</p>
                    <p className="text-gray-400 font-bold uppercase mt-2">{teams.length} / 16 Spots Filled</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {teams.length === 0 ? (
                        <div className="col-span-1 md:col-span-2 text-center p-12 bg-black/40 border-2 border-gray-800">
                            <p className="text-2xl font-bold uppercase text-gray-500 tracking-widest">No teams registered yet.</p>
                        </div>
                    ) : (
                        teams.map((team, index) => (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                key={team.id}
                                className={`p-6 border-l-8 bg-black/60 flex flex-col justify-center shadow-lg ${serviceId === 1 ? 'border-mama-yellow' : 'border-mama-pink'}`}
                            >
                                <h2 className="text-2xl font-black uppercase text-white truncate">{team.name}</h2>
                                <div className="mt-2 flex items-center space-x-2 text-gray-400 font-bold uppercase text-sm">
                                    <span>{team.player1}</span>
                                    <span className="text-mama-blue">&amp;</span>
                                    <span>{team.player2}</span>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>

                {teams.length < 16 && (
                    <div className="mt-12 text-center">
                        <a href="/" className="inline-block px-8 py-4 bg-mama-blue text-black font-black uppercase tracking-wider hover:bg-white hover:-translate-y-1 transition-all shadow-[0_4px_0_var(--color-mama-pink)]">
                            Register Now
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
};
