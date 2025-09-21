'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LogLevel, Room, RoomEvent, setLogLevel } from 'livekit-client';
import type { ConnectionDetails } from '@/app/api/connection-details/route';
import { toastAlert } from '@/components/alert-toast';
import useConnectionDetails from '@/hooks/useConnectionDetails';
import type { AppConfig } from '@/lib/types';

setLogLevel(LogLevel.warn);

/**
 * 这个自定义 Hook 封装了 LiveKit Room 的所有核心逻辑。
 * 它负责创建 Room 实例、管理连接状态、处理事件以及维护相关UI状态。
 * 这样做可以将复杂的连接逻辑与 App 组件的渲染逻辑分离。
 */
export function useAppRoom(appConfig: AppConfig) {
  // 1. 创建 Room 实例，使用 useMemo 确保它只被创建一次。
  const room = useMemo(() => new Room(), []);

  // 2. 状态管理：这些状态之前在 App 组件中。
  const [sessionStarted, setSessionStarted] = useState(false);
  const [connectionDetails, setConnectionDetails] = useState<ConnectionDetails | null>(null);
  const [isVideoWindowOpen, setIsVideoWindowOpen] = useState(false);

  // 3. 辅助 Hooks 和 Refs
  const { refreshConnectionDetails, existingOrRefreshConnectionDetails } =
    useConnectionDetails(appConfig);
  const pendingConnectionDetailsRef = useRef<ConnectionDetails | null>(null);

  // 4. 开始会话的核心函数
  const startSession = useCallback(async () => {
    setSessionStarted(true);

    try {
      const details = await existingOrRefreshConnectionDetails();
      pendingConnectionDetailsRef.current = details;

      // 预连接麦克风以减少延迟
      await room.localParticipant.setMicrophoneEnabled(false, undefined, {
        preConnectBuffer: appConfig.isPreConnectBufferEnabled,
      });
      await room.connect(details.serverUrl, details.participantToken);
    } catch (error) {
      console.error('Error during connection process:', error);
      if (error instanceof Error) {
        toastAlert({
          title: 'There was an error connecting to the agent',
          description: `${error.name}: ${error.message}`,
        });
      }
      // 如果连接失败，重置所有状态
      setSessionStarted(false);
      pendingConnectionDetailsRef.current = null;
      setConnectionDetails(null);
      setIsVideoWindowOpen(false);
    }
  }, [room, appConfig.isPreConnectBufferEnabled, existingOrRefreshConnectionDetails]);

  // 5. 封装断开连接的逻辑
  const endSession = useCallback(() => {
    if (room.state !== 'disconnected') {
      room.disconnect();
    }
    // 手动重置状态，因为 onDisconnected 事件可能不会立即触发或在某些情况下不触发
    setSessionStarted(false);
    setConnectionDetails(null);
    setIsVideoWindowOpen(false);
    pendingConnectionDetailsRef.current = null;
    refreshConnectionDetails();
  }, [room, refreshConnectionDetails]);

  // 6. useEffect 来处理 Room 的事件监听和清理
  useEffect(() => {
    const onConnected = () => {
      // 连接成功后，将待定的连接详情设置为当前连接详情
      if (pendingConnectionDetailsRef.current) {
        setConnectionDetails(pendingConnectionDetailsRef.current);
        setIsVideoWindowOpen(true);
        pendingConnectionDetailsRef.current = null;
      }
    };

    const onDisconnected = () => {
      console.log(
        `[${new Date().toLocaleTimeString()}] [Front] [useAppRoom] Disconnected from room.`
      );
      // 重置所有状态，为下一次会话做准备
      setSessionStarted(false);
      setConnectionDetails(null);
      setIsVideoWindowOpen(false);
      pendingConnectionDetailsRef.current = null;
      refreshConnectionDetails();
    };

    const onMediaDevicesError = (error: Error) => {
      toastAlert({
        title: 'Encountered an error with your media devices',
        description: `${error.name}: ${error.message}`,
      });
    };

    // 绑定事件监听器
    room.on(RoomEvent.Connected, onConnected);
    room.on(RoomEvent.Disconnected, onDisconnected);
    room.on(RoomEvent.MediaDevicesError, onMediaDevicesError);

    // 清理函数：组件卸载时断开连接并移除监听器
    return () => {
      room.off(RoomEvent.Connected, onConnected);
      room.off(RoomEvent.Disconnected, onDisconnected);
      room.off(RoomEvent.MediaDevicesError, onMediaDevicesError);
      if (room.state !== 'disconnected') {
        room.disconnect();
      }
    };
  }, [room, refreshConnectionDetails]);

  // 7. 返回所有需要被 App 组件使用的状态和函数
  return {
    room,
    sessionStarted,
    connectionDetails,
    isVideoWindowOpen,
    startSession,
    endSession, // 如果需要手动结束会话，可以暴露这个
  };
}
