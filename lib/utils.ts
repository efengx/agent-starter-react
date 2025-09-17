import { cache } from 'react';
import { type ClassValue, clsx } from 'clsx';
import { Room } from 'livekit-client';
import { twMerge } from 'tailwind-merge';
import type { ReceivedChatMessage, TextStreamData } from '@livekit/components-react';
import { APP_CONFIG_DEFAULTS } from '@/app-config';
import { ConnectionDetails } from '@/app/api/connection-details/route';
import type { AppConfig, SandboxConfig } from './types';

export const CONFIG_ENDPOINT = process.env.NEXT_PUBLIC_APP_CONFIG_ENDPOINT;
export const SANDBOX_ID = process.env.SANDBOX_ID;

export const THEME_STORAGE_KEY = 'theme-mode';
export const THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function transcriptionToChatMessage(
  textStream: TextStreamData,
  room: Room
): ReceivedChatMessage {
  return {
    id: textStream.streamInfo.id,
    timestamp: textStream.streamInfo.timestamp,
    message: textStream.text,
    from:
      textStream.participantInfo.identity === room.localParticipant.identity
        ? room.localParticipant
        : Array.from(room.remoteParticipants.values()).find(
            (p) => p.identity === textStream.participantInfo.identity
          ),
  };
}

// https://react.dev/reference/react/cache#caveats
// > React will invalidate the cache for all memoized functions for each server request.
export const getAppConfig = cache(async (headers: Headers): Promise<AppConfig> => {
  if (CONFIG_ENDPOINT) {
    const sandboxId = SANDBOX_ID ?? headers.get('x-sandbox-id') ?? '';

    try {
      if (!sandboxId) {
        throw new Error('Sandbox ID is required');
      }

      const response = await fetch(CONFIG_ENDPOINT, {
        cache: 'no-store',
        headers: { 'X-Sandbox-ID': sandboxId },
      });

      const remoteConfig: SandboxConfig = await response.json();
      const config: AppConfig = { sandboxId, ...APP_CONFIG_DEFAULTS };

      for (const [key, entry] of Object.entries(remoteConfig)) {
        if (entry === null) continue;
        // Only include app config entries that are declared in defaults and, if set,
        // share the same primitive type as the default value.
        if (
          (key in APP_CONFIG_DEFAULTS &&
            APP_CONFIG_DEFAULTS[key as keyof AppConfig] === undefined) ||
          (typeof config[key as keyof AppConfig] === entry.type &&
            typeof config[key as keyof AppConfig] === typeof entry.value)
        ) {
          // @ts-expect-error I'm not sure quite how to appease TypeScript, but we've thoroughly checked types above
          config[key as keyof AppConfig] = entry.value as AppConfig[keyof AppConfig];
        }
      }

      return config;
    } catch (error) {
      console.error('ERROR: getAppConfig() - lib/utils.ts', error);
    }
  }

  return APP_CONFIG_DEFAULTS;
});

export async function sendTask(connectionDetails: ConnectionDetails | null, text: string) {
  if (!connectionDetails || !connectionDetails.sessionId || !connectionDetails.token) {
    console.error('[Front] [sendTask] 无法发送任务：缺少 connectionDetails、sessionId 或 token。');
    return;
  }

  console.log(`[Front] [sendTask] 准备向会话 ${connectionDetails.sessionId} 发送任务: "${text}"`);

  try {
    const response = await fetch('/api/send-task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: connectionDetails.sessionId,
        token: connectionDetails.token,
        text: text,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '发送任务失败');
    }

    console.log(`[Front] [sendTask] 任务 "${text}" 已成功发送。`);
    const result = await response.json();
    console.log('[Front] [sendTask] 服务器响应:', result);
  } catch (error) {
    console.error('[Front] [sendTask] 发送任务时出错:', error);
  }
}
