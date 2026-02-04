import type { PollState } from '@/types';

interface PollResultsProps {
  pollState: PollState;
  getPercentage: (optionId: number) => number;
  getTotalVotes: () => number;
  showStatusBar?: boolean;
  compact?: boolean;
}

export function PollResults({ pollState, getPercentage, getTotalVotes, showStatusBar = true, compact = false }: PollResultsProps) {
  const totalVotes = getTotalVotes();

  // Find winner(s) - only when poll is finished
  const maxVotes = Math.max(...Object.values(pollState.votes), 0);
  const winnerIds = pollState.finished && totalVotes > 0
    ? pollState.options
        .filter(opt => pollState.votes[opt.id] === maxVotes && maxVotes > 0)
        .map(opt => opt.id)
    : [];

  // Get timer CSS classes based on remaining time
  const getTimerClasses = () => {
    if (!pollState.isRunning) return 'text-slate-400';
    if (pollState.timeLeft <= 5) return 'timer-critical';
    if (pollState.timeLeft <= 10) return 'timer-warning';
    return 'text-tiktok-cyan';
  };

  // Get status display
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

  return (
    <div className="space-y-4">
      {/* Status Bar */}
      {showStatusBar && (
        <div className="flex items-center justify-around flex-wrap gap-4 p-5 bg-slate-900/50 rounded-xl border border-slate-700/50">
          <div className="text-center">
            <span className="block text-xs text-slate-400 mb-1">{pollState.isRunning ? 'Tempo Restante' : 'Tempo Configurado'}</span>
            <span className={`font-mono text-3xl font-bold ${getTimerClasses()}`}>
              {pollState.isRunning ? `${pollState.timeLeft}s` : (pollState.timer > 0 ? `${pollState.timer}s` : '--')}
            </span>
          </div>
          <div className="text-center">
            <span className="block text-xs text-slate-400 mb-1">Total de Votos</span>
            <span className="font-bold text-purple-400 text-3xl">{totalVotes}</span>
          </div>
          <div className="text-center">
            <span className="block text-xs text-slate-400 mb-1">Status</span>
            <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold border ${status.className}`}>
              {status.text}
            </span>
          </div>
        </div>
      )}

      {/* Question */}
      {pollState.question && (
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
            <h3 className="text-xl font-bold text-white">{pollState.question}</h3>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="space-y-4">
        {pollState.options.map((option) => {
          const percentage = getPercentage(option.id);
          const votes = pollState.votes[option.id] || 0;
          const isWinner = winnerIds.includes(option.id);
          const percentageFixed = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : '0.0';

          return (
            <div 
              key={option.id}
              className={`relative overflow-hidden rounded-xl transition-all duration-300 border ${
                isWinner 
                  ? 'border-yellow-400 bg-yellow-500/10 animate-winner-glow' 
                  : 'border-slate-700/50 bg-slate-800/50 hover:bg-slate-800/70 hover:border-slate-600/50'
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
              <div className={`relative flex items-center justify-between ${compact ? 'p-3' : 'p-4'}`}>
                <div className="flex items-center gap-3">
                  <span className={`${compact ? 'w-9 h-9 text-base' : 'w-10 h-10 text-lg'} flex items-center justify-center rounded-full font-bold text-white flex-shrink-0 ${
                    isWinner 
                      ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-slate-900' 
                      : 'bg-gradient-to-br from-purple-600 to-purple-400'
                  }`}>
                    {option.id}
                  </span>
                  <span className={`font-semibold text-white ${compact ? 'text-base' : 'text-lg'}`}>
                    {option.text}
                    {isWinner && <span className="ml-2">👑</span>}
                  </span>
                </div>
                
                <div className="text-right flex-shrink-0">
                  <span className={`font-bold ${isWinner ? 'text-yellow-400' : 'text-tiktok-cyan'} ${compact ? 'text-base' : 'text-lg'}`}>
                    {votes} votos
                  </span>
                  <span className="text-slate-400 ml-2">
                    ({percentageFixed}%)
                  </span>
                </div>
              </div>

              {/* Progress Bar Track */}
              <div className="h-2 bg-slate-900/50">
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

      {/* Footer stats */}
      {!compact && (
        <div className="text-center text-slate-400 pt-3 border-t border-slate-700">
          Total de Votos: <span className="font-bold text-white">{totalVotes}</span>
          <span className="mx-2">•</span>
          Votantes Únicos: <span className="font-bold text-white">{pollState.voters.size}</span>
        </div>
      )}
    </div>
  );
}
