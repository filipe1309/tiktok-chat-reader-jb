import { useState, useEffect, useRef, FormEvent, KeyboardEvent } from 'react';
import type { ConnectionStatus } from '@/hooks';

interface ConnectionFormProps {
  onConnect: (uniqueId: string) => void;
  status: ConnectionStatus;
  defaultUsername?: string;
  username?: string;
  onUsernameChange?: (username: string) => void;
  compact?: boolean;
  autoFocus?: boolean;
}

const statusConfig = {
  disconnected: {
    text: 'Desconectado',
    className: 'bg-red-500/20 text-red-400 border-red-500',
  },
  connecting: {
    text: 'Conectando...',
    className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500 animate-pulse',
  },
  connected: {
    text: 'Conectado',
    className: 'bg-green-500/20 text-green-400 border-green-500',
  },
  error: {
    text: 'Erro na conexão',
    className: 'bg-red-500/20 text-red-400 border-red-500',
  },
};

export function ConnectionForm({ onConnect, status, defaultUsername = 'jamesbonfim', username: controlledUsername, onUsernameChange, compact = false, autoFocus = false }: ConnectionFormProps) {
  const [internalUsername, setInternalUsername] = useState(defaultUsername);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when autoFocus is true
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);
  
  // Use controlled or internal state
  const username = controlledUsername !== undefined ? controlledUsername : internalUsername;
  const setUsername = (value: string) => {
    if (onUsernameChange) {
      onUsernameChange(value);
    } else {
      setInternalUsername(value);
    }
  };

  // Sync internal state with defaultUsername on mount
  useEffect(() => {
    if (controlledUsername === undefined) {
      setInternalUsername(defaultUsername);
    }
  }, [defaultUsername, controlledUsername]);

  const config = statusConfig[status];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onConnect(username.trim());
    }
  };

  const handleKeyUp = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="flex items-center gap-3 flex-wrap">
        <input
          ref={inputRef}
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyUp={handleKeyUp}
          placeholder="@jamesbonfim"
          className="input-field w-48"
          disabled={status === 'connecting'}
        />
        <button
          type="submit"
          disabled={status === 'connecting' || !username.trim()}
          className="btn-primary"
        >
          {status === 'connecting' ? 'Conectando...' : 'Conectar'}
        </button>
        <span className={`px-3 py-1.5 rounded-full text-sm font-bold border ${config.className}`}>
          {config.text}
        </span>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <p className="text-slate-300">
          Digite o <b className="text-tiktok-cyan">@usuário</b> de alguém que está ao vivo:
        </p>
        <input
          ref={inputRef}
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyUp={handleKeyUp}
          placeholder="@jamesbonfim"
          className="input-field w-52"
          disabled={status === 'connecting'}
        />
        <button
          type="submit"
          disabled={status === 'connecting' || !username.trim()}
          className="px-6 py-3 font-bold rounded-lg bg-gradient-to-r from-green-600 to-green-500 text-white hover:from-green-500 hover:to-green-400 hover:shadow-lg hover:shadow-green-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'connecting' ? 'Conectando...' : 'Conectar'}
        </button>
        <span className={`px-4 py-2 rounded-full text-sm font-bold border ${config.className}`}>
          {config.text}
        </span>
      </div>
    </form>
  );
}
