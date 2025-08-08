import { io } from 'socket.io-client';

// Initialize socket connection
const socket = io('https://multiplayer-chess-backend-production-d05a.up.railway.app/', {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
  transports: ['websocket'],    // prefer websocket transport
});


// Connection event listeners
socket.on('connect', () => {
  console.log('Connected to server:', socket.id);
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected from server:', reason);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});

export default socket;