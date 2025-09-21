import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  type TextStreamData,
  useChat,
  useRoomContext,
  useTranscriptions,
} from '@livekit/components-react';
import { ConnectionDetails } from '@/app/api/connection-details/route';
import { sendTask, transcriptionToChatMessage } from '@/lib/utils';

const AGENT_IDENTITY = process.env.NEXT_PUBLIC_AGENT_IDENTITY;
const SENTENCE_END_CHARS = ['。', '！', '？', '，', '.', '!', '?', ','];
const TAIL_SEND_DEBOUNCE_MS = 400;

export default function useChatAndTranscription(connectionDetails: ConnectionDetails | null) {
  const transcriptions: TextStreamData[] = useTranscriptions();
  const chat = useChat();
  const room = useRoomContext();

  const taskQueueRef = useRef<string[]>([]);
  const isProcessingRef = useRef<boolean>(false);

  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || taskQueueRef.current.length === 0) {
      return;
    }
    isProcessingRef.current = true;
    const textToSend = taskQueueRef.current.shift();

    if (textToSend && connectionDetails) {
      try {
        console.log(
          `[${new Date().toLocaleTimeString()}] [Hook] [useChatAndTranscription] 正在从队列取出并发送: "${textToSend}"`
        );
        await sendTask(connectionDetails, textToSend);
        console.log(
          `[${new Date().toLocaleTimeString()}] [Hook] [useChatAndTranscription] 任务成功发送: "${textToSend}"`
        );
      } catch (error) {
        console.error(
          `[${new Date().toLocaleTimeString()}] [Hook] [useChatAndTranscription] 任务处理失败: "${textToSend}"`,
          error
        );
        // 失败策略: 可以考虑将任务重新放回队列头部重试
        // taskQueueRef.current.unshift(textToSend);
      } finally {
        isProcessingRef.current = false;
        processQueue();
      }
    } else {
      isProcessingRef.current = false;
    }
  }, [connectionDetails]);

  const processedIndexRef = useRef<number>(0);
  const tailDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!AGENT_IDENTITY) {
      console.error('错误：环境变量 NEXT_PUBLIC_AGENT_IDENTITY 未设置。');
      return;
    }

    console.log(
      `[${new Date().toLocaleTimeString()}] [Front] [useChatAndTranscription] transcriptions:`,
      JSON.parse(JSON.stringify(transcriptions))
    );
    const agentStream = transcriptions.findLast((stream) => {
      const attributes = stream.streamInfo.attributes;
      const isAgentIdentity = stream.participantInfo.identity === AGENT_IDENTITY;
      const isNotUserTranscriptionRelay = !attributes['lk.transcribed_track_id'];

      return isAgentIdentity && isNotUserTranscriptionRelay;
    });

    console.log(
      `[${new Date().toLocaleTimeString()}] [Hook] [useChatAndTranscription] AGENT_IDENTITY:`,
      AGENT_IDENTITY
    );
    console.log(
      `[${new Date().toLocaleTimeString()}] [Hook] [useChatAndTranscription] agentStream:`,
      agentStream
    );

    if (!agentStream || !agentStream.text) {
      return;
    }

    const fullText = agentStream.text;

    if (fullText.length < processedIndexRef.current) {
      console.log(
        '[${new Date().toLocaleTimeString()}] [Hook] [useChatAndTranscription] 检测到转录流重置，重置处理索引。'
      );
      processedIndexRef.current = 0;
    }

    let searchStartIndex = processedIndexRef.current;
    while (searchStartIndex < fullText.length) {
      const unprocessedText = fullText.substring(searchStartIndex);
      let sentenceEndIndex = -1;

      for (const char of SENTENCE_END_CHARS) {
        const index = unprocessedText.indexOf(char);
        if (index !== -1 && (sentenceEndIndex === -1 || index < sentenceEndIndex)) {
          sentenceEndIndex = index;
        }
      }

      if (sentenceEndIndex !== -1) {
        const sentence = unprocessedText.substring(0, sentenceEndIndex + 1).trim();
        if (sentence) {
          console.log(
            `[${new Date().toLocaleTimeString()}] [Hook] [useChatAndTranscription] 提取到句子片段: "${sentence}"`
          );
          taskQueueRef.current.push(sentence);
          processQueue();
        }
        searchStartIndex += sentenceEndIndex + 1;
        processedIndexRef.current = searchStartIndex;
      } else {
        break;
      }
    }

    if (tailDebounceTimeoutRef.current) {
      clearTimeout(tailDebounceTimeoutRef.current);
    }

    const remainingText = fullText.substring(processedIndexRef.current).trim();
    if (remainingText) {
      tailDebounceTimeoutRef.current = setTimeout(() => {
        console.log(
          `[${new Date().toLocaleTimeString()}] [Hook] [useChatAndTranscription] [超时触发] 发送末尾片段: "${remainingText}"`
        );
        taskQueueRef.current.push(remainingText);
        processQueue();
        processedIndexRef.current = fullText.length;
      }, TAIL_SEND_DEBOUNCE_MS);
    }
  }, [transcriptions, processQueue]);

  useEffect(() => {
    return () => {
      if (tailDebounceTimeoutRef.current) {
        clearTimeout(tailDebounceTimeoutRef.current);
      }
    };
  }, []);

  const mergedTranscriptions = useMemo(() => {
    const merged = [
      ...transcriptions.map((transcription) => transcriptionToChatMessage(transcription, room)),
      ...chat.chatMessages,
    ];
    return merged.sort((a, b) => a.timestamp - b.timestamp);
  }, [transcriptions, chat.chatMessages, room]);

  return { messages: mergedTranscriptions, send: chat.send };
}
