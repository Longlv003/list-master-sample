"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.realtimeService = void 0;
const constants_1 = require("../config/constants");
const logger_1 = require("../infrastructure/logger/logger");
class RealtimeService {
    io = null;
    setIO(io) {
        this.io = io;
        logger_1.logger.info('RealtimeService initialized with Socket.IO instance');
    }
    emit(event, payload, room = 'main') {
        if (!this.io) {
            logger_1.logger.warn(`RealtimeService.emit: Socket.IO not yet attached, dropping event ${event}`);
            return;
        }
        this.io.to(room).emit(event, payload);
        logger_1.logger.debug({ event, room }, 'Socket.IO event emitted');
    }
    emitToUser(userId, event, payload) {
        if (!this.io)
            return;
        this.io.to(`user:${userId}`).emit(event, payload);
    }
    broadcast(event, payload, room = 'main') {
        this.emit(event, payload, room);
    }
    // Predefined event helpers
    emitSampleCreated(sample) {
        this.emit(constants_1.SOCKET_EVENTS.SAMPLE_CREATED, { sample });
    }
    emitSampleUpdated(sample) {
        this.emit(constants_1.SOCKET_EVENTS.SAMPLE_UPDATED, { sample });
    }
    emitSampleDeleted(id, deletedAt) {
        this.emit(constants_1.SOCKET_EVENTS.SAMPLE_DELETED, { id, deletedAt });
    }
    emitSampleRestored(sample) {
        this.emit(constants_1.SOCKET_EVENTS.SAMPLE_RESTORED, { sample });
    }
    emitSamplesBulkDeleted(ids) {
        this.emit(constants_1.SOCKET_EVENTS.SAMPLES_BULK_DELETED, { ids });
    }
}
exports.realtimeService = new RealtimeService();
