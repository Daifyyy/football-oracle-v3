
import React from 'react';

const TOP_LEAGUES = [
  { id: 39, name: 'Premier League' },
  { id: 140, name: 'La Liga' },
  { id: 78, name: 'Bundesliga' },
  { id: 135, name: 'Serie A' },
  { id: 61, name: 'Ligue 1' },
  { id: 273, name: 'Sudamericana' }
];

interface LeagueSidebarProps {
  selectedLeagueId: number;
  onLeagueSelect: (id: number) => void;
}

const LeagueSidebar: React.FC<LeagueSidebarProps> = ({ selectedLeagueId, onLeagueSelect }) => {
  return (
    <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/60 rounded-[1.5rem] p-5 shadow-xl">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-1 h-5 bg-blue-600 rounded-full"></div>
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Sectors</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {TOP_LEAGUES.map((league) => (
          <button
            key={league.id}
            onClick={() => onLeagueSelect(league.id)}
            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-300 group ${
              selectedLeagueId === league.id 
              ? 'bg-blue-600/10 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
              : 'bg-slate-950/40 border-slate-800/60 hover:border-slate-700'
            }`}
          >
            <div className="w-8 h-8 mb-2 bg-white/5 p-1 rounded-lg flex items-center justify-center transition-colors">
              <img 
                src={`https://media.api-sports.io/football/leagues/${league.id}.png`} 
                className={`w-full h-full object-contain ${selectedLeagueId === league.id ? 'opacity-100' : 'opacity-40 grayscale group-hover:grayscale-0'}`} 
                alt={league.name} 
              />
            </div>
            <span className={`text-[8px] font-black uppercase tracking-tighter text-center leading-tight ${
              selectedLeagueId === league.id ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'
            }`}>
              {league.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default LeagueSidebar;
