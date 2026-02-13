
import React from 'react';
import { PredictionResponse } from '../types';

interface MatchCardProps {
  data: PredictionResponse;
  fixtureStatus?: string;
  realScore?: { home: number | null; away: number | null };
}

const MatchCard: React.FC<MatchCardProps> = ({ data, fixtureStatus, realScore }) => {
  const { predictions, teams, comparison } = data;

  const metrics = [
    { key: 'total', label: 'STRENGTH' },
    { key: 'att', label: 'ATTACK' },
    { key: 'def', label: 'DEFENSE' },
    { key: 'poisson_distribution', label: 'POISSON' },
    { key: 'h2h', label: 'H2H STR' },
    { key: 'goals', label: 'H2H GOALS' },
    { key: 'percent', label: 'WIN PROB' }
  ];

  const getPoints = (side: 'home' | 'away') => {
    const stats = metrics.map(m => {
      if (m.key === 'percent') return parseFloat(data.predictions.percent[side]);
      return parseFloat(comparison[m.key][side]);
    });
    
    const center = 100;
    const radius = 80;
    return stats.map((val, i) => {
      const angle = (Math.PI * 2 * i) / stats.length - Math.PI / 2;
      const r = (val / 100) * radius;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      return `${x},${y}`;
    }).join(' ');
  };

  const renderBar = (label: string, homeVal: string, awayVal: string) => {
    const h = parseFloat(homeVal);
    const a = parseFloat(awayVal);
    const total = h + a || 1;
    const hPerc = (h / total) * 100;

    return (
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
           <span>{h}%</span>
           <span className="text-slate-300">{label}</span>
           <span>{a}%</span>
        </div>
        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
          <div className="h-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] transition-all duration-1000" style={{ width: `${hPerc}%` }}></div>
          <div className="h-full bg-lime-400 shadow-[0_0_8px_rgba(163,230,53,0.5)] transition-all duration-1000" style={{ width: `${100 - hPerc}%` }}></div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
      <div className="flex flex-col md:flex-row items-center justify-between gap-12 mb-12">
        <div className="flex-1 flex flex-col items-center">
          <img src={teams.home.logo} className="w-20 h-20 object-contain mb-4" alt="" />
          <h3 className="text-lg font-black text-white uppercase text-center">{teams.home.name}</h3>
          <div className="flex items-center gap-2 mt-2">
             <div className="w-3 h-3 bg-blue-500 rounded"></div>
             <span className="text-[10px] font-bold text-slate-500 uppercase">Home</span>
          </div>
        </div>

        <div className="flex flex-col items-center">
          {fixtureStatus === 'FT' && realScore ? (
            <div className="text-6xl font-black italic tracking-tighter text-white">
              {realScore.home} : {realScore.away}
            </div>
          ) : (
             <div className="px-6 py-2 bg-slate-950 border border-slate-800 rounded-full text-xs font-black text-blue-500 tracking-widest">PROJECTION</div>
          )}
        </div>

        <div className="flex-1 flex flex-col items-center">
          <img src={teams.away.logo} className="w-20 h-20 object-contain mb-4" alt="" />
          <h3 className="text-lg font-black text-white uppercase text-center">{teams.away.name}</h3>
          <div className="flex items-center gap-2 mt-2">
             <div className="w-3 h-3 bg-lime-400 rounded"></div>
             <span className="text-[10px] font-bold text-slate-500 uppercase">Away</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Radar Chart */}
        <div className="flex justify-center py-6">
          <svg width="280" height="280" viewBox="0 0 200 200" className="overflow-visible">
            {/* Grid */}
            {[0.2, 0.4, 0.6, 0.8, 1].map((r) => (
              <polygon
                key={r}
                points={Array.from({ length: 7 }).map((_, i) => {
                  const angle = (Math.PI * 2 * i) / 7 - Math.PI / 2;
                  const x = 100 + 80 * r * Math.cos(angle);
                  const y = 100 + 80 * r * Math.sin(angle);
                  return `${x},${y}`;
                }).join(' ')}
                fill="none"
                stroke="#1e293b"
                strokeWidth="1"
              />
            ))}
            {/* Spikes & Labels */}
            {metrics.map((m, i) => {
              const angle = (Math.PI * 2 * i) / 7 - Math.PI / 2;
              const x2 = 100 + 80 * Math.cos(angle);
              const y2 = 100 + 80 * Math.sin(angle);
              const lx = 100 + 95 * Math.cos(angle);
              const ly = 100 + 95 * Math.sin(angle);
              
              return (
                <g key={i}>
                  <line
                    x1="100" y1="100"
                    x2={x2} y2={y2}
                    stroke="#1e293b"
                    strokeWidth="1"
                  />
                  <text 
                    x={lx} 
                    y={ly} 
                    fill="#64748b" 
                    fontSize="7" 
                    fontWeight="900" 
                    textAnchor="middle" 
                    dominantBaseline="middle"
                    className="uppercase tracking-tighter"
                  >
                    {m.label}
                  </text>
                </g>
              );
            })}
            {/* Data Polygons */}
            <polygon
              points={getPoints('home')}
              fill="rgba(59, 130, 246, 0.3)"
              stroke="#3b82f6"
              strokeWidth="2"
            />
            <polygon
              points={getPoints('away')}
              fill="rgba(163, 230, 53, 0.3)"
              stroke="#a3e635"
              strokeWidth="2"
            />
          </svg>
        </div>

        {/* Comparison Bars */}
        <div className="space-y-6">
          {renderBar('Strength', comparison.total.home, comparison.total.away)}
          {renderBar('Attacking Potential', comparison.att.home, comparison.att.away)}
          {renderBar('Defensive Potential', comparison.def.home, comparison.def.away)}
          {renderBar('Poisson Distribution', comparison.poisson_distribution.home, comparison.poisson_distribution.away)}
          {renderBar('Strength H2H', comparison.h2h.home, comparison.h2h.away)}
          {renderBar('Goals H2H', comparison.goals.home, comparison.goals.away)}
          {renderBar('Wins the Game', predictions.percent.home, predictions.percent.away)}
        </div>
      </div>

      <div className="mt-12 text-center p-6 bg-blue-500/5 border border-blue-500/20 rounded-3xl">
         <p className="text-xs font-black uppercase tracking-[0.4em] text-blue-500 mb-2">Advice</p>
         <p className="text-xl font-black text-white uppercase italic tracking-tighter">{predictions.advice}</p>
      </div>
    </div>
  );
};

export default MatchCard;
