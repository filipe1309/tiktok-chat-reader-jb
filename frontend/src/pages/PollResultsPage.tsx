import { useState, useEffect, useCallback, useMemo } from 'react';
import type { PollState, PollOption } from '@/types';
import type { SerializablePollState, SetupConfig } from '@/hooks/usePoll';

const DEFAULT_OPTIONS: PollOption[] = [
  { id: 1, text: 'Sim' },
  { id: 2, text: 'Não' },
];

const initialPollState: PollState = {
  isRunning: false,
  finished: false,
  question: '',
  options: [],
  votes: {},
  voters: new Set(),
  timer: 30,
  timeLeft: 0,
};

export function PollResultsPage() {
  const [pollState, setPollState] = useState<PollState>(initialPollState);
  const [setupConfig, setSetupConfig] = useState<SetupConfig | null>(null);
  const [isWaiting, setIsWaiting] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [channelRef, setChannelRef] = useState<BroadcastChannel | null>(null);

  useEffect(() => {
    let channel: BroadcastChannel | null = null;

    try {
      channel = new BroadcastChannel('poll-results-channel');
      setChannelRef(channel);

      channel.onmessage = (event) => {
        const data = event.data;

        if (data.type === 'poll-update') {
          const state = data.state as SerializablePollState;
          setPollState({
            isRunning: state.isRunning,
            finished: state.finished,
            question: state.question,
            options: state.options,
            votes: state.votes,
            voters: new Set(state.votersArray || []),
            timer: state.timer,
            timeLeft: state.timeLeft,
          });
          setIsWaiting(false);
        } else if (data.type === 'setup-config') {
          // Only update setupConfig if poll is NOT active
          setPollState(currentPollState => {
            // Check if poll is actually inactive
            const isPollInactive = !currentPollState.isRunning && 
                                   !currentPollState.finished && 
                                   currentPollState.options.length === 0;
            
            if (isPollInactive) {
              const config = data.config as SetupConfig;
              setSetupConfig(config);
            }
            return currentPollState;
          });
          setIsWaiting(false);
        } else if (data.type === 'connection-status') {
          setIsConnected(data.isConnected);
        }
      };

      channel.postMessage({ type: 'request-state' });
      
      // Poll for updates every second to keep timer and votes in sync
      const pollInterval = setInterval(() => {
        if (channel) {
          channel.postMessage({ type: 'request-state' });
        }
      }, 1000);
      
      return () => {
        clearInterval(pollInterval);
        channel?.close();
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported:', e);
    }

    return () => {
      channel?.close();
    };
  }, []);

  const sendCommand = (command: 'start' | 'stop' | 'reset') => {
    if (!channelRef) return;
    channelRef.postMessage({ type: 'poll-command', command });
  };

  const getTotalVotes = useCallback(() => {
    return Object.values(pollState.votes).reduce((sum, count) => sum + count, 0);
  }, [pollState.votes]);

  const getPercentage = useCallback((optionId: number) => {
    const totalVotes = getTotalVotes();
    if (totalVotes === 0) return 0;
    return (pollState.votes[optionId] / totalVotes) * 100;
  }, [pollState.votes, getTotalVotes]);

  const totalVotes = getTotalVotes();
  const maxVotes = Math.max(...Object.values(pollState.votes), 0);

  // Determine if poll is active
  const isPollActive = pollState.isRunning || pollState.finished;

  // Serialize options to string for stable comparison in useMemo
  const pollOptionsKey = JSON.stringify(pollState.options);
  const setupOptionsKey = JSON.stringify(setupConfig?.options || []);

  // SIMPLE LOGIC: Use pollState.options when poll is active, otherwise use setupConfig
  const displayOptions = useMemo<PollOption[]>(() => {
    if (isPollActive && pollState.options.length > 0) {
      return pollState.options;
    }
    if (setupConfig?.options && setupConfig.options.length > 0) {
      return setupConfig.options;
    }
    return DEFAULT_OPTIONS;
    // Use serialized keys for stable dependency comparison
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPollActive, pollOptionsKey, setupOptionsKey]);

  const winnerIds = useMemo(() => {
    if (!pollState.finished || totalVotes === 0) return [];
    return displayOptions
      .filter(opt => pollState.votes[opt.id] === maxVotes && maxVotes > 0)
      .map(opt => opt.id);
  }, [pollState.finished, pollState.votes, displayOptions, totalVotes, maxVotes]);

  const getTimerClasses = () => {
    if (!pollState.isRunning) return 'text-slate-400';
    if (pollState.timeLeft <= 5) return 'timer-critical';
    if (pollState.timeLeft <= 10) return 'timer-warning';
    return 'text-tiktok-cyan';
  };

  const getStatusDisplay = () => {
    if (pollState.isRunning) {
      return { text: 'Em Andamento', className: 'bg-green-500/20 text-green-400 border-green-500 animate-pulse' };
    }
    if (pollState.finished) {
      return { text: 'Finalizada', className: 'bg-blue-500/20 text-blue-400 border-blue-500' };
    }
    return { text: 'Aguardando', className: 'bg-slate-500/20 text-slate-400 border-slate-500' };
  };

  const status = getStatusDisplay();
  const displayTimer = isPollActive ? pollState.timer : (setupConfig?.timer || 30);
  const displayQuestion = isPollActive ? pollState.question : (setupConfig?.question || 'Votar agora!');

  if (isWaiting && !setupConfig && pollState.options.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col p-5">
        <div className="text-center mb-5">
          <h1 className="text-2xl font-bold text-white">📊 Resultados da Enquete</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-slate-400">
            <div className="text-6xl mb-4 animate-spin">🔄</div>
            <div className="text-xl">Aguardando dados da enquete...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col p-5">
      <div className="flex-1 text-center mb-5">
        {/* Control Buttons */}
        <div className="flex items-center justify-center gap-3 p-4 bg-purple-500/10 rounded-xl border-2 border-purple-500/30">
          <button 
            onClick={() => sendCommand('start')}
            disabled={!isConnected || pollState.isRunning}
            className="px-6 py-2 text-base font-bold rounded-xl bg-gradient-to-r from-green-400 to-blue-500 text-white hover:from-green-500 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ▶️ Iniciar
          </button>
          <button 
            onClick={() => sendCommand('stop')}
            disabled={!pollState.isRunning}
            className="px-6 py-2 text-base font-bold rounded-xl bg-gradient-to-r from-red-600 to-red-500 text-white hover:from-red-500 hover:to-red-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ⏹️ Parar
          </button>
          <button 
            onClick={() => sendCommand('reset')}
            className="px-6 py-2 text-base font-bold rounded-xl bg-slate-700 text-white hover:bg-slate-600 transition-all border border-slate-600"
          >
            🔄 Reiniciar
          </button>
        </div>
      </div>

      <div className="text-center mb-5">
        <h1 className="text-2xl font-bold text-white">📊 Resultados da Enquete</h1>
      </div>

      <div className="flex-1 space-y-5">
        {/* Status Bar */}
        <div className="flex items-center justify-around flex-wrap gap-5 p-5 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div className="text-center">
            <span className="block text-sm text-slate-400 mb-1">{pollState.isRunning ? 'Tempo Restante' : 'Tempo Configurado'}</span>
            <span className={`font-mono text-4xl font-bold ${getTimerClasses()}`}>
              {pollState.isRunning ? `${pollState.timeLeft}s` : (displayTimer > 0 ? `${displayTimer}s` : '--')}
            </span>
          </div>
          <div className="text-center">
            <span className="block text-sm text-slate-400 mb-1">Total de Votos</span>
            <span className="font-bold text-purple-400 text-4xl">{totalVotes}</span>
          </div>
          <div className="text-center">
            <span className="block text-sm text-slate-400 mb-1">Status</span>
            <span className={`inline-block px-4 py-2 rounded-full text-lg font-bold border ${status.className}`}>
              {status.text}
            </span>
          </div>
        </div>

        {/* Question */}
        <div className="relative overflow-hidden bg-purple-500/10 rounded-xl border-l-4 border-purple-500">
          {/* Animated Timer Bar */}
          {pollState.isRunning && pollState.timer > 0 && (
            <div 
              className={`absolute bottom-0 left-0 h-1.5 transition-all duration-1000 ease-linear ${
                pollState.timeLeft <= 5 
                  ? 'bg-gradient-to-r from-red-600 to-red-400 animate-pulse' 
                  : pollState.timeLeft <= 10 
                    ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' 
                    : 'bg-gradient-to-r from-green-500 to-tiktok-cyan'
              }`}
              style={{ 
                width: `${(pollState.timeLeft / pollState.timer) * 100}%`,
              }}
            />
          )}
          {/* Static bar when not running */}
          {!pollState.isRunning && (
            <div 
              className="absolute bottom-0 left-0 h-1.5 w-full bg-gradient-to-r from-purple-600/50 to-purple-400/50"
            />
          )}
          <div className="text-center py-4 px-6">
            <h3 className="text-2xl font-bold text-white">{displayQuestion || 'Vote agora!'}</h3>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4 flex-1">
          {displayOptions.map((option) => {
            const percentage = pollState.options.length > 0 ? getPercentage(option.id) : 0;
            const votes = pollState.votes[option.id] || 0;
            const isWinner = winnerIds.includes(option.id);
            const percentageFixed = totalVotes > 0 ? percentage.toFixed(1) : '0.0';

            return (
              <div 
                key={option.id}
                className={`relative overflow-hidden rounded-xl transition-all duration-300 border ${
                  isWinner 
                    ? 'border-yellow-400 bg-yellow-500/10 animate-winner-glow' 
                    : 'border-slate-700/50 bg-slate-800/50'
                }`}
              >
                {/* Background Progress Bar */}
                <div 
                  className={`absolute inset-0 transition-all duration-500 ease-out ${
                    isWinner 
                      ? 'bg-gradient-to-r from-yellow-500/30 to-yellow-400/10' 
                      : 'bg-gradient-to-r from-purple-600/30 to-purple-400/10'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
                
                {/* Content */}
                <div className="relative flex items-center justify-between p-5">
                  <div className="flex items-center gap-4">
                    <span className={`w-12 h-12 flex items-center justify-center rounded-full font-bold text-white text-xl flex-shrink-0 ${
                      isWinner 
                        ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-slate-900' 
                        : 'bg-gradient-to-br from-purple-600 to-purple-400'
                    }`}>
                      {option.id}
                    </span>
                    <span className="font-semibold text-white text-xl">
                      {option.text}
                      {isWinner && <span className="ml-2">👑</span>}
                    </span>
                  </div>
                  
                  <div className="text-right flex-shrink-0">
                    <span className={`font-bold text-xl ${isWinner ? 'text-yellow-400' : 'text-tiktok-cyan'}`}>
                      {votes} votos
                    </span>
                    <span className="text-slate-400 text-lg ml-2">
                      ({percentageFixed}%)
                    </span>
                  </div>
                </div>

                {/* Progress Bar Track */}
                <div className="h-3 bg-slate-900/50">
                  <div 
                    className={`h-full transition-all duration-500 ease-out rounded-r ${
                      isWinner 
                        ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' 
                        : 'bg-gradient-to-r from-purple-600 to-purple-400'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
