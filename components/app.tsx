'use client';

import { motion } from 'motion/react';
import { RoomAudioRenderer, RoomContext, StartAudio } from '@livekit/components-react';
import { SessionView } from '@/components/session-view';
import { Toaster } from '@/components/ui/sonner';
import { Welcome } from '@/components/welcome';
import { useAppRoom } from '@/hooks/useAppRoom';
// 导入我们新的 Hook
import type { AppConfig } from '@/lib/types';
import { FirstxaiHumanView } from './firstxai-human-view';

const MotionWelcome = motion.create(Welcome);
const MotionSessionView = motion.create(SessionView);

interface AppProps {
  appConfig: AppConfig;
}

export function App({ appConfig }: AppProps) {
  const { room, sessionStarted, connectionDetails, isVideoWindowOpen, startSession } =
    useAppRoom(appConfig);

  const { startButtonText } = appConfig;

  console.log(`[${new Date().toLocaleTimeString()}] [Front] [App] 渲染`);

  return (
    <main>
      <MotionWelcome
        key="welcome"
        startButtonText={startButtonText}
        onStartCall={startSession}
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
          connectionDetails={connectionDetails}
          initial={{ opacity: 0 }}
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
