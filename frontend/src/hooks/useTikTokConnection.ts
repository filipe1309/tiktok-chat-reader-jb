import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  RoomState,
  ChatMessage,
  GiftMessage,
  LikeMessage,
  MemberMessage,
  RoomUserMessage,
  SocialMessage,
  ConnectionOptions,
} from '@/types';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface TikTokConnectionState {
  status: ConnectionStatus;
  roomId: string | null;
  error: string | null;
  viewerCount: number;
  likeCount: number;
  diamondsCount: number;
}

interface TikTokEventHandlers {
  onChat?: (message: ChatMessage) => void;
  onGift?: (message: GiftMessage) => void;
  onLike?: (message: LikeMessage) => void;
  onMember?: (message: MemberMessage) => void;
  onRoomUser?: (message: RoomUserMessage) => void;
  onSocial?: (message: SocialMessage) => void;
  onStreamEnd?: () => void;
}

interface UseTikTokConnectionReturn extends TikTokConnectionState {
  connect: (uniqueId: string, options?: ConnectionOptions) => Promise<RoomState>;
  disconnect: () => void;
  isConnected: boolean;
}

export function useTikTokConnection(
  handlers: TikTokEventHandlers = {}
): UseTikTokConnectionReturn {
  const socketRef = useRef<Socket | null>(null);
  const handlersRef = useRef(handlers);
  
  const [state, setState] = useState<TikTokConnectionState>({
    status: 'disconnected',
    roomId: null,
    error: null,
    viewerCount: 0,
    likeCount: 0,
    diamondsCount: 0,
  });

  // Keep handlers ref up to date
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  // Initialize socket connection
  useEffect(() => {
    const backendUrl = import.meta.env.DEV ? undefined : undefined;
    const socket = io(backendUrl);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.info('Socket connected!');
    });

    socket.on('disconnect', () => {
      console.warn('Socket disconnected!');
      setState(prev => ({ ...prev, status: 'disconnected' }));
    });

    socket.on('streamEnd', () => {
      console.warn('LIVE has ended!');
      handlersRef.current.onStreamEnd?.();
      setState(prev => ({ ...prev, status: 'disconnected', roomId: null }));
    });

    socket.on('tiktokDisconnected', (errMsg: string) => {
      console.warn(errMsg);
      if (errMsg?.includes('LIVE has ended')) {
        setState(prev => ({ ...prev, status: 'disconnected', roomId: null }));
      }
    });

    // Event handlers
    socket.on('chat', (msg: ChatMessage) => {
      handlersRef.current.onChat?.(msg);
    });

    socket.on('gift', (msg: GiftMessage) => {
      handlersRef.current.onGift?.(msg);
      
      // Update diamonds count for non-pending streaks
      if (msg.giftType !== 1 || msg.repeatEnd) {
        if (msg.diamondCount > 0) {
          setState(prev => ({
            ...prev,
            diamondsCount: prev.diamondsCount + (msg.diamondCount * msg.repeatCount),
          }));
        }
      }
    });

    socket.on('like', (msg: LikeMessage) => {
      handlersRef.current.onLike?.(msg);
      if (typeof msg.totalLikeCount === 'number') {
        setState(prev => ({ ...prev, likeCount: msg.totalLikeCount }));
      }
    });

    socket.on('member', (msg: MemberMessage) => {
      handlersRef.current.onMember?.(msg);
    });

    socket.on('roomUser', (msg: RoomUserMessage) => {
      handlersRef.current.onRoomUser?.(msg);
      if (typeof msg.viewerCount === 'number') {
        setState(prev => ({ ...prev, viewerCount: msg.viewerCount }));
      }
    });

    socket.on('social', (msg: SocialMessage) => {
      handlersRef.current.onSocial?.(msg);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const connect = useCallback(
    (uniqueId: string, options: ConnectionOptions = {}): Promise<RoomState> => {
      return new Promise((resolve, reject) => {
        const socket = socketRef.current;
        if (!socket) {
          reject('Socket not initialized');
          return;
        }

        setState(prev => ({
          ...prev,
          status: 'connecting',
          error: null,
          viewerCount: 0,
          likeCount: 0,
          diamondsCount: 0,
        }));

        socket.emit('setUniqueId', uniqueId, { enableExtendedGiftInfo: true, ...options });

        const timeout = setTimeout(() => {
          reject('Connection Timeout');
          setState(prev => ({ ...prev, status: 'error', error: 'Connection Timeout' }));
        }, 15000);

        socket.once('tiktokConnected', (roomState: RoomState) => {
          clearTimeout(timeout);
          setState(prev => ({
            ...prev,
            status: 'connected',
            roomId: roomState.roomId,
            error: null,
          }));
          resolve(roomState);
        });

        socket.once('tiktokDisconnected', (errorMessage: string) => {
          clearTimeout(timeout);
          setState(prev => ({
            ...prev,
            status: 'error',
            error: errorMessage,
          }));
          reject(errorMessage);
        });
      });
    },
    []
  );

  const disconnect = useCallback(() => {
    socketRef.current?.disconnect();
    setState({
      status: 'disconnected',
      roomId: null,
      error: null,
      viewerCount: 0,
      likeCount: 0,
      diamondsCount: 0,
    });
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    isConnected: state.status === 'connected',
  };
}
