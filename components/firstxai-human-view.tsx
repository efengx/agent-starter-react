'use client';

import { useEffect, useState } from 'react';
import { Room } from 'livekit-client';
import { RoomAudioRenderer, RoomContext } from '@livekit/components-react';
import { FxRoomContent } from './fx-room-content';

interface FirstxaiHumanViewProps {
  isOpen: boolean;
  serverUrl: string;
  token: string;
}

export function FirstxaiHumanView({ isOpen, serverUrl, token }: FirstxaiHumanViewProps) {
  const [connectedRoom, setConnectedRoom] = useState<Room | undefined>(undefined);

  console.log(`[${new Date().toLocaleTimeString()}] [Front] [FirstxaiHumanView] 渲染`);

  useEffect(() => {
    if (!isOpen || !serverUrl || !token) {
      return;
    }

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });

    console.log(
      `[${new Date().toLocaleTimeString()}] [Front] [FirstxaiHumanView] Creating and connecting to a new room instance...`
    );

    (async () => {
      try {
        await room.connect(serverUrl, token, { autoSubscribe: true });
        console.log(
          `[${new Date().toLocaleTimeString()}] [Front] [FirstxaiHumanView] Successfully connected to LiveKit room.`
        );
        setConnectedRoom(room);
      } catch (error) {
        if (room.state !== 'disconnected') {
          console.error('Failed to connect to LiveKit room:', error);
        }
      }
    })();

    return () => {
      console.log(
        `[${new Date().toLocaleTimeString()}] [Front] [FirstxaiHumanView] Cleanup function called. Disconnecting...`
      );
      room.disconnect();
      setConnectedRoom(undefined);
    };
  }, [isOpen, serverUrl, token]);

  if (!isOpen || !connectedRoom) {
    return null;
  }

  return (
    <div className="pointer-events-auto fixed top-5 left-1/2 z-60 flex h-[500px] w-[700px] -translate-x-1/2 flex-col overflow-hidden rounded-lg border border-gray-700 bg-gray-900 shadow-2xl">
      <div className="drag-handle flex cursor-move items-center justify-between bg-gray-800 p-2 text-white">
        <h3 className="text-sm font-semibold">xilabs human</h3>
      </div>

      <RoomContext.Provider value={connectedRoom}>
        <RoomAudioRenderer />
        <FxRoomContent />
      </RoomContext.Provider>
    </div>
  );
}
