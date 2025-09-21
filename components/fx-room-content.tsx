'use client';

import { useEffect, useRef } from 'react';
import {
  DataPacket_Kind,
  RemoteParticipant,
  RemoteTrack,
  RemoteTrackPublication,
  RoomEvent,
  Track,
  TrackPublication,
} from 'livekit-client';
import { useRoomContext } from '@livekit/components-react';

export function FxRoomContent() {
  console.log(`[${new Date().toLocaleTimeString()}] [Front] [FxRoomContent] 渲染`);

  const room = useRoomContext();
  const videoEl = useRef<HTMLVideoElement>(null);
  // const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!room) return;

    // mediaStreamRef.current = new MediaStream();
    // if (videoEl.current) {
    //   videoEl.current.srcObject = mediaStreamRef.current;
    // }

    const handleTrack = (track: RemoteTrack | Track) => {
      console.log(
        `[${new Date().toLocaleTimeString()}] [Front] [FxRoomContent] handleTrack:`,
        track,
        track.mediaStream
      );
      if (track.kind === 'video' && videoEl.current && track.mediaStream) {
        console.log(
          `[${new Date().toLocaleTimeString()}] [Front] [FxRoomContent] Attaching mediaStream from track: ${track.sid}`
        );
        videoEl.current.srcObject = track.mediaStream;
      }
    };

    // 2. 处理已经存在的轨道 (关键步骤)
    // 遍历所有远程参与者
    room.remoteParticipants.forEach((participant) => {
      // 遍历他们的视频轨道
      participant.videoTrackPublications.forEach((publication: RemoteTrackPublication) => {
        if (publication.track) {
          handleTrack(publication.track);
        }
      });
      // 遍历他们的音频轨道（如果需要）
      participant.audioTrackPublications.forEach((publication: RemoteTrackPublication) => {
        if (publication.track) {
          handleTrack(publication.track);
        }
      });
    });

    // 3. 为将来发布的轨道设置监听器
    const onTrackSubscribed = (
      track: RemoteTrack,
      publication: RemoteTrackPublication,
      participant: RemoteParticipant
    ) => {
      console.log(
        `[${new Date().toLocaleTimeString()}] [Front] [FxRoomContent] 轨道已订阅 (TrackSubscribed event).`
      );
      handleTrack(track);
    };

    const onTrackPublished = (publication: TrackPublication, participant: RemoteParticipant) => {
      console.log(
        `[${new Date().toLocaleTimeString()}] [Front] [FxRoomContent] Track PUBLISHED by ${participant.identity}. Track SID: ${publication.trackSid}, kind: ${publication.kind}. Is subscribable: ${publication.isSubscribed}`
      );
      // 如果轨道是视频且我们没有自动订阅，可以手动订阅
      if (publication.kind === 'video' && !publication.isSubscribed) {
        // publication.setSubscribed(true);
        console.log(`====`);
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
        `[${new Date().toLocaleTimeString()}] [INFO] [RoomContent] Received data from ${participant?.identity}: ${message} (kind: ${kind}, topic: ${topic || 'none'})`
      );
    };

    const onTrackUnsubscribed = (
      track: Track,
      publication: TrackPublication,
      participant: RemoteParticipant
    ) => {
      console.log(
        `[${new Date().toLocaleTimeString()}] [Front] [FxRoomContent] Track UNSUBSCRIBED from ${participant.identity}. Kind: ${track.kind}`
      );
    };

    room.on(RoomEvent.TrackPublished, onTrackPublished);
    room.on(RoomEvent.TrackSubscribed, onTrackSubscribed);
    room.on(RoomEvent.TrackUnsubscribed, onTrackUnsubscribed);
    room.on(RoomEvent.DataReceived, onDataReceived);

    return () => {
      room.off(RoomEvent.TrackPublished, onTrackPublished);
      room.off(RoomEvent.TrackSubscribed, onTrackSubscribed);
      room.off(RoomEvent.TrackUnsubscribed, onTrackUnsubscribed);
    };
  }, [room]);

  return (
    <div className="relative h-full w-full bg-black">
      <video ref={videoEl} className="h-full w-full object-contain" autoPlay muted playsInline />
      {/* playsInline */}
    </div>
  );
}
