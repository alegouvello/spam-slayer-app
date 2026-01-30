export type SpamConfidence = 'definitely_spam' | 'likely_spam' | 'might_be_important';

export type UnsubscribeMethod = 'auto_header' | 'web_link' | 'none';

export type UnsubscribeStatus = 'pending' | 'success' | 'failed' | 'opened_link';

export interface GmailAccount {
  id: string;
  email: string;
  isPrimary: boolean;
}

export interface Email {
  id: string;
  sender: string;
  senderEmail: string;
  subject: string;
  snippet: string;
  body?: string;
  date: string;
  hasListUnsubscribe: boolean;
  unsubscribeLink?: string;
  folder?: 'spam' | 'trash';
  spamConfidence?: SpamConfidence;
  aiReasoning?: string;
  unsubscribeMethod?: UnsubscribeMethod;
  unsubscribeStatus?: UnsubscribeStatus;
  selected?: boolean;
  accountEmail?: string;
  accountId?: string;
}

export interface ScanResult {
  emails: Email[];
  totalCount: number;
  scannedAt: string;
}

export interface CleanupStats {
  totalProcessed: number;
  successfulUnsubscribes: number;
  failedUnsubscribes: number;
  deletedEmails: number;
  webLinksOpened: number;
  autoUnsubscribes: number;
}

export interface ScheduledCleanup {
  id: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  autoApprove: boolean;
  isActive: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
}
