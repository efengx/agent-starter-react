import type { AppConfig } from './lib/types';

export const APP_CONFIG_DEFAULTS: AppConfig = {
  companyName: 'xilabs',
  pageTitle: 'xilabs Voice Agent',
  pageDescription: 'A voice agent built with xilabs',

  supportsChatInput: true,
  supportsVideoInput: false,
  supportsScreenShare: false,
  isPreConnectBufferEnabled: true,

  logo: '',
  // logo: '/lk-logo.svg',
  accent: '#002cf2',
  logoDark: '',
  // logoDark: '/lk-logo-dark.svg',
  accentDark: '#1fd5f9',
  startButtonText: 'Start call',

  agentName: 'firstx01',
  // agentName: undefined,
};
