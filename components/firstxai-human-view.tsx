'use client';

import { useRef, useState } from 'react';
import Draggable from 'react-draggable';
import { ConnectionState } from 'livekit-client';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoConference,
  useConnectionState,
} from '@livekit/components-react';
import { ArrowsOutIcon, MinusIcon } from '@phosphor-icons/react';
import { RoomContent } from './room-content';

interface FirstxaiHumanViewProps {
  isOpen: boolean;
  serverUrl: string;
  token: string;
}

// function LoadingSpinner() {
//   return (
//     <div className="absolute inset-0 z-10 flex items-center justify-center">
//       <div className="h-12 w-12 animate-spin rounded-full border-4 border-solid border-white border-t-transparent"></div>
//     </div>
//   );
// }

export function FirstxaiHumanView({ isOpen, serverUrl, token }: FirstxaiHumanViewProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const nodeRef = useRef(null);

  if (!isOpen) {
    return null;
  }

  console.log(`[Front] serverUrl:`, serverUrl);
  console.log(`[Front] token:`, token);

  return (
    <div className="pointer-events-none fixed inset-0 z-60 h-screen w-screen">
      <Draggable nodeRef={nodeRef} handle=".drag-handle" bounds="parent">
        <div
          ref={nodeRef}
          className={`pointer-events-auto absolute right-5 bottom-5 z-70 flex flex-col overflow-hidden rounded-lg border border-gray-700 bg-gray-900 shadow-2xl transition-[height,width] duration-300 ease-in-out ${
            isMinimized ? 'h-[48px] w-[300px]' : 'h-[252px] w-[300px] md:h-[252px] md:w-[450px]'
          }`}
        >
          <div className="drag-handle flex cursor-move items-center justify-between bg-gray-800 p-2 text-white">
            <h3 className="text-sm font-semibold">FirstxAI Human</h3>
            <button
              onClick={() => {
                console.log(`[Front] 收缩`);
                return setIsMinimized(!isMinimized);
              }}
              className="rounded p-1 transition-colors hover:bg-gray-700"
              aria-label={isMinimized ? 'Maximize video window' : 'Minimize video window'}
            >
              {isMinimized ? <ArrowsOutIcon size={16} /> : <MinusIcon size={16} />}
            </button>
          </div>

          {!isMinimized && (
            <div data-lk-theme="default" className="h-full">
              <LiveKitRoom
                serverUrl={serverUrl}
                token={token}
                connect={true}
                video={false}
                audio={true}
              >
                <RoomAudioRenderer />
                <RoomContent />
              </LiveKitRoom>
            </div>
          )}
        </div>
      </Draggable>
    </div>
  );
}
