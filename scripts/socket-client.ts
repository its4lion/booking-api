import { io } from 'socket.io-client';

const url = process.env.API_URL ?? 'http://localhost:3000';
const socket = io(url, { path: '/socket.io' });
socket.on('connect', () => console.log(`Connected to ${url}; waiting for slot events (Ctrl+C to exit).`));
socket.on('slot.booked', (event) => console.log('slot.booked', JSON.stringify(event)));
socket.on('slot.released', (event) => console.log('slot.released', JSON.stringify(event)));
socket.on('connect_error', (error) => console.error('Connection error:', error.message));
