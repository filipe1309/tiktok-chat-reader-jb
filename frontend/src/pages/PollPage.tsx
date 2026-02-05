import { useCallback, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTikTokConnection, usePoll } from '@/hooks';
import { ConnectionForm, PollSetup, PollResults, VoteLog } from '@/components';
import type { ChatMessage, PollOption } from '@/types';
import type { SetupConfig } from '@/hooks/usePoll';

export function PollPage() {
  const { pollState, voteLog, startPoll, stopPoll, resetPoll, processVote, clearVoteLog, getTotalVotes, getPercentage, openResultsPopup, broadcastSetupConfig, setConnectionStatus, onConfigUpdate, onReconnect } = usePoll();
  
  // Track current username in the input field for reconnection
  const [currentUsername, setCurrentUsername] = useState(
    localStorage.getItem('tiktok-poll-uniqueId') || 'jamesbonfim'
  );
  
  // Keep a ref to the current username for the reconnect callback
  const currentUsernameRef = useRef(currentUsername);
  useEffect(() => {
    currentUsernameRef.current = currentUsername;
  }, [currentUsername]);
  
  // Load saved setup config from localStorage
  const loadSavedSetupConfig = (): SetupConfig | null => {
    const saved = localStorage.getItem('tiktok-poll-setupConfig');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  };

  // Load full options config (all options + selected state)
  const loadFullOptionsConfig = (): { allOptions: string[]; selectedOptions: boolean[] } | null => {
    const saved = localStorage.getItem('tiktok-poll-fullOptions');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  };
  
  // Track current setup configuration for preview
  // Start with saved config or null to let PollSetup component initialize via onChange
  const [setupConfig, setSetupConfig] = useState<{
    question: string;
    options: PollOption[];
    timer: number;
  } | null>(loadSavedSetupConfig);
  
  // Track external config updates from popup
  const [externalConfig, setExternalConfig] = useState<{
    question: string;
    options: PollOption[];
    timer: number;
  } | null>(loadSavedSetupConfig);

  // Full options config for persistence (all 12 options + selection state)
  const savedFullOptions = loadFullOptionsConfig();

  // Flag to skip first onChange if we have saved config (to prevent overwriting)
  const hasInitializedRef = useRef(false);
  const hasSavedConfig = useRef(!!loadSavedSetupConfig());

  // Use ref to track poll state for stable callback
  const pollStateRef = useRef(pollState);
  useEffect(() => {
    pollStateRef.current = pollState;
  }, [pollState]);

  // Register callback to receive config updates from popup
  useEffect(() => {
    onConfigUpdate((config: SetupConfig) => {
      console.log('[PollPage] Received config update from popup:', config);
      setExternalConfig(config);
      setSetupConfig(config);
    });
  }, [onConfigUpdate]);

  const handleSetupChange = useCallback((question: string, options: PollOption[], timer: number, allOptions?: string[], selectedOptions?: boolean[]) => {
    // Skip the first onChange if we have saved config (PollSetup sends default values on mount)
    if (hasSavedConfig.current && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      return;
    }
    hasInitializedRef.current = true;
    
    const newConfig = {
      question,
      options, // Options already have their original IDs preserved
      timer,
    };
    setSetupConfig(newConfig);
    // Save to localStorage for persistence across reloads
    localStorage.setItem('tiktok-poll-setupConfig', JSON.stringify(newConfig));
    // Save full options config (all options + selection state)
    if (allOptions && selectedOptions) {
      localStorage.setItem('tiktok-poll-fullOptions', JSON.stringify({ allOptions, selectedOptions }));
    }
    // Clear external config when local changes are made
    setExternalConfig(null);
    // Always update the setup config ref, regardless of poll state
    // This ensures request-state always has the latest config
    broadcastSetupConfig(newConfig);
  }, [broadcastSetupConfig]);

  const handleChat = useCallback((msg: ChatMessage) => {
    if (pollState.isRunning) {
      processVote(msg);
    }
  }, [pollState.isRunning, processVote]);

  const connection = useTikTokConnection({
    onChat: handleChat,
  });

  // Keep connection ref updated for reconnect callback
  const connectionRef = useRef(connection);
  useEffect(() => {
    connectionRef.current = connection;
  }, [connection]);

  // Broadcast connection status to popup
  useEffect(() => {
    setConnectionStatus(connection.isConnected);
  }, [connection.isConnected, setConnectionStatus]);

  const handleConnect = (uniqueId: string) => {
    localStorage.setItem('tiktok-poll-uniqueId', uniqueId);
    connection.connect(uniqueId, { enableExtendedGiftInfo: false });
  };

  // Register reconnect callback for popup - only once on mount
  useEffect(() => {
    onReconnect(() => {
      const usernameToConnect = currentUsernameRef.current;
      console.log('[PollPage] Reconnect requested from popup');
      console.log('[PollPage] currentUsername:', usernameToConnect);
      console.log('[PollPage] isConnected:', connectionRef.current.isConnected);
      if (usernameToConnect) {
        console.log('[PollPage] Reconnecting to:', usernameToConnect);
        connectionRef.current.connect(usernameToConnect, { enableExtendedGiftInfo: false });
      } else {
        console.log('[PollPage] No username to reconnect');
      }
    });
  }, [onReconnect]);

  const handleStartPoll = (question: string, options: PollOption[], timer: number) => {
    startPoll(question, options, timer);
  };

  // Ensure setupConfig is available before rendering
  const currentSetupConfig = setupConfig || {
    question: 'Votar agora!',
    options: [
      { id: 1, text: 'Sim' },
      { id: 2, text: 'Não' },
    ],
    timer: 30,
  };

  // Check if poll is active (has been configured)
  const isPollActive = pollState.question || pollState.options.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🗳️ Enquete TikTok LIVE
          </h1>
          <p className="text-slate-400 text-lg">
            Sistema de votação interativo para Lives do TikTok
          </p>
        </div>

        {/* Connection Section */}
        <div className="card mb-6 border border-slate-700/50">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-xl font-bold text-white">🔗 Conexão</h2>
            <Link 
              to="/" 
              className="text-tiktok-cyan hover:text-tiktok-cyan/80 transition-colors text-sm"
            >
              ← Voltar ao Menu
            </Link>
          </div>
          <ConnectionForm
            onConnect={handleConnect}
            status={connection.status}
            username={currentUsername}
            onUsernameChange={setCurrentUsername}
            autoFocus={!connection.isConnected}
          />
        </div>

        {/* Configuration Section */}
        <div className={`card mb-6 border border-slate-700/50 transition-all duration-300 ${!connection.isConnected ? 'blur-sm opacity-50 pointer-events-none' : ''}`}>
          <h2 className="text-xl font-bold text-white mb-4 pb-4 border-b border-slate-700/50">
            ⚙️ Configuração da Enquete
          </h2>
          <PollSetup
            onStart={handleStartPoll}
            onChange={handleSetupChange}
            disabled={!connection.isConnected || pollState.isRunning}
            showStartButton={false}
            externalConfig={externalConfig}
            initialQuestion={loadSavedSetupConfig()?.question}
            initialOptions={savedFullOptions?.allOptions}
            initialSelectedOptions={savedFullOptions?.selectedOptions}
            initialTimer={loadSavedSetupConfig()?.timer}
          />
        </div>

        {/* Controls Section - Centered */}
        <div className={`card mb-6 bg-purple-500/10 border-2 border-purple-500/30 transition-all duration-300 ${!connection.isConnected ? 'blur-sm opacity-50 pointer-events-none' : ''}`}>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button 
              onClick={() => handleStartPoll(
                currentSetupConfig.question,
                currentSetupConfig.options,
                currentSetupConfig.timer
              )}
              disabled={!connection.isConnected || pollState.isRunning}
              className="px-8 py-3 text-lg font-bold rounded-xl bg-gradient-to-r from-green-400 to-blue-500 text-white hover:from-green-500 hover:to-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ▶️ Iniciar Enquete
            </button>
            <button 
              onClick={stopPoll}
              disabled={!pollState.isRunning}
              className="px-8 py-3 text-lg font-bold rounded-xl bg-gradient-to-r from-red-600 to-red-500 text-white hover:from-red-500 hover:to-red-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ⏹️ Parar Enquete
            </button>
            <button 
              onClick={resetPoll}
              className="btn-secondary px-8 py-3 text-lg"
            >
              🔄 Reiniciar Enquete
            </button>
          </div>
        </div>

        {/* Results Section */}
        <div className={`card mb-6 border border-slate-700/50 transition-all duration-300 ${!connection.isConnected ? 'blur-sm opacity-50 pointer-events-none' : ''}`}>
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-700/50">
            <h2 className="text-xl font-bold text-white">📊 Resultados da Enquete</h2>
            <button 
              onClick={openResultsPopup}
              className="btn-secondary text-sm"
              title="Abrir resultados em nova janela"
            >
              🖥️ Pop-out
            </button>
          </div>
          
          {isPollActive ? (
            <PollResults
              pollState={pollState}
              getPercentage={getPercentage}
              getTotalVotes={getTotalVotes}
            />
          ) : (
            <PollResults
              pollState={{
                ...pollState,
                question: currentSetupConfig.question,
                options: currentSetupConfig.options,
                votes: currentSetupConfig.options.reduce((acc, opt) => ({ ...acc, [opt.id]: 0 }), {}),
                timer: currentSetupConfig.timer
              }}
              getPercentage={() => 0}
              getTotalVotes={() => 0}
            />
          )}
        </div>

        {/* Vote Log Section */}
        <div className={`card border border-slate-700/50 transition-all duration-300 ${!connection.isConnected ? 'blur-sm opacity-50 pointer-events-none' : ''}`}>
          <h2 className="text-xl font-bold text-white mb-4 pb-4 border-b border-slate-700/50">
            📝 Registro de Votos
          </h2>
          <VoteLog 
            entries={voteLog} 
            maxHeight="300px"
            onClear={clearVoteLog}
          />
        </div>
      </div>
    </div>
  );
}
