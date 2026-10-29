import { Server as SocketIOServer } from 'socket.io';
import { SOCKET_EVENTS } from '../config/constants';
import { logger } from '../infrastructure/logger/logger';

class RealtimeService {
  private io: SocketIOServer | null = null;

  setIO(io: SocketIOServer): void {
    this.io = io;
    logger.info('RealtimeService initialized with Socket.IO instance');
  }

  emit(event: string, payload: unknown, room = 'main'): void {
    if (!this.io) {
      logger.warn(`RealtimeService.emit: Socket.IO not yet attached, dropping event ${event}`);
      return;
    }
    this.io.to(room).emit(event, payload);
    logger.debug({ event, room }, 'Socket.IO event emitted');
  }

  emitToUser(userId: string, event: string, payload: unknown): void {
    if (!this.io) return;
    this.io.to(`user:${userId}`).emit(event, payload);
  }

  broadcast(event: string, payload: unknown, room = 'main'): void {
    this.emit(event, payload, room);
  }

  // Predefined event helpers
  emitSampleCreated(sample: unknown): void {
    this.emit(SOCKET_EVENTS.SAMPLE_CREATED, { sample });
  }

  emitSampleUpdated(sample: unknown): void {
    this.emit(SOCKET_EVENTS.SAMPLE_UPDATED, { sample });
  }

  emitSampleDeleted(id: string, deletedAt: string): void {
    this.emit(SOCKET_EVENTS.SAMPLE_DELETED, { id, deletedAt });
  }

  emitSampleRestored(sample: unknown): void {
    this.emit(SOCKET_EVENTS.SAMPLE_RESTORED, { sample });
  }

  emitSamplesBulkDeleted(ids: string[]): void {
    this.emit(SOCKET_EVENTS.SAMPLES_BULK_DELETED, { ids });
  }

}

export const realtimeService = new RealtimeService();
