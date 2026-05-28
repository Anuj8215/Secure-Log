'use strict';

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  io.use((socket, next) => {
    const token =
      socket.handshake.auth.token ||
      socket.handshake.headers.authorization?.split(' ')[1];
    if (!token) return next(new Error('Authentication required'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(socket.user.role);
    socket.join(`user:${socket.user.userId}`);

    socket.to('admin').emit('user:online', {
      userId: socket.user.userId,
      name: socket.user.name,
      role: socket.user.role,
    });

    socket.on('disconnect', () => {
      socket.to('admin').emit('user:offline', {
        userId: socket.user.userId,
        name: socket.user.name,
      });
    });

    socket.on('error', (err) => {
      const logger = require('../config/logger');
      logger.error({ err }, 'Socket error');
    });
  });

  return io;
};

module.exports = initSocket;
