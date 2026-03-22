import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { motion } from 'framer-motion';

export const RegistrationView = () => {
    const [teamName, setTeamName] = useState('');
    const [player1, setPlayer1] = useState('');
    const [player2, setPlayer2] = useState('');
    const [serviceId, setServiceId] = useState<1 | 2>(1);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Counts for each service
    const [counts, setCounts] = useState({ 1: 0, 2: 0 });

    useEffect(() => {
        fetchCounts();
        // Optional: could set up a realtime subscription here if we expect high concurrency
    }, []);

    const fetchCounts = async () => {
        const { data } = await supabase
            .from('teams')
            .select('service_id');

        if (data) {
            const c1 = data.filter(t => t.service_id === 1).length;
            const c2 = data.filter(t => t.service_id === 2).length;
            setCounts({ 1: c1, 2: c2 });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setErrorMsg('');

        if (counts[serviceId] >= 20) {
            setErrorMsg('This service is currently full!');
            setLoading(false);
            return;
        }

        const { error } = await supabase
            .from('teams')
            .insert([
                { name: teamName, player1, player2, service_id: serviceId }
            ]);

        if (error) {
            console.error(error);
            setErrorMsg('Error registering team. Please try again.');
        } else {
            setSuccess(true);
            fetchCounts(); // Update counts locally
        }
        setLoading(false);
    };

    if (success) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-mama-dark text-white">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="max-w-md w-full p-8 border-4 border-mama-blue bg-black/50 backdrop-blur"
                >
                    <h1 className="text-4xl font-black mb-6 uppercase text-mama-yellow">You're in!</h1>
                    <p className="text-xl mb-4 font-bold">Keep an eye on the TV screens for your match.</p>
                    <p className="text-gray-400">Team: <span className="text-white">{teamName}</span></p>
                    <button
                        onClick={() => {
                            setSuccess(false);
                            setTeamName('');
                            setPlayer1('');
                            setPlayer2('');
                        }}
                        className="mt-8 px-6 py-3 bg-mama-pink text-white font-black uppercase tracking-wider hover:bg-white hover:text-black transition-colors"
                    >
                        Register another team
                    </button>
                </motion.div>
            </div>
        );
    }

    const isFull = counts[serviceId] >= 20;

    return (
        <div className="min-h-screen flex flex-col items-center p-6 bg-mama-dark text-white">
            <div className="w-full max-w-md mt-12 mb-8 text-center">
                <img
                    src="/logo.png"
                    alt="Mama Lisboa"
                    className="w-40 h-40 mx-auto mb-6 rounded-full object-cover"
                />
                <h1 className="text-5xl font-black mb-2 uppercase leading-none tracking-tight">
                    <span className="mama-highlight font-black text-black px-2">Foosball</span><br />
                    Tournament
                </h1>
                <p className="text-mama-pink font-bold tracking-widest uppercase mt-4">Father's Day Brunch</p>
            </div>

            <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">

                {/* Service Selection */}
                <div className="space-y-3">
                    <label className="block text-sm font-bold uppercase tracking-wider text-gray-400">Select Service</label>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={() => setServiceId(1)}
                            className={`p-4 border-2 transition-all flex flex-col items-center justify-center ${serviceId === 1 ? 'border-mama-yellow bg-mama-yellow/10' : 'border-gray-600 bg-black/40 hover:border-gray-400'}`}
                        >
                            <span className={`font-black uppercase ${serviceId === 1 ? 'text-mama-yellow' : 'text-gray-300'}`}>Service 1</span>
                            <span className="text-xs text-gray-400 mt-1">12h - 14h</span>
                            <span className={`text-xs mt-2 font-bold px-2 py-1 ${counts[1] >= 16 ? 'bg-red-500/20 text-red-500' : 'bg-mama-green/20 text-mama-green'}`}>
                                {counts[1]} Teams
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setServiceId(2)}
                            className={`p-4 border-2 transition-all flex flex-col items-center justify-center ${serviceId === 2 ? 'border-mama-pink bg-mama-pink/10' : 'border-gray-600 bg-black/40 hover:border-gray-400'}`}
                        >
                            <span className={`font-black uppercase ${serviceId === 2 ? 'text-mama-pink' : 'text-gray-300'}`}>Service 2</span>
                            <span className="text-xs text-gray-400 mt-1">14h - 16h</span>
                            <span className={`text-xs mt-2 font-bold px-2 py-1 ${counts[2] >= 16 ? 'bg-red-500/20 text-red-500' : 'bg-mama-green/20 text-mama-green'}`}>
                                {counts[2]} Teams
                            </span>
                        </button>
                    </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-800">
                    <div>
                        <label className="block text-sm font-bold uppercase tracking-wider text-gray-400 mb-2">Team Name (Make it quirky!)</label>
                        <input
                            required
                            type="text"
                            value={teamName}
                            onChange={(e) => setTeamName(e.target.value)}
                            className="w-full bg-black/50 border-2 border-gray-600 focus:border-mama-blue p-4 text-white font-bold outline-none placeholder-gray-600 transition-colors focus:bg-mama-blue/5"
                            placeholder="e.g. The Foos Fighters"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold uppercase tracking-wider text-gray-400 mb-2">Player 1 Name</label>
                        <input
                            required
                            type="text"
                            value={player1}
                            onChange={(e) => setPlayer1(e.target.value)}
                            className="w-full bg-black/50 border-2 border-gray-600 focus:border-mama-blue p-4 text-white font-bold outline-none placeholder-gray-600 transition-colors focus:bg-mama-blue/5"
                            placeholder="Player 1"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold uppercase tracking-wider text-gray-400 mb-2">Player 2 Name</label>
                        <input
                            required
                            type="text"
                            value={player2}
                            onChange={(e) => setPlayer2(e.target.value)}
                            className="w-full bg-black/50 border-2 border-gray-600 focus:border-mama-blue p-4 text-white font-bold outline-none placeholder-gray-600 transition-colors focus:bg-mama-blue/5"
                            placeholder="Player 2"
                        />
                    </div>
                </div>

                {errorMsg && (
                    <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 text-sm font-bold text-center">
                        {errorMsg}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading || isFull}
                    className={`w-full p-5 mt-4 text-xl font-black uppercase tracking-widest transition-all ${isFull ? 'bg-gray-800 text-gray-500 border-2 border-gray-700 cursor-not-allowed' : 'bg-mama-yellow text-black hover:bg-white hover:-translate-y-1 shadow-[0_4px_0_var(--color-mama-pink)] hover:shadow-[0_6px_0_var(--color-mama-pink)]'}`}
                >
                    {loading ? 'Registering...' : isFull ? 'Service Full' : 'Join the Madness'}
                </button>

            </form>
        </div>
    );
};
