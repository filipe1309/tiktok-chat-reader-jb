import { useState, useCallback, useRef, useEffect } from 'react';
import type { PollState, PollOption, VoteEntry, ChatMessage } from '@/types';

const DEFAULT_TIMER = 30;

// Serializable version of PollState for BroadcastChannel
export interface SerializablePollState {
  isRunning: boolean;
  finished: boolean;
  question: string;
  options: PollOption[];
  votes: Record<number, number>;
  votersArray: string[];
  timer: number;
  timeLeft: number;
}

// Setup config for preview broadcast
export interface SetupConfig {
  question: string;
  options: PollOption[];
  timer: number;
}

interface UsePollReturn {
  pollState: PollState;
  voteLog: VoteEntry[];
  startPoll: (question: string, options: string[], timer?: number) => void;
  stopPoll: () => void;
  resetPoll: () => void;
  processVote: (message: ChatMessage) => void;
  clearVoteLog: () => void;
  getTotalVotes: () => number;
  getWinner: () => PollOption | null;
  getPercentage: (optionId: number) => number;
  openResultsPopup: () => void;
  broadcastSetupConfig: (config: SetupConfig) => void;
}

const initialPollState: PollState = {
  isRunning: false,
  finished: false,
  question: '',
  options: [],
  votes: {},
  voters: new Set(),
  timer: DEFAULT_TIMER,
  timeLeft: 0,
};

export function usePoll(): UsePollReturn {
  const [pollState, setPollState] = useState<PollState>(initialPollState);
  const [voteLog, setVoteLog] = useState<VoteEntry[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const popupWindowRef = useRef<Window | null>(null);
  const setupConfigRef = useRef<SetupConfig | null>(null);

  // Initialize BroadcastChannel for syncing with popup window
  useEffect(() => {
    try {
      channelRef.current = new BroadcastChannel('poll-results-channel');
      
      // Listen for state requests from popup
      channelRef.current.onmessage = (event) => {
        if (event.data.type === 'request-state') {
          broadcastPollState(pollState);
          // Also broadcast setup config if available
          if (setupConfigRef.current) {
            channelRef.current?.postMessage({
              type: 'setup-config',
              config: setupConfigRef.current,
            });
          }
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported:', e);
    }

    return () => {
      channelRef.current?.close();
    };
  }, []);

  // Broadcast poll state changes
  const broadcastPollState = useCallback((state: PollState) => {
    if (!channelRef.current) return;
    
    const hasVotes = Object.values(state.votes).some(v => v > 0);
    const serializableState: SerializablePollState = {
      isRunning: state.isRunning,
      finished: state.finished || (!state.isRunning && state.options.length > 0 && hasVotes),
      question: state.question,
      options: state.options,
      votes: state.votes,
      votersArray: Array.from(state.voters),
      timer: state.timer,
      timeLeft: state.timeLeft,
    };

    channelRef.current.postMessage({
      type: 'poll-update',
      state: serializableState,
    });
  }, []);

  // Broadcast state on changes
  useEffect(() => {
    broadcastPollState(pollState);
  }, [pollState, broadcastPollState]);

  // Broadcast setup config changes (for preview in popup)
  const broadcastSetupConfig = useCallback((config: SetupConfig) => {
    setupConfigRef.current = config;
    if (!channelRef.current) return;
    
    channelRef.current.postMessage({
      type: 'setup-config',
      config,
    });
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startPoll = useCallback((question: string, options: string[], timer = DEFAULT_TIMER) => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const pollOptions: PollOption[] = options.map((text, index) => ({
      id: index + 1,
      text,
    }));

    const initialVotes: Record<number, number> = {};
    pollOptions.forEach(opt => {
      initialVotes[opt.id] = 0;
    });

    setPollState({
      isRunning: true,
      finished: false,
      question,
      options: pollOptions,
      votes: initialVotes,
      voters: new Set(),
      timer,
      timeLeft: timer,
    });

    setVoteLog([]);

    // Start countdown
    timerRef.current = setInterval(() => {
      setPollState(prev => {
        if (prev.timeLeft <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          return { ...prev, isRunning: false, finished: true, timeLeft: 0 };
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);
  }, []);

  const stopPoll = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setPollState(prev => ({ ...prev, isRunning: false, finished: true }));
  }, []);

  const resetPoll = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setPollState(initialPollState);
    setVoteLog([]);
  }, []);

  const openResultsPopup = useCallback(() => {
    // Check if popup is already open
    if (popupWindowRef.current && !popupWindowRef.current.closed) {
      popupWindowRef.current.focus();
      return;
    }

    // Calculate popup size and position
    const width = 600;
    const height = 500;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    // Open popup with minimal chrome
    popupWindowRef.current = window.open(
      '/poll-results',
      'pollResultsPopup',
      `width=${width},height=${height},left=${left},top=${top},` +
      'toolbar=no,location=no,directories=no,status=no,menubar=no,scrollbars=yes,resizable=yes'
    );

    // Send initial state after a short delay to let popup load
    setTimeout(() => {
      broadcastPollState(pollState);
    }, 500);
  }, [pollState, broadcastPollState]);

  const processVote = useCallback((message: ChatMessage) => {
    setPollState(prev => {
      if (!prev.isRunning) return prev;

      const comment = message.comment.trim();
      const voteNumber = parseInt(comment);

      // Check if valid vote number
      if (isNaN(voteNumber) || voteNumber < 1 || voteNumber > prev.options.length) {
        return prev;
      }

      // Check if user already voted
      if (prev.voters.has(message.uniqueId)) {
        return prev;
      }

      // Register vote
      const newVoters = new Set(prev.voters);
      newVoters.add(message.uniqueId);

      const newVotes = { ...prev.votes };
      newVotes[voteNumber] = (newVotes[voteNumber] || 0) + 1;

      // Add to vote log
      const option = prev.options.find(o => o.id === voteNumber);
      if (option) {
        const entry: VoteEntry = {
          id: `${message.uniqueId}-${Date.now()}`,
          user: message,
          optionId: voteNumber,
          optionText: option.text,
          timestamp: new Date(),
        };
        setVoteLog(log => [...log.slice(-99), entry]); // Keep last 100 entries
      }

      return {
        ...prev,
        votes: newVotes,
        voters: newVoters,
      };
    });
  }, []);

  const clearVoteLog = useCallback(() => {
    setVoteLog([]);
  }, []);

  const getTotalVotes = useCallback(() => {
    return Object.values(pollState.votes).reduce((sum, count) => sum + count, 0);
  }, [pollState.votes]);

  const getWinner = useCallback(() => {
    const totalVotes = getTotalVotes();
    if (totalVotes === 0) return null;

    let maxVotes = 0;
    let winnerId = 0;

    Object.entries(pollState.votes).forEach(([id, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        winnerId = parseInt(id);
      }
    });

    return pollState.options.find(o => o.id === winnerId) || null;
  }, [pollState.votes, pollState.options, getTotalVotes]);

  const getPercentage = useCallback((optionId: number) => {
    const totalVotes = getTotalVotes();
    if (totalVotes === 0) return 0;
    return Math.round((pollState.votes[optionId] / totalVotes) * 100);
  }, [pollState.votes, getTotalVotes]);

  return {
    pollState,
    voteLog,
    startPoll,
    stopPoll,
    resetPoll,
    processVote,
    clearVoteLog,
    getTotalVotes,
    getWinner,
    getPercentage,
    openResultsPopup,
    broadcastSetupConfig,
  };
}
