const getMatch = (matches: any[], r: number, idx: number) => {
    const roundMatches = matches
        .filter(m => m.round === r)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return roundMatches[idx];
};

const MatchBox = ({ match, activeMatches, isFinal = false, isAdminMode, onClick }: any) => {
    if (!match) {
        return <div className={`w-36 h-[3.5rem] border border-dashed border-gray-700 bg-black/20 my-2 ${isFinal ? 'scale-125' : ''}`}></div>;
    }

    const isActive = activeMatches.some((m: any) => m.id === match.id);
    const tableNum = isActive ? activeMatches.find((m: any) => m.id === match.id)?.table_number : null;

    const glowClass = isActive ? (tableNum === 1 ? 'border-mama-pink shadow-[0_0_15px_var(--color-mama-pink)] z-10' : 'border-mama-blue shadow-[0_0_15px_var(--color-mama-blue)] z-10') : 'border-gray-700';
    const hoverClass = isAdminMode ? 'cursor-pointer hover:border-white transition-colors' : '';

    return (
        <div 
            className={`w-36 bg-black/80 border ${glowClass} ${hoverClass} flex flex-col justify-center relative my-2 ${isFinal ? 'scale-125' : ''}`}
            onClick={() => isAdminMode && onClick && onClick(match)}
        >
            {isActive && (
                <div className={`absolute -bottom-2 -right-2 text-[9px] font-black uppercase px-2 py-0.5 text-black ${tableNum === 1 ? 'bg-mama-pink' : 'bg-mama-blue'}`}>
                    Mesa {tableNum}
                </div>
            )}
            {match.winner_id && (
                <div className="absolute -top-3 left-2 text-[9px] font-black uppercase px-2 py-0.5 bg-mama-green text-black">
                    Finished
                </div>
            )}
            <div className={`flex justify-between items-center px-2 py-1 text-[11px] font-bold uppercase border-b border-gray-800 ${match.winner_id === match.team1_id ? 'text-white bg-gray-900' : match.winner_id ? 'text-gray-700' : 'text-gray-300'} ${!match.team1_id ? 'italic !text-gray-600' : ''}`}>
                <span className="truncate mr-2">{match.team1?.name || (match.status === 'completed' && !match.team1_id ? 'BYE' : 'TBD')}</span>
                {(match.status === 'active' || match.status === 'completed') && match.team1_id && (
                    <span className={`font-black ${match.winner_id === match.team1_id ? 'text-mama-green' : ''}`}>
                        {match.team1_score || 0}
                    </span>
                )}
            </div>
            <div className={`flex justify-between items-center px-2 py-1 text-[11px] font-bold uppercase ${match.winner_id === match.team2_id ? 'text-white bg-gray-900' : match.winner_id ? 'text-gray-700' : 'text-gray-300'} ${!match.team2_id ? 'italic !text-gray-600' : ''}`}>
                <span className="truncate mr-2">{match.team2?.name || (match.status === 'completed' && !match.team2_id ? 'BYE' : 'TBD')}</span>
                {(match.status === 'active' || match.status === 'completed') && match.team2_id && (
                    <span className={`font-black ${match.winner_id === match.team2_id ? 'text-mama-green' : ''}`}>
                        {match.team2_score || 0}
                    </span>
                )}
            </div>
        </div>
    );
};

const MatchColumn = ({ round, indices, matches, activeMatches, isAdminMode, onMatchClick }: any) => (
    <div className="flex flex-col justify-around h-full py-4">
        {indices.map((i: number) => <MatchBox key={i} match={getMatch(matches, round, i)} activeMatches={activeMatches} isAdminMode={isAdminMode} onClick={onMatchClick} />)}
    </div>
);

export const BracketTree = ({ matches, isAdminMode = false, onMatchClick }: { matches: any[], isAdminMode?: boolean, onMatchClick?: (match: any) => void }) => {
    // Determine active matches
    const activeMatches = matches.filter(m => m.status === 'active');

    return (
        <div className="flex w-full h-full justify-between items-stretch bg-black/40 border border-gray-800 p-4 relative overflow-hidden">
            {/* Subtle background branding */}
            <h2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10rem] font-black text-white/5 uppercase select-none pointer-events-none tracking-tighter mix-blend-overlay">Bracket</h2>

            {/* LEFT SIDE (Matches 0-3 for R16, 0-1 for R8, 0 for R4) */}
            <div className="flex w-[42%] justify-between z-10">
                <MatchColumn round={16} indices={[0, 1, 2, 3]} matches={matches} activeMatches={activeMatches} isAdminMode={isAdminMode} onMatchClick={onMatchClick} />
                <MatchColumn round={8} indices={[0, 1]} matches={matches} activeMatches={activeMatches} isAdminMode={isAdminMode} onMatchClick={onMatchClick} />
                <MatchColumn round={4} indices={[0]} matches={matches} activeMatches={activeMatches} isAdminMode={isAdminMode} onMatchClick={onMatchClick} />
            </div>

            {/* CENTER FINAL (R2) */}
            <div className="flex w-[16%] justify-center items-center z-10 relative">
                <div className="flex flex-col items-center">
                    <span className="text-mama-yellow font-black uppercase tracking-widest mb-4 bg-black/50 px-3 py-1 border border-mama-yellow/30">Final</span>
                    <MatchBox match={getMatch(matches, 2, 0)} activeMatches={activeMatches} isFinal={true} isAdminMode={isAdminMode} onClick={onMatchClick} />
                </div>
            </div>

            {/* RIGHT SIDE (Matches 4-7 for R16, 2-3 for R8, 1 for R4) */}
            <div className="flex w-[42%] justify-between flex-row-reverse z-10">
                <MatchColumn round={16} indices={[4, 5, 6, 7]} matches={matches} activeMatches={activeMatches} isAdminMode={isAdminMode} onMatchClick={onMatchClick} />
                <MatchColumn round={8} indices={[2, 3]} matches={matches} activeMatches={activeMatches} isAdminMode={isAdminMode} onMatchClick={onMatchClick} />
                <MatchColumn round={4} indices={[1]} matches={matches} activeMatches={activeMatches} isAdminMode={isAdminMode} onMatchClick={onMatchClick} />
            </div>
        </div>
    );
};
