'use client';

import { useEffect, useRef } from 'react';
import { DataPacket_Kind, RemoteParticipant, RoomEvent, Track } from 'livekit-client';
import { useRoomContext } from '@livekit/components-react';

export function RoomContent() {
  const room = useRoomContext();
  const videoEl = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!room) return;

    mediaStreamRef.current = new MediaStream();
    if (videoEl.current) {
      videoEl.current.srcObject = mediaStreamRef.current;
    }

    const onTrackSubscribed = (track: Track) => {
      console.log(
        `[Front] [room-content] 轨道已订阅。当本地参与者成功订阅了一个远程轨道后触发。一旦这个事件触发，你就可以获取到 RemoteTrack 对象，并将其附加到页面的 <video> 或 <audio> 元素上进行播放。`
      );

      if (track.kind === 'video' || track.kind === 'audio') {
        if (mediaStreamRef.current) {
          mediaStreamRef.current.addTrack(track.mediaStreamTrack);
        }
      }
    };

    const onDataReceived = (
      payload: Uint8Array,
      participant?: RemoteParticipant,
      kind?: DataPacket_Kind,
      topic?: string
    ) => {
      const decoder = new TextDecoder();
      const message = decoder.decode(payload);

      console.log(
        `[INFO] [heygen-session.tsx] Received data from ${participant?.identity}: ${message} (kind: ${kind}, topic: ${topic || 'none'})`
      );
    };

    room.on(RoomEvent.TrackSubscribed, onTrackSubscribed);
    room.on(RoomEvent.DataReceived, onDataReceived);

    return () => {
      room.off(RoomEvent.TrackSubscribed, onTrackSubscribed);
      room.off(RoomEvent.DataReceived, onDataReceived);
    };
  }, [room]);

  return (
    <div className="relative h-full w-full">
      <video ref={videoEl} className="h-full w-full object-cover" autoPlay playsInline />
    </div>
  );
}
