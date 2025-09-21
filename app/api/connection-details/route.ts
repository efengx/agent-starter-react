// app/api/connection-details/route.ts
import { NextResponse } from 'next/server';
import { AccessToken, type AccessTokenOptions, type VideoGrant } from 'livekit-server-sdk';
import { RoomConfiguration } from '@livekit/protocol';
import { AgentMetadata, SessionData } from '@/lib/types';

// NOTE: you are expected to define the following environment variables in `.env.local`:
const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

// Heygen env
const NEXT_PUBLIC_BASE_API_URL = process.env.NEXT_PUBLIC_BASE_API_URL;
const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
const HEYGEN_AVATAR_ID = process.env.HEYGEN_AVATAR_ID;

// don't cache the results
export const revalidate = 0;

type StartResult = {
  code: number;
  data: null;
  message: string;
};

export type ConnectionDetails = {
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantToken: string;
  livekitUrl: string;
  livekitToken: string;
  sessionId: string;
  token: string;
};

export async function POST(req: Request) {
  try {
    if (LIVEKIT_URL === undefined) {
      throw new Error('LIVEKIT_URL is not defined');
    }
    if (API_KEY === undefined) {
      throw new Error('LIVEKIT_API_KEY is not defined');
    }
    if (API_SECRET === undefined) {
      throw new Error('LIVEKIT_API_SECRET is not defined');
    }
    console.log(
      `[API] [connection-details] [route.ts] Parse agent configuration from request body`
    );
    const body = await req.json();
    const agentName: string = body?.room_config?.agents?.[0]?.agent_name;

    console.log(`[API] Generate participant token`);
    const participantName = 'user';
    const participantIdentity = `voice_assistant_user_${Math.floor(Math.random() * 10_000)}`;
    const roomName = `voice_assistant_room_${Math.floor(Math.random() * 10_000)}`;

    console.log(`[API] 添加Livekit Agent元数据`);
    // const token = 'test-token';
    // const sessionData: SessionData = {
    //   session_id: 'test-session_id',
    //   url: 'test-url',
    //   access_token: 'test-access_token',
    // };

    const token = await createToken();
    console.log(`[API] show token:`, token);
    const sessionData: SessionData = await streamingNew(token);
    console.log(`[API] show sesssionData:`, sessionData);
    const startText = await streamingStart(token, sessionData);
    console.log(`[API] show startText:`, startText);

    const agentMetadata: AgentMetadata = {
      sessionId: sessionData.session_id,
      token: token,
    };

    const participantToken = await createParticipantToken(
      { identity: participantIdentity, name: participantName },
      roomName,
      agentName,
      JSON.stringify(agentMetadata)
    );

    // Return connection details
    const data: ConnectionDetails = {
      serverUrl: LIVEKIT_URL,
      roomName,
      participantToken: participantToken,
      participantName,
      // 自定义返回信息
      livekitUrl: sessionData.url,
      livekitToken: sessionData.access_token,
      sessionId: sessionData.session_id,
      token: token,
    };
    const headers = new Headers({
      'Cache-Control': 'no-store',
    });
    return NextResponse.json(data, { headers });
  } catch (error) {
    console.error(
      `[${new Date().toLocaleTimeString()}] [API Error] Failed to get connection details:`,
      error
    );
    if (error instanceof Error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      console.log(`[${new Date().toLocaleTimeString()}] [API] [Error] error.cause:`, error.cause);
      // console.log(
      //   `[${new Date().toLocaleTimeString()}] [API] [Error] error.cause.code:`,
      //   (error.cause as { code: string }).code
      // );
      return NextResponse.json(
        { error: errorMessage },
        { status: 500, statusText: 'Internal Server Error' }
      );
    }
  }
}

function createParticipantToken(
  userInfo: AccessTokenOptions,
  roomName: string,
  agentName?: string,
  metadata?: string
): Promise<string> {
  const at = new AccessToken(API_KEY, API_SECRET, {
    ...userInfo,
    ttl: '15m',
  });
  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  };
  at.addGrant(grant);

  if (agentName) {
    at.roomConfig = new RoomConfiguration({
      agents: [{ agentName: agentName, metadata: metadata }],
    });
  }

  return at.toJwt();
}

async function createToken(): Promise<string> {
  if (!HEYGEN_API_KEY) {
    console.log('[API] HEYGEN_API_KEY 环境变量未设置');
    throw new Error('HEYGEN_API_KEY is not defined in environment variables.');
  }

  const response = await fetch(`${NEXT_PUBLIC_BASE_API_URL}/v1/streaming.create_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': HEYGEN_API_KEY,
    },
  });

  if (!response.ok) {
    const errorText = await response.json();
    console.log(`[API] 获取 Session Token 失败 errorText:`, errorText);
    throw new Error(`获取 Session Token 失败 errorText:`, errorText);
  }

  const {
    data: { token: heygenToken },
  } = await response.json();
  return heygenToken;
}

async function streamingNew(heygenToken: string): Promise<SessionData> {
  const sessionResponse = await fetch(`${NEXT_PUBLIC_BASE_API_URL}/v1/streaming.new`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${heygenToken}`,
    },
    body: JSON.stringify({
      quality: 'low',
      avatar_name: HEYGEN_AVATAR_ID,
      version: 'v2',
      activity_idle_timeout: 120,
    }),
  });

  if (!sessionResponse.ok) {
    const errorText = await sessionResponse.text();
    console.log(`[Error] 创建 HeyGen 会话失败: ${errorText}`);
    throw new Error(`创建 HeyGen 会话失败: ${errorText}`);
  }
  const { data: sessionData }: { data: SessionData } = await sessionResponse.json();
  return sessionData;
}

// 启动房间开始计费
async function streamingStart(
  heygenToken: string,
  heygenSessionData: SessionData
): Promise<StartResult> {
  const startResponse = await fetch(`${NEXT_PUBLIC_BASE_API_URL}/v1/streaming.start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${heygenToken}`,
    },
    body: JSON.stringify({
      session_id: heygenSessionData.session_id,
    }),
  });
  if (!startResponse.ok) {
    const errorText = await startResponse.json();
    console.log(`[Error] 创建 HeyGen 房间准备失败: ${errorText}`);
    throw new Error(`[API] 创建 HeyGen 房间准备失败: ${errorText}`);
  }
  const result: StartResult = await startResponse.json();
  return result;
}
