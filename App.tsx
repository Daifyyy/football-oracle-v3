
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getPredictions, getFixtures, getTeamStatistics } from './services/apiService';
import { PredictionResponse, Fixture } from './types';
import MatchCard from './components/MatchCard';
import { GoogleGenAI } from "@google/genai";

type DateType = 'yesterday' | 'today' | 'tomorrow';

const TOP_LEAGUES = [
  { id: 39, name: 'Premier League', short: 'PL' },
  { id: 140, name: 'La Liga', short: 'LL' },
  { id: 78, name: 'Bundesliga', short: 'BL' },
  { id: 135, name: 'Serie A', short: 'SA' },
  { id: 61, name: 'Ligue 1', short: 'L1' },
  { id: 88, name: 'Eredivisie', short: 'ED' },
  { id: 144, name: 'Jupiler Pro', short: 'JP' },
  { id: 273, name: 'Copa Suda', short: 'CS' }
];

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
  const [tacticalPreview, setTacticalPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFixturesLoading, setIsFixturesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mainContentRef = useRef<HTMLElement>(null);

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
      const dateString = dates[tab];
      const data = await getFixtures(dateString);
      setFixturesMap(prev => ({ ...prev, [tab]: data }));
    } catch (err) {
      setError("Uplink failed. Local buffer exhausted.");
    } finally {
      setIsFixturesLoading(false);
    }
  }, [fixturesMap, dates]);

  useEffect(() => {
    loadFixtures(activeDateTab);
  }, [activeDateTab, loadFixtures]);

  const generateTacticalPreview = async (fixtureId: number, matchInfo: Fixture) => {
    const cacheKey = `tactical_${fixtureId}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      setTacticalPreview(cached);
      return;
    }

    try {
      const season = new Date(matchInfo.fixture.date).getFullYear();
      const [homeStats, awayStats] = await Promise.all([
        getTeamStatistics(matchInfo.teams.home.id, matchInfo.league.id, season),
        getTeamStatistics(matchInfo.teams.away.id, matchInfo.league.id, season)
      ]);

      if (homeStats && awayStats) {
        // Inicializace Gemini pouze pokud máme API_KEY
        if (!process.env.API_KEY) {
          setTacticalPreview("Gemini API Key missing in environment. Cannot generate tactical preview.");
          return;
        }

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `
          Analyzuj statistiky: Tým A (Home: ${matchInfo.teams.home.name}) vs Tým B (Away: ${matchInfo.teams.away.name}).
          Tým A: Form ${homeStats.form || 'N/A'}, Clean Sheets ${homeStats.clean_sheet?.total || 0}, Gólů na zápas ${homeStats.goals?.for?.average?.total || 0}.
          Tým B: Form ${awayStats.form || 'N/A'}, Clean Sheets ${awayStats.clean_sheet?.total || 0}, Gólů na zápas ${awayStats.goals?.for?.average?.total || 0}.
          Vytvoř profesionální 'Taktické preview' v jednom krátkém odstavci v českém jazyce. 
          Vysvětli herní styly (např. Direct Football, Tiki-taka, High Press) a proč je jeden tým favoritem. 
          Buď stručný a věcný.
        `;

        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: [{ parts: [{ text: prompt }] }],
        });

        const text = response.text;
        if (text) {
          setTacticalPreview(text);
          localStorage.setItem(cacheKey, text);
        }
      } else {
        setTacticalPreview("Nedostatek statistických dat pro hloubkovou taktickou analýzu.");
      }
    } catch (err) {
      console.error("Gemini Analysis Failed:", err);
      setTacticalPreview("Tactical intelligence offline. Unable to compute playing style variances.");
    }
  };

  const handleAnalyze = async (e: React.MouseEvent, fixtureId: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    setSelectedFixtureId(fixtureId);
    setIsLoading(true);
    setError(null);
    setPredictionData(null);
    setTacticalPreview(null);

    // Na mobilu odrolujeme nahoru, aby uživatel viděl loading v main panelu
    if (window.innerWidth < 1024) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    const matchInfo = filteredFixtures.find(f => f.fixture.id === fixtureId);

    try {
      const data = await getPredictions(fixtureId);
      if (data) {
        setPredictionData(data);
        if (matchInfo) {
          await generateTacticalPreview(fixtureId, matchInfo);
        }
      } else {
        setError("AI Matrix: Analysis unavailable for this sector.");
      }
    } catch (err) {
      setError("Neural node connection timeout or API limit reached.");
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

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/60 bg-[#020617]/90 backdrop-blur-xl px-6 py-4 flex flex-col md:flex-row justify-between items-center sticky top-0 z-50 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-700 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <i className="fas fa-microchip text-white text-lg"></i>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter uppercase italic leading-none">
              Football <span className="text-blue-500">Oracle</span>
            </h1>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.3em]">Batch Analysis Engine v3.1</p>
          </div>
        </div>

        <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-800">
          {(['yesterday', 'today', 'tomorrow'] as DateType[]).map((t) => (
            <button
              key={t}
              onClick={() => setActiveDateTab(t)}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                activeDateTab === t ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {t === 'yesterday' ? 'Yesterday' : t === 'today' ? 'Today' : 'Tomorrow'}
            </button>
          ))}
        </div>
      </header>

      {/* Main Grid */}
      <div className="flex-1 max-w-[1600px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-x-hidden">
        
        {/* Sidebar: League Selector & Fixture List */}
        <aside className={`${selectedFixtureId && 'hidden lg:flex'} lg:col-span-4 xl:col-span-3 border-r border-slate-800/50 bg-slate-900/10 flex flex-col h-[calc(100vh-73px)]`}>
          <div className="p-4 grid grid-cols-4 gap-2 border-b border-slate-800/50 bg-slate-950/30">
            {TOP_LEAGUES.map((league) => (
              <button
                key={league.id}
                onClick={() => setSelectedLeagueId(league.id)}
                className={`py-2 rounded-lg text-[10px] font-black transition-all border ${
                  selectedLeagueId === league.id 
                  ? 'bg-blue-600/10 border-blue-500/50 text-blue-400' 
                  : 'bg-slate-900 border-slate-800 text-slate-600 hover:border-slate-700 hover:text-slate-400'
                }`}
              >
                {league.short}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
            {isFixturesLoading ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-40">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-[10px] font-black uppercase tracking-widest">Scanning Sectors...</p>
              </div>
            ) : filteredFixtures.length === 0 ? (
              <div className="text-center py-20 px-6">
                <i className="fas fa-ghost text-slate-800 text-4xl mb-4"></i>
                <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">Zero signals detected.</p>
              </div>
            ) : filteredFixtures.map((f) => (
              <div 
                key={f.fixture.id}
                className={`w-full p-4 rounded-xl border transition-all ${
                  selectedFixtureId === f.fixture.id 
                  ? 'bg-blue-600/10 border-blue-500/50 shadow-lg shadow-blue-500/5' 
                  : 'bg-slate-950 border-slate-800/60'
                }`}
              >
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">
                    {f.fixture.status.short === 'FT' ? 'Final Result' : 'Pre-Match'}
                  </span>
                  <span className="text-[10px] font-mono font-black text-slate-400">
                    {f.fixture.status.short === 'NS' 
                      ? new Date(f.fixture.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                      : f.fixture.status.short}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 max-w-[140px]">
                      <img src={f.teams.home.logo} className="w-4 h-4 object-contain" alt="" />
                      <span className="text-xs font-bold text-slate-200 truncate">{f.teams.home.name}</span>
                    </div>
                    <span className="text-xs font-mono font-black text-slate-300">{f.goals.home ?? '-'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 max-w-[140px]">
                      <img src={f.teams.away.logo} className="w-4 h-4 object-contain" alt="" />
                      <span className="text-xs font-bold text-slate-200 truncate">{f.teams.away.name}</span>
                    </div>
                    <span className="text-xs font-mono font-black text-slate-300">{f.goals.away ?? '-'}</span>
                  </div>
                </div>

                <button 
                  onClick={(e) => handleAnalyze(e, f.fixture.id)}
                  className={`w-full py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all active:scale-[0.98] ${
                    selectedFixtureId === f.fixture.id 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                  }`}
                >
                  <i className="fas fa-atom mr-2"></i> Analyze Match
                </button>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Panel: Insights */}
        <main ref={mainContentRef} className={`${!selectedFixtureId && 'hidden lg:block'} lg:col-span-8 xl:col-span-9 p-6 md:p-8 overflow-y-auto custom-scrollbar bg-[#020617] relative`}>
          <div className="max-w-4xl mx-auto">
            {selectedFixtureId && (
              <button 
                onClick={() => { setSelectedFixtureId(null); setPredictionData(null); }}
                className="lg:hidden mb-6 flex items-center gap-2 text-xs font-black uppercase text-blue-500 py-2"
              >
                <i className="fas fa-arrow-left"></i> Back to List
              </button>
            )}

            {error && (
              <div className="mb-8 bg-red-500/5 border border-red-500/20 p-5 rounded-2xl flex items-center gap-4 text-red-400 animate-in fade-in zoom-in">
                <i className="fas fa-triangle-exclamation text-lg"></i>
                <p className="text-sm font-bold uppercase tracking-tight">{error}</p>
              </div>
            )}

            {!selectedFixtureId ? (
              <div className="h-[70vh] flex flex-col items-center justify-center text-center opacity-30">
                <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center mb-8 shadow-inner border border-slate-800">
                  <i className="fas fa-radar text-4xl text-blue-500 animate-pulse"></i>
                </div>
                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-300">Idle State</h2>
                <p className="text-sm max-w-xs mt-4 leading-relaxed font-medium">
                  Select a tactical objective from the grid to initiate predictive simulation.
                </p>
              </div>
            ) : isLoading ? (
              <div className="h-[70vh] flex flex-col items-center justify-center">
                <div className="relative mb-8">
                  <div className="w-20 h-20 border-4 border-blue-500/10 border-t-blue-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <i className="fas fa-brain text-2xl text-blue-500 animate-pulse"></i>
                  </div>
                </div>
                <h3 className="text-xl font-black uppercase italic text-blue-500 text-center">Processing Variables</h3>
                <p className="text-slate-500 mt-2 font-mono text-xs tracking-widest uppercase text-center px-4">Consulting 5K+ match scenarios...</p>
              </div>
            ) : predictionData && (
              <div className="animate-in slide-in-from-bottom-12 duration-700 ease-out pb-12">
                <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="bg-slate-900/80 border border-slate-800 px-5 py-3 rounded-2xl flex items-center gap-4 w-full sm:w-auto">
                    <img src={selectedMatchInfo?.league.logo} className="w-8 h-8 object-contain" alt="" />
                    <div>
                      <h4 className="text-xs font-black text-slate-300 uppercase leading-none mb-1">{selectedMatchInfo?.league.name}</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Analysis Protocol</p>
                    </div>
                  </div>
                  
                  {selectedMatchInfo?.fixture.status.short === 'FT' && (
                    <div className="bg-amber-500/10 border border-amber-500/30 px-5 py-3 rounded-2xl flex items-center gap-3 text-amber-500 shadow-xl w-full sm:w-auto">
                      <i className="fas fa-history"></i>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Historical Review</span>
                    </div>
                  )}
                </div>

                <MatchCard 
                  data={predictionData} 
                  fixtureStatus={selectedMatchInfo?.fixture.status.short} 
                  realScore={selectedMatchInfo?.goals} 
                />

                <div className="mt-8 bg-gradient-to-br from-slate-900 to-slate-950 border border-blue-500/20 rounded-[2rem] p-6 md:p-8 shadow-xl">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center border border-blue-500/30 shrink-0">
                      <i className="fas fa-chess text-blue-500"></i>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">AI Tactical Preview</h4>
                      <p className="text-[10px] text-blue-500/70 font-bold uppercase tracking-[0.2em]">Neural Interpretation</p>
                    </div>
                  </div>
                  
                  {tacticalPreview ? (
                    <div className="animate-in fade-in duration-1000">
                      <p className="text-sm text-slate-300 leading-relaxed font-medium italic border-l-2 border-blue-500/40 pl-6">
                        {tacticalPreview}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-slate-600 animate-pulse">
                      <div className="w-4 h-4 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
                      <span className="text-xs font-bold uppercase tracking-widest">Synthesizing data...</span>
                    </div>
                  )}
                </div>

                <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
                  {Object.entries(predictionData.comparison).map(([stat, val]) => (
                    <div key={stat} className="bg-slate-900/30 border border-slate-800/50 p-6 rounded-[1.5rem] group hover:border-blue-500/40 transition-all shadow-lg">
                      <h5 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-5">{stat.replace('_', ' ')}</h5>
                      <div className="space-y-4">
                        <div className="flex justify-between items-end font-mono">
                          <span className="text-sm font-black text-blue-400">{val.home}</span>
                          <span className="text-sm font-black text-red-400">{val.away}</span>
                        </div>
                        <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden flex">
                          <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: val.home }}></div>
                          <div className="h-full bg-red-500 transition-all duration-1000 ml-auto" style={{ width: val.away }}></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-12 bg-blue-600/5 border border-blue-500/20 p-6 md:p-8 rounded-[2rem] flex flex-col md:flex-row items-center gap-6 md:gap-8 text-center md:text-left shadow-2xl">
                  <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shrink-0 shadow-2xl shadow-blue-500/30">
                    <i className="fas fa-file-invoice text-2xl text-white"></i>
                  </div>
                  <div>
                    <h5 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-2">Tactical Summary</h5>
                    <p className="text-base md:text-lg text-slate-200 font-bold italic leading-relaxed">
                      "{predictionData.predictions.advice}"
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}</style>
    </div>
  );
};

export default App;
