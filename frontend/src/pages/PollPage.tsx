import { useCallback, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTikTokConnection, usePoll } from '@/hooks';
import { ConnectionForm, PollSetup, PollResults, VoteLog } from '@/components';
import type { ChatMessage, PollOption } from '@/types';

export function PollPage() {
  const { pollState, voteLog, startPoll, stopPoll, resetPoll, processVote, clearVoteLog, getTotalVotes, getPercentage, openResultsPopup, broadcastSetupConfig } = usePoll();
  
  // Track current setup configuration for preview
  const [setupConfig, setSetupConfig] = useState<{
    question: string;
    options: PollOption[];
    timer: number;
  }>({
    question: 'Vote agora!',
    options: [
      { id: 1, text: '1' },
      { id: 2, text: '2' },
      { id: 3, text: '3' },
      { id: 4, text: '4' },
    ],
    timer: 30,
  });

  // Broadcast initial setup config on mount
  useEffect(() => {
    broadcastSetupConfig(setupConfig);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSetupChange = useCallback((question: string, options: string[], timer: number) => {
    const newConfig = {
      question,
      options: options.map((text, index) => ({ id: index + 1, text })),
      timer,
    };
    setSetupConfig(newConfig);
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

  const handleConnect = (uniqueId: string) => {
    connection.connect(uniqueId, { enableExtendedGiftInfo: false });
  };

  const handleStartPoll = (question: string, options: string[], timer: number) => {
    startPoll(question, options, timer);
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
          />
        </div>

        {/* Controls Section - Centered */}
        <div className="card mb-6 bg-purple-500/10 border-2 border-purple-500/30">
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button 
              onClick={() => handleStartPoll(
                setupConfig.question,
                setupConfig.options.map((o) => o.text),
                setupConfig.timer
              )}
              disabled={!connection.isConnected || pollState.isRunning}
              className="btn-primary px-8 py-3 text-lg disabled:opacity-50"
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
        <div className="card mb-6 border border-slate-700/50">
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
                question: setupConfig.question,
                options: setupConfig.options,
                votes: setupConfig.options.reduce((acc, opt) => ({ ...acc, [opt.id]: 0 }), {}),
                timer: setupConfig.timer
              }}
              getPercentage={() => 0}
              getTotalVotes={() => 0}
            />
          )}
        </div>

        {/* Configuration Section */}
        <div className="card mb-6 border border-slate-700/50">
          <h2 className="text-xl font-bold text-white mb-4 pb-4 border-b border-slate-700/50">
            ⚙️ Configuração da Enquete
          </h2>
          <PollSetup
            onStart={handleStartPoll}
            onChange={handleSetupChange}
            disabled={!connection.isConnected || pollState.isRunning}
            showStartButton={false}
          />
        </div>

        {/* Vote Log Section */}
        <div className="card border border-slate-700/50">
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
