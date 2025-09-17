// api/send-task/route.ts
import { NextResponse } from 'next/server';
import type { StartResult } from '@/lib/types';

// 从环境变量中获取 HeyGen API 的基础 URL
const NEXT_PUBLIC_BASE_API_URL = process.env.NEXT_PUBLIC_BASE_API_URL;

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
