import { useEffect, useMemo, useRef } from 'react';
import {
  type ReceivedChatMessage,
  type TextStreamData,
  useChat,
  useRoomContext,
  useTranscriptions,
} from '@livekit/components-react';
import { ConnectionDetails } from '@/app/api/connection-details/route';
import { sendTask, transcriptionToChatMessage } from '@/lib/utils';

const AGENT_IDENTITY = process.env.NEXT_PUBLIC_AGENT_IDENTITY;
const SEND_DEBOUNCE_MS = 500; // 如果 500ms 内没有新文本，则发送当前缓冲区

export default function useChatAndTranscription(connectionDetails: ConnectionDetails | null) {
  const transcriptions: TextStreamData[] = useTranscriptions();
  const chat = useChat();
  const room = useRoomContext();

  const processedLengthRef = useRef<Record<string, number>>({});
  const timeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    if (!AGENT_IDENTITY) {
      console.error(
        '错误：环境变量 NEXT_PUBLIC_AGENT_IDENTITY 未设置。请在 .env.local 文件中定义它。'
      );
      return;
    }

    const agentStream = transcriptions.find(
      (stream) => stream.participantInfo.identity === AGENT_IDENTITY
    ) as TextStreamData | undefined;

    console.log(`[Hook] [useChatAndTranscription] agentStream:`, agentStream);
    if (!agentStream) {
      return;
    }

    const participantIdentity = agentStream.participantInfo.identity;
    const fullText = agentStream.text;
    console.log(`[Hook] [useChatAndTranscription] fullText:`, fullText);

    if (timeoutRef.current[participantIdentity]) {
      clearTimeout(timeoutRef.current[participantIdentity]);
    }

    const currentProcessedLength = processedLengthRef.current[participantIdentity] ?? 0;

    if (fullText.length < currentProcessedLength) {
      console.log(
        '[Hook] [useChatAndTranscription] 重置逻辑：如果收到的文本比已处理的短，说明是新的会话'
      );
      processedLengthRef.current[participantIdentity] = 0;
    }

    const unprocessedText = fullText.substring(currentProcessedLength);
    console.log('[Hook] [useChatAndTranscription] 获取所有未处理的文本');
    if (!unprocessedText) {
      return;
    }

    const sentenceEndChars = ['。', '！', '？', '，', '.', '!', '?', ','];

    let lastSentenceEndIndex = -1;
    for (const char of sentenceEndChars) {
      const index = unprocessedText.lastIndexOf(char);
      if (index > lastSentenceEndIndex) {
        lastSentenceEndIndex = index;
      }
    }

    let textToSend = '';
    if (lastSentenceEndIndex !== -1) {
      textToSend = unprocessedText.substring(0, lastSentenceEndIndex + 1);
      console.log(
        `[Hook] [useChatAndTranscription] 提取从开头到最后一个结束符的所有内容作为本次要发送的文本:`,
        textToSend
      );

      if (textToSend.trim()) {
        console.log(`[Hook] [useChatAndTranscription] 发送文本:`, textToSend.trim());
        sendTask(connectionDetails, textToSend.trim());

        processedLengthRef.current[participantIdentity] =
          currentProcessedLength + textToSend.length;
        console.log(
          `[Hook] [useChatAndTranscription] 更新已处理长度:`,
          processedLengthRef.current[participantIdentity]
        );
      }
    }

    const remainingText = fullText.substring(processedLengthRef.current[participantIdentity] ?? 0);
    if (remainingText.trim()) {
      timeoutRef.current[participantIdentity] = setTimeout(() => {
        console.log(
          `[Hook] [useChatAndTranscription] [超时触发] 发送剩余文本:`,
          remainingText.trim()
        );
        sendTask(connectionDetails, remainingText.trim());
        console.log(
          `[Hook] [useChatAndTranscription] 更新处理长度为全文长度，确保这段文本不会被再次发送`
        );
        processedLengthRef.current[participantIdentity] = fullText.length;
      }, SEND_DEBOUNCE_MS);
    }
  }, [transcriptions, room.localParticipant.identity, connectionDetails]);

  useEffect(() => {
    console.log(`[Hook] [useChatAndTranscription] 组件卸载时清理所有定时器`);
    const timers = timeoutRef.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  const mergedTranscriptions = useMemo(() => {
    const merged: Array<ReceivedChatMessage> = [
      ...transcriptions.map((transcription) => transcriptionToChatMessage(transcription, room)),
      ...chat.chatMessages,
    ];
    return merged.sort((a, b) => a.timestamp - b.timestamp);
  }, [transcriptions, chat.chatMessages, room]);

  return { messages: mergedTranscriptions, send: chat.send };
}
