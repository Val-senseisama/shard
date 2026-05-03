import { Platform, InteractionManager } from 'react-native';
import { getDb } from '../services/db';
import { CONFIG } from '../config';
import Session from './Session';
import * as Application from 'expo-application';

type Severity = 'low' | 'medium' | 'high' | 'critical';

interface ErrorLog {
  task: string;
  error: string;
  severity: Severity;
  userId?: string;
  metadata?: any;
  platform: string;
  version: string;
  created_at: string;
}

class Logger {
  private queue: ErrorLog[] = [];
  private isSyncing = false;
  private flushInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startInterval();
  }

  private startInterval() {
    if (this.flushInterval) clearInterval(this.flushInterval);
    this.flushInterval = setInterval(() => {
      this.sync();
    }, 30000); // Sync every 30 seconds
  }

  public async log(task: string, error: any, severity: Severity = 'medium', metadata: any = {}) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    
    // Get current user if possible
    let userId: string | undefined;
    try {
      // Assuming user ID might be stored in session or we can pass it
      // For now, let's try to get it from a known session key if it exists
      // In a real app, you'd probably have a more reliable way to get the current user ID
    } catch (e) {
      // Ignore
    }

    const logEntry: ErrorLog = {
      task,
      error: stack ? `${errorMessage}\n${stack}` : errorMessage,
      severity,
      userId,
      metadata: { ...metadata, timestamp: new Date().toISOString() },
      platform: Platform.OS,
      version: Application.nativeApplicationVersion || 'unknown',
      created_at: new Date().toISOString(),
    };

    // 1. Log to console
    console.error(`[${severity.toUpperCase()}] ${task}:`, errorMessage);

    // 2. Persist to SQLite
    try {
      const db = await getDb();
      await db.runAsync(
        'INSERT INTO error_logs (task, error, severity, userId, metadata, platform, version, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          logEntry.task,
          logEntry.error,
          logEntry.severity,
          logEntry.userId || null,
          JSON.stringify(logEntry.metadata),
          logEntry.platform,
          logEntry.version,
          logEntry.created_at,
        ]
      );
    } catch (e) {
      console.error('Failed to save log to SQLite:', e);
    }

    // 3. Add to memory queue for immediate-ish sync if queue is large
    this.queue.push(logEntry);
    if (this.queue.length >= 10) {
      this.sync();
    }
  }

  public async sync() {
    if (this.isSyncing) return;
    
    InteractionManager.runAfterInteractions(async () => {
      this.isSyncing = true;
      try {
        const db = await getDb();
        const logs = await db.getAllAsync<any>('SELECT * FROM error_logs LIMIT 50');
        
        if (logs.length === 0) {
          this.isSyncing = false;
          return;
        }

        const formattedLogs = logs.map(l => ({
          task: l.task,
          error: l.error,
          severity: l.severity,
          userId: l.userId,
          metadata: JSON.parse(l.metadata || '{}'),
          platform: l.platform,
          version: l.version,
          createdAt: l.created_at
        }));

        const response = await fetch(`${CONFIG.GRAPHQL_ENDPOINT.replace('/graphql', '')}/log-errors`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ errors: formattedLogs }),
        });

        if (response.ok) {
          // Delete synced logs
          const ids = logs.map(l => l.id).join(',');
          await db.runAsync(`DELETE FROM error_logs WHERE id IN (${ids})`);
        }
      } catch (e) {
        // Silently fail, will retry next interval
      } finally {
        this.isSyncing = false;
      }
    });
  }
}

export const logger = new Logger();
