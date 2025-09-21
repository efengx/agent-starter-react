'use client';

import { useEffect, useRef, useState } from 'react';
import Draggable from 'react-draggable';
import { Room } from 'livekit-client';
import { RoomAudioRenderer, RoomContext } from '@livekit/components-react';
import { ArrowsOutIcon, MinusIcon } from '@phosphor-icons/react';
import { RoomContent } from './room-content';

interface FirstxaiHumanViewProps {
  isOpen: boolean;
  serverUrl: string;
  token: string;
}

export function FirstxaiHumanView({ isOpen, serverUrl, token }: FirstxaiHumanViewProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const nodeRef = useRef(null);

  const [room] = useState(
    () =>
      new Room({
        adaptiveStream: true,
        dynacast: true,
      })
  );

  console.log(
    `[${new Date().toLocaleTimeString()}] [Front] [FirstxaiHumanView] 使用 useEffect 来管理房间的连接和断开生命周期`
  );
  useEffect(() => {
    if (!isOpen || !serverUrl || !token) {
      return;
    }

    let isCancelled = false;

    const connectToRoom = async () => {
      try {
        console.log(
          `[${new Date().toLocaleTimeString()}] [Front] [FirstxaiHumanView] Connecting to LiveKit room...`
        );
        await room.connect(serverUrl, token, {
          autoSubscribe: true,
        });

        if (isCancelled) {
          console.log(
            `[${new Date().toLocaleTimeString()}] [Front] [FirstxaiHumanView] Connection cancelled, disconnecting immediately.`
          );
          await room.disconnect();
          return;
        }
        console.log(
          `[${new Date().toLocaleTimeString()}] [Front] [FirstxaiHumanView] 根据之前的配置，默认打开麦克风，关闭摄像头`
        );
        await room.localParticipant.setMicrophoneEnabled(true);
        await room.localParticipant.setCameraEnabled(false);
      } catch (error) {
        console.log(
          `[${new Date().toLocaleTimeString()}] [Front] [FirstxaiHumanView] 只在不是由我们主动取消的情况下才打印错误`
        );
        if (!isCancelled) {
          console.error('Failed to connect to LiveKit room:', error);
        }
      }
    };

    connectToRoom();

    // 清理函数
    return () => {
      console.log(
        `[${new Date().toLocaleTimeString()}] [Front] [FirstxaiHumanView] Cleanup function called. Disconnecting...`
      );
      isCancelled = true;
      // 确保调用 disconnect
      room.disconnect();
    };
  }, [isOpen, serverUrl, token, room]);

  if (!isOpen) {
    return null;
  }

  console.log(
    `[${new Date().toLocaleTimeString()}] [Front] [FirstxaiHumanView] serverUrl:`,
    serverUrl
  );
  console.log(`[${new Date().toLocaleTimeString()}] [Front] [FirstxaiHumanView] token:`, token);

  return (
    <RoomContext.Provider value={room}>
      <div className="pointer-events-none fixed inset-0 z-60 h-screen w-screen">
        <Draggable nodeRef={nodeRef} handle=".drag-handle" bounds="parent">
          <div
            ref={nodeRef}
            className={`pointer-events-auto absolute right-5 bottom-5 z-70 flex flex-col overflow-hidden rounded-lg border border-gray-700 bg-gray-900 shadow-2xl transition-[height,width] duration-300 ease-in-out ${
              isMinimized ? 'h-[48px] w-[300px]' : 'h-[700px] w-[300px] md:h-[700px] md:w-[400px]'
            }`}
          >
            <div className="drag-handle flex cursor-move items-center justify-between bg-gray-800 p-2 text-white">
              <h3 className="text-sm font-semibold">xilabs human</h3>
              <button
                onClick={() => {
                  console.log(`[Front] Toggle minimize`);
                  setIsMinimized(!isMinimized);
                }}
                className="rounded p-1 transition-colors hover:bg-gray-700"
                aria-label={isMinimized ? 'Maximize video window' : 'Minimize video window'}
              >
                {isMinimized ? <ArrowsOutIcon size={16} /> : <MinusIcon size={16} />}
              </button>
            </div>

            {!isMinimized && (
              <div data-lk-theme="default" className="h-full">
                <RoomAudioRenderer />
                <RoomContent />
              </div>
            )}
          </div>
        </Draggable>
      </div>
    </RoomContext.Provider>
  );
}
