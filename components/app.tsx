'use client';

// components/app.tsx
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Participant, Room, RoomEvent } from 'livekit-client';
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
  const [isVideoWindowOpen, setIsVideoWindowOpen] = useState(false);

  const handleStartCall = useCallback(async () => {
    setSessionStarted(true);

    try {
      const details = await existingOrRefreshConnectionDetails();
      console.log(`[Front] Connection details received:`, details);

      setConnectionDetails(details);
      setIsVideoWindowOpen(true);

      console.log(`[Front] [app] 设置麦克风, 并连接到房间`);
      await room.localParticipant.setMicrophoneEnabled(false, undefined, {
        preConnectBuffer: appConfig.isPreConnectBufferEnabled,
      });
      await room.connect(details.serverUrl, details.participantToken);

      console.log('[Front] [app] Successfully connected to the room.');
    } catch (error) {
      console.error('Error during connection process:', error);
      if (error instanceof Error) {
        toastAlert({
          title: 'There was an error connecting to the agent',
          description: `${error.name}: ${error.message}`,
        });
        console.log(`[Front] [app] 如果失败重置组件状态`);
        setSessionStarted(false);
        setConnectionDetails(null);
        setIsVideoWindowOpen(false);
      }
    }
  }, [room, appConfig.isPreConnectBufferEnabled, existingOrRefreshConnectionDetails]);

  useEffect(() => {
    const onDisconnected = () => {
      console.log('[Front] 与房间断开连接');
      setSessionStarted(false);

      console.log(`[Front] 准备下一次链接`);
      refreshConnectionDetails();
      setIsVideoWindowOpen(false);
      setConnectionDetails(null);
    };

    const onMediaDevicesError = (error: Error) => {
      toastAlert({
        title: 'Encountered an error with your media devices',
        description: `${error.name}: ${error.message}`,
      });
    };

    console.log(`[Front] [app] 监听参与者连接事件`);
    const onParticipantConnected = (participant: Participant) => {
      console.log(`[Front] [participant] 检查元数据，判断是否为 agent:`, participant);
      // if (participant.metadata?.kind === 'agent') {
      //   console.log('[Front] Agent participant connected:', participant);
      //   setAgentParticipant(participant);
      // }
    };

    console.log(`[Front] [app] 监听参与者断开连接事件`);
    const onParticipantDisconnected = (participant: Participant) => {
      console.log(`[Front] [participant] 如果断开的是我们存储的 agent，则清空 state:`, participant);
      // if (participant.metadata?.kind === 'agent') {
      //   console.log('[Front] Agent participant disconnected.');
      //   setAgentParticipant(null);
      // }
    };

    console.log(`[Front] [app] 用户连接成功后，检查房间中是否已有 agent`);
    const onConnected = () => {
      room.remoteParticipants.forEach((participant) => {
        console.log(`[Front] [participant] 遍历房间内所有远程参与者:`, participant);
        // if (participant.metadata?.kind === 'agent') {
        //   console.log('[Front] Found existing agent participant in the room:', participant);
        //   setAgentParticipant(participant);
        // }
      });
    };

    room.on(RoomEvent.ParticipantConnected, onParticipantConnected);
    room.on(RoomEvent.ParticipantDisconnected, onParticipantDisconnected);
    room.on(RoomEvent.Connected, onConnected);

    room.on(RoomEvent.MediaDevicesError, onMediaDevicesError);
    room.on(RoomEvent.Disconnected, onDisconnected);

    return () => {
      room.disconnect();
      room.off(RoomEvent.Disconnected, onDisconnected);
      room.off(RoomEvent.MediaDevicesError, onMediaDevicesError);
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
          // onClose={() => setIsVideoWindowOpen(false)}
          serverUrl={connectionDetails.livekitUrl}
          token={connectionDetails.livekitToken}
        />
      )}

      <Toaster />
    </main>
  );
}
