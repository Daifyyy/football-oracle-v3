
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getPredictions, getFixtures, getTeamStatistics } from './services/apiService';
import { PredictionResponse, Fixture } from './types';
import MatchCard from './components/MatchCard';
import LeagueSidebar from './components/LeagueSidebar';
import { GoogleGenAI } from "@google/genai";

type DateType = 'yesterday' | 'today' | 'tomorrow';

const App: React.FC = () => {
  const [fixturesMap, setFixturesMap] = useState<Record<DateType, Fixture[] | null>>({
    yesterday: null,
    today: null,
    tomorrow: null
  });
  
  const [activeDateTab, setActiveDateTab] = useState<DateType>('today');
  const [selectedLeagueId, setSelectedLeagueId] = useState<number>(39);
  const [selectedFixtureId, setSelectedFixtureId] = useState<number | null>(null);
  const [predictionData, setPredictionData] = useState<PredictionResponse | null>(null);
  const [homeTeamStats, setHomeTeamStats] = useState<any>(null);
  const [awayTeamStats, setAwayTeamStats] = useState<any>(null);
  const [tacticalPreview, setTacticalPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFixturesLoading, setIsFixturesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dates = useMemo(() => {
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    
    return {
      yesterday: yesterday.toISOString().split('T')[0],
      today: today.toISOString().split('T')[0],
      tomorrow: tomorrow.toISOString().split('T')[0]
    };
  }, []);

  const loadFixtures = useCallback(async (tab: DateType) => {
    if (fixturesMap[tab]) return;
    setIsFixturesLoading(true);
    try {
      const data = await getFixtures(dates[tab]);
      setFixturesMap(prev => ({ ...prev, [tab]: data }));
    } catch (err) {
      setError("Uplink failed.");
    } finally {
      setIsFixturesLoading(false);
    }
  }, [fixturesMap, dates]);

  useEffect(() => {
    loadFixtures(activeDateTab);
  }, [activeDateTab, loadFixtures]);

  const handleAnalyze = async (fixtureId: number) => {
    setSelectedFixtureId(fixtureId);
    setIsLoading(true);
    setError(null);
    setPredictionData(null);
    setTacticalPreview(null);
    setHomeTeamStats(null);
    setAwayTeamStats(null);

    const matchInfo = filteredFixtures.find(f => f.fixture.id === fixtureId);

    try {
      const data = await getPredictions(fixtureId);
      if (data && matchInfo) {
        setPredictionData(data);
        const [homeStats, awayStats] = await Promise.all([
          getTeamStatistics(matchInfo.teams.home.id, matchInfo.league.id, 2025),
          getTeamStatistics(matchInfo.teams.away.id, matchInfo.league.id, 2025)
        ]);
        setHomeTeamStats(homeStats);
        setAwayTeamStats(awayStats);

        // Verification of API_KEY presence before call
        if (!process.env.API_KEY) {
          throw new Error("Missing Gemini API Key in environment.");
        }

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const result = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Analyzuj fotbalový zápas v českém jazyce.
            Zápas: ${matchInfo.teams.home.name} vs ${matchInfo.teams.away.name}
            Domácí forma: ${homeStats?.form || 'N/A'}
            Hosté forma: ${awayStats?.form || 'N/A'}
            Doporučení: ${data.predictions.advice}
            Vytvoř jeden profesionální, stručný odstavec o taktice a co očekávat.`,
        });
        
        setTacticalPreview(result.text || "Analýza dokončena.");
      }
    } catch (err) {
      console.error("Neural analysis failed:", err);
      setError("Neural analysis failed. Verify API configuration.");
      setTacticalPreview("Nepodařilo se vygenerovat report. Ujistěte se, že je v prostředí Vercelu správně nastaven 'API_KEY'.");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredFixtures = useMemo(() => {
    const list = fixturesMap[activeDateTab] || [];
    return list.filter(f => f.league.id === selectedLeagueId);
  }, [fixturesMap, activeDateTab, selectedLeagueId]);

  const selectedMatchInfo = useMemo(() => {
    if (!selectedFixtureId) return null;
    return filteredFixtures.find(f => f.fixture.id === selectedFixtureId);
  }, [selectedFixtureId, filteredFixtures]);

  const renderStatsTable = () => {
    if (!homeTeamStats || !awayTeamStats) return null;

    const categories = [
      { label: 'Games played', path: 'fixtures.played' },
      { label: 'Wins', path: 'fixtures.wins' },
      { label: 'Draws', path: 'fixtures.draws' },
      { label: 'Loss', path: 'fixtures.loses' },
      { label: 'Goals For', path: 'goals.for.total' },
      { label: 'Goals Against', path: 'goals.against.total' },
      { label: 'Goals For Avg', path: 'goals.for.average' },
      { label: 'Goals Against Avg', path: 'goals.against.average' },
    ];

    const getVal = (obj: any, path: string, type: 'home' | 'away') => {
      const parts = path.split('.');
      let current = obj;
      for (const p of parts) {
        if (!current) return '0';
        current = current[p];
      }
      return current?.[type] ?? '0';
    };

    return (
      <div className="mt-12 bg-slate-900/50 border border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-slate-800 bg-slate-900/80 flex justify-between items-center">
           <div className="flex items-center gap-6">
             <img src={homeTeamStats.team.logo} className="w-10 h-10 object-contain" alt="" />
             <span className="text-sm font-black text-blue-500 uppercase">{homeTeamStats.team.name}</span>
           </div>
           <span className="text-xs font-black text-slate-500 uppercase tracking-widest italic">VS</span>
           <div className="flex items-center gap-6">
             <span className="text-sm font-black text-lime-400 uppercase">{awayTeamStats.team.name}</span>
             <img src={awayTeamStats.team.logo} className="w-10 h-10 object-contain" alt="" />
           </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/40 text-[9px] font-black uppercase tracking-widest text-slate-500">
                <th className="px-8 py-4 border-r border-slate-800">CATEGORY</th>
                <th className="px-4 py-4 text-center border-r border-slate-800 bg-blue-500/5">H</th>
                <th className="px-4 py-4 text-center border-r border-slate-800 bg-blue-500/5">A</th>
                <th className="px-4 py-4 text-center border-r border-slate-800 bg-lime-500/5">H</th>
                <th className="px-4 py-4 text-center bg-lime-500/5">A</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {categories.map((cat, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td className="px-8 py-4 text-xs font-bold text-slate-400 border-r border-slate-800">{cat.label}</td>
                  <td className="px-4 py-4 text-center font-mono text-xs text-blue-400 border-r border-slate-800">{getVal(homeTeamStats, cat.path, 'home')}</td>
                  <td className="px-4 py-4 text-center font-mono text-xs text-blue-400 border-r border-slate-800">{getVal(homeTeamStats, cat.path, 'away')}</td>
                  <td className="px-4 py-4 text-center font-mono text-xs text-lime-400 border-r border-slate-800">{getVal(awayTeamStats, cat.path, 'home')}</td>
                  <td className="px-4 py-4 text-center font-mono text-xs text-lime-400">{getVal(awayTeamStats, cat.path, 'away')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col selection:bg-blue-500/30">
      <header className="border-b border-slate-800 bg-[#020617]/90 backdrop-blur-xl px-6 py-4 flex flex-col md:flex-row justify-between items-center sticky top-0 z-50 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <i className="fas fa-microchip text-white text-lg"></i>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter uppercase italic leading-none">
              FOOTBALL <span className="text-blue-500">ORACLE</span>
            </h1>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.3em]">Season 2025/2026 Core</p>
          </div>
        </div>
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
          {(['yesterday', 'today', 'tomorrow'] as DateType[]).map((t) => (
            <button 
              key={t} 
              onClick={() => { setActiveDateTab(t); setSelectedFixtureId(null); }} 
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeDateTab === t ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 max-w-[1600px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 overflow-x-hidden relative">
        <aside className={`${selectedFixtureId ? 'hidden lg:flex' : 'flex'} lg:col-span-3 border-r border-slate-800 bg-slate-900/10 flex-col h-[calc(100vh-73px)] w-full`}>
          <div className="p-6 pb-2 shrink-0">
            <LeagueSidebar selectedLeagueId={selectedLeagueId} onLeagueSelect={(id) => { setSelectedLeagueId(id); setSelectedFixtureId(null); }} />
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-2 space-y-3">
            <div className="flex items-center gap-3 mb-4 sticky top-0 bg-[#020617] py-2 z-10">
              <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Available Fixtures</h4>
            </div>
            {isFixturesLoading ? (
              <div className="text-center py-12 animate-pulse text-[10px] font-black uppercase text-blue-500">Scanning sector...</div>
            ) : filteredFixtures.length === 0 ? (
              <div className="text-center py-12 text-[10px] font-black uppercase text-slate-700">No signals detected</div>
            ) : filteredFixtures.map((f) => (
              <div key={f.fixture.id} onClick={() => handleAnalyze(f.fixture.id)} className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedFixtureId === f.fixture.id ? 'bg-blue-600/10 border-blue-500 shadow-lg shadow-blue-500/10' : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'}`}>
                <div className="flex justify-between mb-2">
                   <span className="text-[9px] font-black text-slate-500 uppercase">{f.fixture.status.short}</span>
                   <span className="text-[9px] font-mono text-slate-400">{new Date(f.fixture.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="space-y-1">
                   <div className="flex justify-between text-xs font-bold"><span className="truncate">{f.teams.home.name}</span><span>{f.goals.home ?? '-'}</span></div>
                   <div className="flex justify-between text-xs font-bold"><span className="truncate">{f.teams.away.name}</span><span>{f.goals.away ?? '-'}</span></div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className={`${!selectedFixtureId ? 'hidden lg:block' : 'block'} lg:col-span-9 p-4 md:p-8 overflow-y-auto custom-scrollbar w-full`}>
          {selectedFixtureId && (
            <button 
              onClick={() => setSelectedFixtureId(null)}
              className="lg:hidden mb-6 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-blue-500 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-xl transition-all active:scale-95"
            >
              <i className="fas fa-arrow-left"></i> Zpět k zápasům
            </button>
          )}

          {selectedFixtureId && predictionData ? (
            <div className="max-w-5xl mx-auto space-y-12 pb-12">
               <MatchCard data={predictionData} fixtureStatus={selectedMatchInfo?.fixture.status.short} realScore={selectedMatchInfo?.goals} />
               
               <div className="p-8 bg-slate-900 border border-slate-800 rounded-[2rem] shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                    <i className="fas fa-robot text-7xl text-blue-500"></i>
                  </div>
                  <div className="flex items-center gap-3 mb-4 relative z-10">
                     <i className="fas fa-brain text-blue-500 text-xs"></i>
                     <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500">Neural Tactic Report</h4>
                  </div>
                  {isLoading ? (
                    <div className="flex items-center gap-3 text-slate-500 animate-pulse">
                      <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-[10px] font-bold uppercase tracking-widest">Processing Tactical Signals...</span>
                    </div>
                  ) : (
                    <p className="text-slate-300 leading-relaxed italic border-l-2 border-blue-500/20 pl-6 relative z-10">
                      {tacticalPreview || "Report v přípravě..."}
                    </p>
                  )}
               </div>

               {renderStatsTable()}

               {predictionData.h2h && predictionData.h2h.length > 0 && (
                 <div className="bg-slate-900/50 border border-slate-800 rounded-[2rem] p-8 shadow-xl">
                    <div className="flex items-center gap-3 mb-8">
                       <i className="fas fa-history text-blue-500 text-xs"></i>
                       <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500">Previous Encounters (Last 3 H2H)</h4>
                    </div>
                    <div className="space-y-4">
                       {predictionData.h2h.slice(0, 3).map((match, idx) => (
                         <div key={idx} className="flex flex-col md:flex-row items-center justify-between p-4 bg-slate-950/50 border border-slate-800 rounded-2xl hover:border-slate-700 transition-colors gap-4">
                            <div className="flex-1 flex items-center gap-4 w-full">
                               <img src={match.teams.home.logo} className="w-6 h-6 object-contain" alt="" />
                               <span className="text-xs font-bold truncate">{match.teams.home.name}</span>
                            </div>
                            <div className="w-full md:w-20 text-center font-mono font-black text-white bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
                               {match.goals.home} : {match.goals.away}
                            </div>
                            <div className="flex-1 flex items-center justify-end gap-4 w-full">
                               <span className="text-xs font-bold truncate text-right">{match.teams.away.name}</span>
                               <img src={match.teams.away.logo} className="w-6 h-6 object-contain" alt="" />
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
               )}
            </div>
          ) : isLoading ? (
            <div className="h-full flex flex-col items-center justify-center py-32">
               <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
               <p className="text-xs font-black uppercase tracking-widest text-blue-500">Decrypting Match Matrix...</p>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-30 py-32">
               <i className="fas fa-shield-halved text-6xl mb-6 text-blue-500/50"></i>
               <h2 className="text-2xl font-black uppercase italic tracking-tighter">Engagement Required</h2>
               <p className="text-xs mt-2 uppercase tracking-widest">Vyberte zápas pro aktivaci Oracle AI</p>
            </div>
          )}
        </main>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
        @media (max-width: 1024px) {
          aside { height: auto; max-height: calc(100vh - 73px); }
        }
      `}</style>
    </div>
  );
};

export default App;
