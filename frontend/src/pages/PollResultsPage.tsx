import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { PollState, PollOption } from '@/types';
import type { SerializablePollState, SetupConfig } from '@/hooks/usePoll';

const DEFAULT_OPTIONS: PollOption[] = [
  { id: 1, text: 'Sim' },
  { id: 2, text: 'Não' },
];

// Default options for editing (8 slots)
const DEFAULT_EDIT_OPTIONS = [
  'Sim',
  'Não',
  'Correr',
  'Pular',
  'Laboratório',
  '',
  '',
  '',
];

// Default selected options
const DEFAULT_SELECTED = [true, true, false, false, false, false, false, false];

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
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [channelRef, setChannelRef] = useState<BroadcastChannel | null>(null);
  
  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editQuestion, setEditQuestion] = useState('Votar agora!');
  const [editOptions, setEditOptions] = useState<string[]>(DEFAULT_EDIT_OPTIONS);
  const [editSelectedOptions, setEditSelectedOptions] = useState<boolean[]>(DEFAULT_SELECTED);
  const [editTimer, setEditTimer] = useState(30);
  const isInitialized = useRef(false);

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
          // Reset reconnecting state when connection status changes
          if (data.isConnected) {
            setIsReconnecting(false);
          }
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

  const sendReconnect = () => {
    console.log('[PollResultsPage] Sending reconnect message, channelRef:', !!channelRef);
    if (!channelRef) {
      console.log('[PollResultsPage] No channelRef, cannot send reconnect');
      return;
    }
    setIsReconnecting(true);
    channelRef.postMessage({ type: 'reconnect' });
    console.log('[PollResultsPage] Reconnect message sent');
    
    // Reset reconnecting state after timeout if still not connected
    setTimeout(() => {
      setIsReconnecting(false);
    }, 10000);
  };

  // Broadcast config changes back to PollPage
  const broadcastConfigChange = useCallback((question: string, options: PollOption[], timer: number) => {
    if (!channelRef) return;
    channelRef.postMessage({
      type: 'config-update',
      config: { question, options, timer },
    });
    // Also update local setupConfig
    setSetupConfig({ question, options, timer });
  }, [channelRef]);

  // Get selected poll options from edit state
  const getSelectedPollOptions = useCallback((): PollOption[] => {
    return editOptions
      .map((text, idx) => ({ id: idx + 1, text: text.trim() }))
      .filter((opt, idx) => editSelectedOptions[idx] && opt.text);
  }, [editOptions, editSelectedOptions]);

  // Handle option text change
  const updateOption = useCallback((index: number, value: string) => {
    const newOptions = [...editOptions];
    newOptions[index] = value;
    setEditOptions(newOptions);
    
    // Broadcast change
    const newSelected = [...editSelectedOptions];
    const selectedOpts = newOptions
      .map((text, idx) => ({ id: idx + 1, text: text.trim() }))
      .filter((opt, idx) => newSelected[idx] && opt.text);
    broadcastConfigChange(editQuestion, selectedOpts, editTimer);
  }, [editOptions, editSelectedOptions, editQuestion, editTimer, broadcastConfigChange]);

  // Handle option toggle
  const toggleOption = useCallback((index: number) => {
    const newSelected = [...editSelectedOptions];
    newSelected[index] = !newSelected[index];
    setEditSelectedOptions(newSelected);
    
    // Broadcast change
    const selectedOpts = editOptions
      .map((text, idx) => ({ id: idx + 1, text: text.trim() }))
      .filter((opt, idx) => newSelected[idx] && opt.text);
    broadcastConfigChange(editQuestion, selectedOpts, editTimer);
  }, [editOptions, editSelectedOptions, editQuestion, editTimer, broadcastConfigChange]);

  // Handle question change
  const handleQuestionChange = useCallback((value: string) => {
    setEditQuestion(value);
    const selectedOpts = getSelectedPollOptions();
    broadcastConfigChange(value || 'Votar agora!', selectedOpts, editTimer);
  }, [editTimer, getSelectedPollOptions, broadcastConfigChange]);

  // Handle timer change
  const handleTimerChange = useCallback((value: number) => {
    const clampedValue = Math.min(300, Math.max(10, value));
    setEditTimer(clampedValue);
    const selectedOpts = getSelectedPollOptions();
    broadcastConfigChange(editQuestion || 'Votar agora!', selectedOpts, clampedValue);
  }, [editQuestion, getSelectedPollOptions, broadcastConfigChange]);

  // Initialize edit state from setupConfig
  useEffect(() => {
    if (setupConfig && !isInitialized.current) {
      isInitialized.current = true;
      setEditQuestion(setupConfig.question);
      setEditTimer(setupConfig.timer);
      
      // Rebuild full options array from setupConfig
      const newOptions = [...DEFAULT_EDIT_OPTIONS];
      const newSelected = [...DEFAULT_SELECTED].map(() => false);
      
      setupConfig.options.forEach(opt => {
        if (opt.id >= 1 && opt.id <= 8) {
          newOptions[opt.id - 1] = opt.text;
          newSelected[opt.id - 1] = true;
        }
      });
      
      setEditOptions(newOptions);
      setEditSelectedOptions(newSelected);
    }
  }, [setupConfig]);

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
          <h1 className="text-4xl font-bold text-white">📊 Resultados da Enquete</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-slate-400">
            <div className="text-8xl mb-4 animate-spin">🔄</div>
            <div className="text-3xl">Aguardando dados da enquete...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col p-5 relative">
      {/* Disconnected Modal with Blur Background */}
      {!isConnected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Blur Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
          
          {/* Modal Content */}
          <div className={`relative z-10 bg-slate-800/95 border-2 rounded-2xl p-10 shadow-2xl max-w-md mx-4 text-center ${
            isReconnecting 
              ? 'border-yellow-500/50 shadow-yellow-500/20' 
              : 'border-red-500/50 shadow-red-500/20 animate-pulse'
          }`}>
            {isReconnecting ? (
              <>
                <div className="text-6xl mb-6 animate-spin">🔄</div>
                <h2 className="text-3xl font-bold text-yellow-400 mb-4">
                  Reconectando...
                </h2>
                <p className="text-slate-400 text-lg mb-8">
                  Tentando restabelecer conexão com o TikTok.
                </p>
                <div className="flex justify-center gap-2">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </>
            ) : (
              <>
                <div className="text-6xl mb-6">⚠️</div>
                <h2 className="text-3xl font-bold text-red-400 mb-4">
                  Desconectado do TikTok
                </h2>
                <p className="text-slate-400 text-lg mb-8">
                  A conexão com o TikTok foi perdida. Clique no botão abaixo para reconectar.
                </p>
                <button
                  onClick={sendReconnect}
                  className="px-10 py-4 text-xl font-bold rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-400 hover:to-red-400 transition-all hover:scale-105 shadow-lg shadow-red-500/30"
                >
                  🔄 Reconectar
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 text-center mb-1">
        {/* Control Buttons */}
        <div className="flex items-center justify-center gap-5 p-6 bg-purple-500/10 rounded-xl border-2 border-purple-500/30">
          <button 
            onClick={() => sendCommand('start')}
            disabled={!isConnected || pollState.isRunning}
            className="px-10 py-4 text-xl font-bold rounded-xl bg-gradient-to-r from-green-400 to-blue-500 text-white hover:from-green-500 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ▶️ Iniciar
          </button>
          <button 
            onClick={() => sendCommand('stop')}
            disabled={!pollState.isRunning}
            className="px-10 py-4 text-xl font-bold rounded-xl bg-gradient-to-r from-red-600 to-red-500 text-white hover:from-red-500 hover:to-red-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ⏹️ Parar
          </button>
          <button 
            onClick={() => sendCommand('reset')}
            className="px-10 py-4 text-xl font-bold rounded-xl bg-slate-700 text-white hover:bg-slate-600 transition-all border border-slate-600"
          >
            🔄 Reiniciar
          </button>
          <button 
            onClick={() => setIsEditing(!isEditing)}
            disabled={pollState.isRunning}
            className={`px-10 py-4 text-xl font-bold rounded-xl transition-all border disabled:opacity-50 disabled:cursor-not-allowed ${
              isEditing 
                ? 'bg-tiktok-cyan/20 text-tiktok-cyan border-tiktok-cyan' 
                : 'bg-slate-700 text-white hover:bg-slate-600 border-slate-600'
            }`}
          >
            ✏️ {isEditing ? 'Editando' : 'Editar'}
          </button>
        </div>
      </div>

      <div className="flex-1 space-y-1">
        {/* Status Bar */}
        <div className="flex items-center justify-around flex-wrap gap-8 p-8 bg-slate-800/50 rounded-xl border border-slate-700/50">
          <div className="text-center">
            <span className="block text-lg text-slate-400 mb-2">{pollState.isRunning ? 'Tempo Restante' : 'Tempo Configurado'}</span>
            <span className={`font-mono text-6xl font-bold ${getTimerClasses()}`}>
              {pollState.isRunning ? `${pollState.timeLeft}s` : (displayTimer > 0 ? `${displayTimer}s` : '--')}
            </span>
          </div>
          <div className="text-center">
            <span className="block text-lg text-slate-400 mb-2">Total de Votos</span>
            <span className="font-bold text-purple-400 text-6xl">{totalVotes}</span>
          </div>
          <div className="text-center">
            <span className="block text-lg text-slate-400 mb-2">Status</span>
            <span className={`inline-block px-6 py-3 rounded-full text-2xl font-bold border ${status.className}`}>
              {status.text}
            </span>
          </div>
        </div>

        {/* Question and Timer Row (Edit Mode) */}
        {isEditing && !pollState.isRunning && (
          <div className="flex flex-wrap gap-4 items-end p-4 bg-slate-800/50 rounded-xl border border-tiktok-cyan/30">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-slate-300 mb-2">Pergunta</label>
              <input
                type="text"
                value={editQuestion}
                onChange={(e) => handleQuestionChange(e.target.value)}
                placeholder="Digite sua pergunta..."
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-tiktok-cyan"
              />
            </div>
            <div className="min-w-[180px]">
              <label className="block text-sm font-medium text-slate-300 mb-2">Tempo (segundos)</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTimerChange(editTimer - 30)}
                  disabled={editTimer <= 10}
                  className="w-10 h-10 flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  -30
                </button>
                <input
                  type="number"
                  value={editTimer}
                  onChange={(e) => handleTimerChange(Number(e.target.value))}
                  min={10}
                  max={300}
                  className="w-20 px-2 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-center focus:outline-none focus:border-tiktok-cyan"
                />
                <button
                  type="button"
                  onClick={() => handleTimerChange(editTimer + 30)}
                  disabled={editTimer >= 300}
                  className="w-10 h-10 flex items-center justify-center bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  +30
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Question */}
        <div className={`relative overflow-hidden rounded-xl border-l-4 transition-all duration-500 ${
          pollState.isRunning
            ? pollState.timeLeft <= 5
              ? 'bg-red-500/20 border-red-500 animate-pulse shadow-lg shadow-red-500/20'
              : pollState.timeLeft <= 10
                ? 'bg-yellow-500/15 border-yellow-500 shadow-lg shadow-yellow-500/10'
                : 'bg-green-500/10 border-green-500'
            : 'bg-purple-500/10 border-purple-500'
        }`}>
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
          <div className="text-center py-6 px-8">
            <h3 className={`text-4xl font-bold transition-colors duration-500 ${
              pollState.isRunning
                ? pollState.timeLeft <= 5
                  ? 'text-red-300'
                  : pollState.timeLeft <= 10
                    ? 'text-yellow-300'
                    : 'text-white'
                : 'text-white'
            }`}>{isEditing && !isPollActive ? editQuestion || 'Vote agora!' : displayQuestion || 'Vote agora!'}</h3>
          </div>
        </div>

        {/* Results / Edit Options */}
        <div className="space-y-4 flex-1">
          {isEditing && !pollState.isRunning ? (
            // Edit mode - show all 8 option slots
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {editOptions.map((option, index) => (
                <div 
                  key={index} 
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                    editSelectedOptions[index] 
                      ? 'bg-purple-900/30 border-purple-500/50' 
                      : 'bg-slate-900/50 border-slate-700/50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleOption(index)}
                    className={`w-6 h-6 flex items-center justify-center rounded border-2 transition-all flex-shrink-0 ${
                      editSelectedOptions[index]
                        ? 'bg-purple-600 border-purple-500 text-white'
                        : 'bg-slate-800 border-slate-600 text-transparent hover:border-slate-500'
                    }`}
                  >
                    {editSelectedOptions[index] && '✓'}
                  </button>
                  <span className={`w-9 h-9 flex items-center justify-center rounded-full font-bold text-lg flex-shrink-0 ${
                    editSelectedOptions[index]
                      ? 'bg-gradient-to-br from-purple-600 to-purple-400 text-white'
                      : 'bg-slate-700 text-slate-400'
                  }`}>
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Opção ${index + 1}`}
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-tiktok-cyan"
                  />
                </div>
              ))}
            </div>
          ) : (
            // Display mode - show results
            displayOptions.map((option) => {
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
                  <div className="relative flex items-center justify-between p-7">
                    <div className="flex items-center gap-6">
                      <span className={`w-16 h-16 flex items-center justify-center rounded-full font-bold text-white text-3xl flex-shrink-0 ${
                        isWinner 
                          ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-slate-900' 
                          : 'bg-gradient-to-br from-purple-600 to-purple-400'
                      }`}>
                        {option.id}
                      </span>
                      <span className="font-semibold text-white text-3xl">
                        {option.text}
                        {isWinner && <span className="ml-2">👑</span>}
                      </span>
                    </div>
                    
                    <div className="text-right flex-shrink-0">
                      <span className={`font-bold text-3xl ${isWinner ? 'text-yellow-400' : 'text-tiktok-cyan'}`}>
                        {votes} votos
                      </span>
                      <span className="text-slate-400 text-2xl ml-3">
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
            })
          )}
        </div>
      </div>
    </div>
  );
}
