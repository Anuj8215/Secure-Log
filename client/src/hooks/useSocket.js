import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export const useSocket = (token) => {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    socketRef.current = io(import.meta.env.VITE_API_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
    });
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [token]);

  return socketRef.current;
};
