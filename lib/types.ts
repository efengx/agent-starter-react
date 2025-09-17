import type { TranscriptionSegment } from 'livekit-client';

export interface CombinedTranscription extends TranscriptionSegment {
  role: 'assistant' | 'user';
  receivedAtMediaTimestamp: number;
  receivedAt: number;
}
export type ThemeMode = 'dark' | 'light' | 'system';

export interface AppConfig {
  pageTitle: string;
  pageDescription: string;
  companyName: string;

  supportsChatInput: boolean;
  supportsVideoInput: boolean;
  supportsScreenShare: boolean;
  isPreConnectBufferEnabled: boolean;

  logo: string;
  startButtonText: string;
  accent?: string;
  logoDark?: string;
  accentDark?: string;

  sandboxId?: string;
  agentName?: string;
}

export interface SandboxConfig {
  [key: string]:
    | { type: 'string'; value: string }
    | { type: 'number'; value: number }
    | { type: 'boolean'; value: boolean }
    | null;
}

export interface AgentMetadata {
  sessionId: string;
  token: string;
}

export interface SessionData {
  session_id: string;
  url: string;
  access_token: string;
}

export interface StartResult {
  code: number;
  data: null;
  message: string;
}
