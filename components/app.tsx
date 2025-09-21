'use client';

// components/app.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LogLevel, Participant, Room, RoomEvent, setLogLevel } from 'livekit-client';
import { motion } from 'motion/react';
import { RoomAudioRenderer, RoomContext, StartAudio } from '@livekit/components-react';
import { ConnectionDetails } from '@/app/api/connection-details/route';
import { toastAlert } from '@/components/alert-toast';
import { SessionView } from '@/components/session-view';
import { Toaster } from '@/components/ui/sonner';
import { Welcome } from '@/components/welcome';
import useConnectionDetails from '@/hooks/useConnectionDetails';
import type { AppConfig } from '@/lib/types';
import { FirstxaiHumanView } from './firstxai-human-view';

setLogLevel(LogLevel.warn);

const MotionWelcome = motion.create(Welcome);
const MotionSessionView = motion.create(SessionView);

interface AppProps {
  appConfig: AppConfig;
}

export function App({ appConfig }: AppProps) {
  const room = useMemo(() => new Room(), []);
  const [sessionStarted, setSessionStarted] = useState(false);
  const { refreshConnectionDetails, existingOrRefreshConnectionDetails } =
    useConnectionDetails(appConfig);

  const [connectionDetails, setConnectionDetails] = useState<ConnectionDetails | null>(null);
  const pendingConnectionDetailsRef = useRef<ConnectionDetails | null>(null);
  const [isVideoWindowOpen, setIsVideoWindowOpen] = useState(false);

  const handleStartCall = useCallback(async () => {
    setSessionStarted(true);

    try {
      const details = await existingOrRefreshConnectionDetails();

      pendingConnectionDetailsRef.current = details;

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
        console.log(`[${new Date().toLocaleTimeString()}] [Front] [app] 如果失败重置组件状态`);
        setSessionStarted(false);
        pendingConnectionDetailsRef.current = null;
        setConnectionDetails(null);
        setIsVideoWindowOpen(false);
      }
    }
  }, [room, appConfig.isPreConnectBufferEnabled, existingOrRefreshConnectionDetails]);

  useEffect(() => {
    const onDisconnected = () => {
      console.log(`[${new Date().toLocaleTimeString()}] [Front] [app] 与房间断开连接`);
      setSessionStarted(false);

      console.log(`[${new Date().toLocaleTimeString()}] [Front] [app] 准备下一次链接`);
      refreshConnectionDetails();

      setIsVideoWindowOpen(false);
      setConnectionDetails(null);
      pendingConnectionDetailsRef.current = null;
    };

    const onMediaDevicesError = (error: Error) => {
      toastAlert({
        title: 'Encountered an error with your media devices',
        description: `${error.name}: ${error.message}`,
      });
    };

    const onParticipantConnected = (participant: Participant) => {
      console.log(
        `[${new Date().toLocaleTimeString()}] [Front] [app] 监听参与者连接事件 检查元数据，判断是否为 agent:`,
        participant
      );
    };

    const onParticipantDisconnected = (participant: Participant) => {
      console.log(
        `[${new Date().toLocaleTimeString()}] [Front] [app] 监听参与者断开连接事件 如果断开的是我们存储的 agent，则清空 state:`,
        participant
      );
    };

    const onConnected = () => {
      if (pendingConnectionDetailsRef.current) {
        setConnectionDetails(pendingConnectionDetailsRef.current);
        setIsVideoWindowOpen(true);
        pendingConnectionDetailsRef.current = null;
      }

      room.remoteParticipants.forEach((participant) => {
        console.log(
          `[${new Date().toLocaleTimeString()}] [Front] [participant] 遍历房间内所有远程参与者:`,
          participant
        );
      });
    };

    room.on(RoomEvent.ParticipantConnected, onParticipantConnected);
    room.on(RoomEvent.ParticipantDisconnected, onParticipantDisconnected);
    room.on(RoomEvent.Connected, onConnected);

    room.on(RoomEvent.MediaDevicesError, onMediaDevicesError);
    room.on(RoomEvent.Disconnected, onDisconnected);

    return () => {
      room.off(RoomEvent.ParticipantConnected, onParticipantConnected);
      room.off(RoomEvent.ParticipantDisconnected, onParticipantDisconnected);
      room.off(RoomEvent.Connected, onConnected);
      room.off(RoomEvent.MediaDevicesError, onMediaDevicesError);
      room.off(RoomEvent.Disconnected, onDisconnected);
      if (room.state !== 'disconnected') {
        room.disconnect();
      }
    };
  }, [room, refreshConnectionDetails]);

  const { startButtonText } = appConfig;

  return (
    <main>
      <MotionWelcome
        key="welcome"
        startButtonText={startButtonText}
        onStartCall={handleStartCall}
        disabled={sessionStarted}
        initial={{ opacity: 1 }}
        animate={{ opacity: sessionStarted ? 0 : 1 }}
        transition={{ duration: 0.5, ease: 'linear', delay: sessionStarted ? 0 : 0.5 }}
      />

      <RoomContext.Provider value={room}>
        <RoomAudioRenderer />
        <StartAudio label="Start Audio" />
        <MotionSessionView
          key="session-view"
          appConfig={appConfig}
          disabled={!sessionStarted}
          sessionStarted={sessionStarted}
          initial={{ opacity: 0 }}
          connectionDetails={connectionDetails}
          animate={{ opacity: sessionStarted ? 1 : 0 }}
          transition={{
            duration: 0.5,
            ease: 'linear',
            delay: sessionStarted ? 0.5 : 0,
          }}
        />
      </RoomContext.Provider>

      {connectionDetails && (
        <FirstxaiHumanView
          isOpen={isVideoWindowOpen}
          serverUrl={connectionDetails.livekitUrl}
          token={connectionDetails.livekitToken}
        />
      )}

      <Toaster />
    </main>
  );
}
