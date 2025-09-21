'use client';

import { useEffect } from 'react';
import { Track } from 'livekit-client';
import {
  type TrackReference,
  VideoTrack,
  useRoomContext,
  useTracks,
} from '@livekit/components-react';

export function FxRoomContent() {
  console.log(`[${new Date().toLocaleTimeString()}] [Front] [FxRoomContent] 渲染 (使用 hooks)`);

  const room = useRoomContext();

  const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }], {
    room: room,
  });

  // 关键修改在这里！
  // 我们在查找条件中加入了 trackRef.publication 的检查。
  // 这会过滤掉所有占位符（因为它们的 publication 是 undefined），
  // 并向 TypeScript 保证，如果找到了结果，那它一定是类型为 TrackReference 的真实轨道。
  const humanVideoTrackRef = tracks.find(
    (
      trackRef
    ): trackRef is TrackReference => // <-- 类型谓词
      !!trackRef.publication && // 确保是真实的轨道 (publication 不为 undefined)
      !trackRef.publication.isMuted && // 检查轨道是否未被静音
      trackRef.participant.identity !== room.localParticipant.identity
  );

  useEffect(() => {
    if (humanVideoTrackRef && humanVideoTrackRef.publication) {
      console.log(
        `[${new Date().toLocaleTimeString()}] [Front] [FxRoomContent] 找到了 human 的视频轨道:`,
        humanVideoTrackRef.publication.trackSid
      );
    } else {
      console.log(
        `[${new Date().toLocaleTimeString()}] [Front] [FxRoomContent] 正在等待 human 的未静音视频轨道...`
      );
    }
  }, [humanVideoTrackRef]);

  return (
    <div className="relative h-full w-full bg-black">
      {humanVideoTrackRef && (
        <VideoTrack trackRef={humanVideoTrackRef} className="h-full w-full object-contain" />
      )}

      {!humanVideoTrackRef && (
        <div className="flex h-full w-full items-center justify-center text-white">
          <p>Connecting to video stream...</p>
        </div>
      )}
    </div>
  );
}
