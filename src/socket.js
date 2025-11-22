import { io } from 'socket.io-client';

export const initSocket = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
    const envUrl = import.meta.env?.VITE_BACKEND_URL;
    const fallbackLocal = isLocal ? 'http://localhost:5050' : origin;
    const backendURL = envUrl || fallbackLocal || 'http://localhost:5000';

    const options = {
        forceNew: true,
        withCredentials: true,
        reconnectionAttempts: Infinity,
        timeout: 15000,
        transports: ['websocket', 'polling'],
        path: '/socket.io',
    };
    return io(backendURL, options);
};