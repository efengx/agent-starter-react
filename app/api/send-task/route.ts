// api/send-task/route.ts
import { NextResponse } from 'next/server';
import type { StartResult } from '@/lib/types';

// 从环境变量中获取 HeyGen API 的基础 URL
const NEXT_PUBLIC_BASE_API_URL = process.env.NEXT_PUBLIC_BASE_API_URL;
const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;

/**
 * 调用 HeyGen 的 keep_alive API 来重置会话的空闲超时。
 * 这是一个 "即发即忘" (fire-and-forget) 的操作，它不会抛出错误，
 * 只会在失败时记录警告，以避免中断主流程。
 * @param sessionId - 需要保持活跃的会话 ID。
 * @param token - 用于认证的 Bearer Token。
 */
// async function resetSessionTimeout(sessionId: string): Promise<void> {
//   if (!NEXT_PUBLIC_BASE_API_URL || !HEYGEN_API_KEY) {
//     console.warn(
//       '[API Warning] 无法调用 keep_alive，因为 NEXT_PUBLIC_BASE_API_URL 和 HEYGEN_API_KEY 未设置。'
//     );
//     return;
//   }

//   try {
//     console.log(`[API] [send-task] 为会话 ${sessionId} 发送 keep_alive 请求...`);
//     const response = await fetch(`${NEXT_PUBLIC_BASE_API_URL}/v1/streaming.keep_alive`, {
//       method: 'POST',
//       headers: {
//         'content-type': 'application/json',
//         'x-api-key': HEYGEN_API_KEY,
//         accept: 'application/json',
//       },
//       body: JSON.stringify({
//         session_id: sessionId,
//       }),
//     });

//     if (response.ok) {
//       console.log(`[API] [send-task] 会话 ${sessionId} 的 keep_alive 请求成功。`);
//     } else {
//       const errorData = await response.json();
//       console.warn(
//         `[API] [send-task] [Warning] 会话 ${sessionId} 的 keep_alive 请求失败:`,
//         errorData
//       );
//     }
//   } catch (error) {
//     console.warn(`[API] [send-task] [Warning] 调用 keep_alive API 时发生网络错误:`, error);
//   }
// }

/**
 * API 路由处理程序，用于发送一个任务（例如文本消息）到 HeyGen 流式会话。
 * @param req - Next.js 请求对象
 */
export async function POST(req: Request) {
  try {
    if (!NEXT_PUBLIC_BASE_API_URL) {
      throw new Error('环境变量 NEXT_PUBLIC_BASE_API_URL 未设置');
    }

    const body = await req.json();
    const { token, sessionId, text } = body;

    if (!token || !sessionId || !text) {
      return NextResponse.json(
        { error: '请求体中缺少必要的参数: token, sessionId, 或 text' },
        { status: 400 }
      );
    }
    console.log(`[API] /api/send-task: 准备向会话 ${sessionId} 发送消息: "${text}"`);

    const response = await fetch(`${NEXT_PUBLIC_BASE_API_URL}/v1/streaming.task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        session_id: sessionId,
        text: text,
        task_mode: 'sync', // 'sync' or 'async'
        task_type: 'repeat', // 'talk' or 'repeat'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[API Error] 发送任务到 HeyGen 失败:', errorData);
      return NextResponse.json(
        { error: '发送任务到 HeyGen 失败', details: errorData },
        { status: response.status }
      );
    }

    const result: StartResult = await response.json();
    console.log(`[API] 任务已成功发送 (session: ${sessionId}): "${text}"`);
    console.log(`[API] 任务响应:`, result);

    // await resetSessionTimeout(sessionId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API Error] /api/send-task:', error);
    const errorMessage = error instanceof Error ? error.message : '发生未知服务器错误。';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500, statusText: 'Internal Server Error' }
    );
  }
}
