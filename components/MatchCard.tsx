
import React from 'react';
import { PredictionResponse } from '../types';

interface MatchCardProps {
  data: PredictionResponse;
  fixtureStatus?: string;
  realScore?: { home: number | null; away: number | null };
}

const MatchCard: React.FC<MatchCardProps> = ({ data, fixtureStatus, realScore }) => {
  const { predictions, teams } = data;
  
  const homePercent = parseFloat(predictions.percent.home.replace('%', ''));
  const drawPercent = parseFloat(predictions.percent.draw.replace('%', ''));
  const awayPercent = parseFloat(predictions.percent.away.replace('%', ''));

  // Logika úspěšnosti predikce (Backtesting)
  const accuracyResult = React.useMemo(() => {
    if (fixtureStatus !== 'FT' || !realScore) return null;
    const { home, away } = realScore;
    if (home === null || away === null) return null;

    const predictedWinnerId = predictions.winner.id;
    let actualWinnerId: number | null = null;
    if (home > away) actualWinnerId = teams.home.id;
    else if (away > home) actualWinnerId = teams.away.id;
    else actualWinnerId = null; // Draw

    const isMatch = predictedWinnerId === actualWinnerId;
    return isMatch;
  }, [fixtureStatus, realScore, predictions, teams]);

  return (
    <div className={`relative overflow-hidden bg-slate-900 border transition-all duration-500 rounded-[2.5rem] p-10 shadow-2xl ${
      accuracyResult === true ? 'border-green-500/50 shadow-green-500/5' : 
      accuracyResult === false ? 'border-red-500/50 shadow-red-500/5' : 
      'border-slate-800'
    }`}>
      {/* Dynamic Glow Background */}
      <div className={`absolute top-0 right-0 w-80 h-80 blur-[120px] -mr-40 -mt-40 transition-colors duration-1000 ${
        accuracyResult === true ? 'bg-green-500/10' : 
        accuracyResult === false ? 'bg-red-500/10' : 
        'bg-blue-600/5'
      }`}></div>
      
      {/* Accuracy Tag */}
      {accuracyResult !== null && (
        <div className={`absolute top-8 right-8 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.3em] border ${
          accuracyResult ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'
        }`}>
          {accuracyResult ? 'Prediction Correct' : 'Variance Detected'}
        </div>
      )}

      {/* Main Teams Interaction */}
      <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-12 mb-12 relative z-10">
        <div className="text-center group">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
            <img src={teams.home.logo} className="w-24 h-24 object-contain relative drop-shadow-2xl grayscale-[0.2] group-hover:grayscale-0 transition-all" alt="" />
          </div>
          <h3 className="text-xl font-black text-white leading-tight uppercase tracking-tight">{teams.home.name}</h3>
          <p className="text-blue-500 font-mono text-sm mt-2 font-bold">{predictions.percent.home}</p>
        </div>

        <div className="text-center flex flex-col items-center">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-4">Probability Map</span>
          
          {fixtureStatus === 'FT' && realScore ? (
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-6 text-5xl font-black italic tracking-tighter text-white">
                <span className={accuracyResult === true ? 'text-green-400' : ''}>{realScore.home}</span>
                <span className="text-slate-800 text-3xl">:</span>
                <span className={accuracyResult === true ? 'text-green-400' : ''}>{realScore.away}</span>
              </div>
              <div className="mt-4 px-4 py-1.5 bg-slate-950 rounded-full border border-slate-800 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                Final Result
              </div>
            </div>
          ) : (
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-2 border-slate-800 flex items-center justify-center text-sm font-black text-blue-500 bg-slate-950/50 backdrop-blur-sm">VS</div>
              <div className="absolute -inset-2 border border-blue-500/10 rounded-full animate-ping"></div>
            </div>
          )}
        </div>

        <div className="text-center group">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-red-500/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
            <img src={teams.away.logo} className="w-24 h-24 object-contain relative drop-shadow-2xl grayscale-[0.2] group-hover:grayscale-0 transition-all" alt="" />
          </div>
          <h3 className="text-xl font-black text-white leading-tight uppercase tracking-tight">{teams.away.name}</h3>
          <p className="text-red-500 font-mono text-sm mt-2 font-bold">{predictions.percent.away}</p>
        </div>
      </div>

      {/* Percentage Visualizer */}
      <div className="space-y-6 relative z-10 max-w-2xl mx-auto">
        <div className="h-4 w-full bg-slate-950 rounded-full overflow-hidden flex shadow-2xl border border-white/5 p-1">
          <div 
            className="h-full bg-gradient-to-r from-blue-700 to-blue-500 rounded-full transition-all duration-[1.5s] ease-out shadow-lg" 
            style={{ width: `${homePercent}%` }}
          />
          <div 
            className="h-full bg-slate-700 transition-all duration-[1.5s] ease-out mx-1 rounded-full" 
            style={{ width: `${drawPercent}%` }}
          />
          <div 
            className="h-full bg-gradient-to-l from-red-700 to-red-500 rounded-full transition-all duration-[1.5s] ease-out ml-auto shadow-lg" 
            style={{ width: `${awayPercent}%` }}
          />
        </div>
        
        <div className="flex justify-between items-center px-2">
           <div className="flex flex-col items-start">
             <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Home Advantage</span>
             <span className="text-lg font-mono font-black text-white">{predictions.percent.home}</span>
           </div>
           <div className="flex flex-col items-center">
             <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Draw Factor</span>
             <span className="text-lg font-mono font-black text-slate-400">{predictions.percent.draw}</span>
           </div>
           <div className="flex flex-col items-end">
             <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Away Threat</span>
             <span className="text-lg font-mono font-black text-white">{predictions.percent.away}</span>
           </div>
        </div>
      </div>

      {/* Outcome Analysis */}
      <div className="mt-12 pt-10 border-t border-slate-800/50 flex flex-col md:flex-row gap-10 relative z-10">
         <div className="flex-1 flex gap-6 items-start">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
               <i className="fas fa-brain text-indigo-400 text-xl"></i>
            </div>
            <div>
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 block">Oracle Intelligence</span>
               <p className="text-sm text-slate-300 font-bold italic leading-relaxed">
                 Predicted Winner: <span className={`uppercase tracking-tighter ${accuracyResult === true ? 'text-green-400' : accuracyResult === false ? 'text-red-400' : 'text-blue-400'}`}>
                   {predictions.winner.name || 'No Clear Consensus'}
                 </span>
               </p>
               <p className="text-[11px] text-slate-500 mt-2">{predictions.winner.comment || 'AI Confidence Score: Calculated based on 15+ metrics.'}</p>
            </div>
         </div>
         
         <div className="flex-1 flex gap-6 items-start">
            <div className="w-14 h-14 rounded-2xl bg-amber-600/10 border border-amber-500/20 flex items-center justify-center shrink-0">
               <i className="fas fa-bullseye text-amber-400 text-xl"></i>
            </div>
            <div>
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 block">Match Advice</span>
               <p className="text-sm text-slate-300 font-bold leading-relaxed">
                 {predictions.advice}
               </p>
               {predictions.under_over && (
                 <p className="text-[10px] font-black text-blue-500 uppercase mt-2">Projection: {predictions.under_over} Goals</p>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};

export default MatchCard;
