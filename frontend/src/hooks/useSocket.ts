import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useToastStore } from '../store/toast.store';

let socketInstance: Socket | null = null;

export function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io({
      transports: ['websocket', 'polling'],
      withCredentials: true,
      autoConnect: true,
    });
  }
  return socketInstance;
}

export function useSocket(onDataChange?: () => void) {
  const { addToast } = useToastStore();

  useEffect(() => {
    const socket = getSocket();

    const handleSampleCreated = (data: any) => {
      addToast({
        type: 'info',
        title: 'Mẫu thử mới',
        message: `Mẫu "${data.sample?.sample_code}" vừa được thêm mới.`,
      });
      if (onDataChange) onDataChange();
    };

    const handleSampleUpdated = (data: any) => {
      addToast({
        type: 'info',
        title: 'Cập nhật mẫu thử',
        message: `Mẫu "${data.sample?.sample_code}" đã được cập nhật.`,
      });
      if (onDataChange) onDataChange();
    };

    const handleSampleDeleted = () => {
      addToast({
        type: 'warning',
        title: 'Xóa mẫu thử',
        message: 'Một mẫu thử vừa được xóa mềm.',
      });
      if (onDataChange) onDataChange();
    };

    const handleSamplesBulkDeleted = (data: any) => {
      addToast({
        type: 'warning',
        title: 'Xóa nhiều mẫu',
        message: `Đã có ${data.ids?.length || 0} mẫu thử được xóa khỏi danh sách.`,
      });
      if (onDataChange) onDataChange();
    };

    const handleSampleRestored = (data: any) => {
      addToast({
        type: 'success',
        title: 'Khôi phục mẫu thử',
        message: `Mẫu "${data.sample?.sample_code}" đã được khôi phục.`,
      });
      if (onDataChange) onDataChange();
    };

    const reconnect = () => { onDataChange?.(); };
    socket.on('connect', reconnect);
    socket.on('sample:created', handleSampleCreated);
    socket.on('sample:updated', handleSampleUpdated);
    socket.on('sample:deleted', handleSampleDeleted);
    socket.on('sample:restored', handleSampleRestored);
    socket.on('samples:bulk_deleted', handleSamplesBulkDeleted);

    return () => {
      socket.off('connect', reconnect);
      socket.off('sample:created', handleSampleCreated);
      socket.off('sample:updated', handleSampleUpdated);
      socket.off('sample:deleted', handleSampleDeleted);
      socket.off('sample:restored', handleSampleRestored);
      socket.off('samples:bulk_deleted', handleSamplesBulkDeleted);
    };
  }, [onDataChange, addToast]);
}
