import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { createHmac, timingSafeEqual } from 'crypto';
import { PostService } from './post.service';
import { UserService } from '../user/user.service';

@Injectable()
export class FacebookSyncService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FacebookSyncService.name);
  private syncing = false;
  private intervalHandle: NodeJS.Timeout | null = null;

  constructor(
    private readonly postService: PostService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    if (!this.isEnabled()) return;
    await this.ensureBotAndFollowers();
    await this.ensureWebhookSubscription();
    await this.syncNow();
    this.startInterval();
  }

  onModuleDestroy() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  private startInterval() {
    const intervalMs = this.getSyncIntervalMs();
    if (this.intervalHandle || !this.isEnabled() || intervalMs <= 0) return;
    this.intervalHandle = setInterval(() => {
      void this.handleInterval();
    }, intervalMs);
  }

  private async handleInterval() {
    if (!this.isEnabled()) return;
    await this.ensureBotAndFollowers();
    await this.syncNow();
  }

  verifyWebhook(mode?: string, verifyToken?: string, challenge?: string): string {
    if (!this.isWebhookEnabled()) {
      throw new BadRequestException('Facebook webhook is disabled.');
    }

    const expectedToken = this.configService.get<string>('FB_WEBHOOK_VERIFY_TOKEN');
    if (!expectedToken) {
      throw new BadRequestException('FB_WEBHOOK_VERIFY_TOKEN is not configured.');
    }

    if (mode !== 'subscribe' || !challenge) {
      throw new BadRequestException('Invalid webhook verification request.');
    }

    if (verifyToken !== expectedToken) {
      throw new ForbiddenException('Invalid webhook verify token.');
    }

    return challenge;
  }

  validateSignature(signatureHeader?: string, rawBody?: Buffer): boolean {
    const appSecret = this.configService.get<string>('FB_APP_SECRET');
    if (!appSecret) {
      this.logger.warn('FB_APP_SECRET is not configured. Skipping webhook signature verification.');
      return true;
    }

    if (!signatureHeader || !rawBody?.length) {
      return false;
    }

    const expected = `sha256=${createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;
    const actualBuffer = Buffer.from(signatureHeader, 'utf8');
    const expectedBuffer = Buffer.from(expected, 'utf8');

    if (actualBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(actualBuffer, expectedBuffer);
  }

  async handleWebhookPayload(payload: any): Promise<{ imported: number; skipped: number; ignored: number; removed: number }> {
    if (!this.isWebhookEnabled()) {
      return { imported: 0, skipped: 0, ignored: 1, removed: 0 };
    }

    const { upsertIds, removeIds } = this.extractWebhookPostIds(payload);
    if (upsertIds.length === 0 && removeIds.length === 0) {
      return { imported: 0, skipped: 0, ignored: 1, removed: 0 };
    }

    const bot = await this.userService.ensureFacebookBotUser();
    let imported = 0;
    let skipped = 0;
    let removed = 0;

    for (const postId of removeIds) {
      try {
        const deleted = await this.postService.deleteFacebookPostById(bot.id, postId);
        if (deleted) removed += 1;
      } catch (error) {
        this.logger.warn(`Facebook webhook delete failed for ${postId}: ${(error as any)?.message || error}`);
      }
    }

    for (const postId of upsertIds) {
      try {
        const result = await this.postService.importFacebookPostById(bot.id, postId);
        if (result.imported) {
          imported += 1;
        } else {
          skipped += 1;
        }
      } catch (error) {
        skipped += 1;
        this.logger.warn(`Facebook webhook import failed for ${postId}: ${(error as any)?.message || error}`);
      }
    }

    if (imported > 0 || skipped > 0 || removed > 0) {
      this.logger.log(`Facebook webhook: imported ${imported}, skipped ${skipped}, removed ${removed}`);
    }

    return { imported, skipped, ignored: 0, removed };
  }

  private isEnabled(): boolean {
    const flag = this.configService.get<string>('FB_SYNC_ENABLED', 'true');
    return flag.toLowerCase() !== 'false';
  }

  private isWebhookEnabled(): boolean {
    const flag = this.configService.get<string>('FB_WEBHOOK_ENABLED', 'true');
    return flag.toLowerCase() !== 'false';
  }

  private getSyncIntervalMs(): number {
    const intervalMinutes = Math.max(
      0,
      Number(this.configService.get<string>('FB_SYNC_INTERVAL_MINUTES', '0')) || 0,
    );
    return intervalMinutes > 0 ? intervalMinutes * 60 * 1000 : 0;
  }

  private extractWebhookPostIds(payload: any): { upsertIds: string[]; removeIds: string[] } {
    if (payload?.object !== 'page' || !Array.isArray(payload?.entry)) {
      return { upsertIds: [], removeIds: [] };
    }

    const configuredPageId = this.configService.get<string>('FB_PAGE_ID');
    const upsertIds = new Set<string>();
    const removeIds = new Set<string>();

    for (const entry of payload.entry) {
      if (configuredPageId && entry?.id && entry.id !== configuredPageId) {
        continue;
      }

      const changes = Array.isArray(entry?.changes) ? entry.changes : [];
      for (const change of changes) {
        if (change?.field !== 'feed') continue;

        const value = change?.value ?? {};
        if (!value?.post_id) continue;
        if (value?.item && ['comment', 'reaction'].includes(String(value.item).toLowerCase())) continue;

        if (value?.verb === 'remove') {
          removeIds.add(value.post_id);
        } else {
          upsertIds.add(value.post_id);
        }
      }
    }

    return { upsertIds: Array.from(upsertIds), removeIds: Array.from(removeIds) };
  }

  private async ensureWebhookSubscription() {
    if (!this.isWebhookEnabled()) return;

    const autoSubscribe = this.configService.get<string>('FB_WEBHOOK_AUTO_SUBSCRIBE', 'false');
    if (autoSubscribe.toLowerCase() === 'false') return;

    const pageId = this.configService.get<string>('FB_PAGE_ID');
    const accessToken = this.configService.get<string>('FB_PAGE_ACCESS_TOKEN');
    const version = this.configService.get<string>('FB_GRAPH_VERSION', 'v19.0');

    if (!pageId || !accessToken) return;

    try {
      await axios.post(`https://graph.facebook.com/${version}/${pageId}/subscribed_apps`, null, {
        params: {
          access_token: accessToken,
          subscribed_fields: 'feed',
        },
      });
      this.logger.log('Facebook page subscribed to webhook updates.');
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? ((error.response?.data as any)?.error?.message || error.message)
        : String(error);
      this.logger.warn(`Failed to subscribe page webhook: ${message}`);
    }
  }

  private async ensureBotAndFollowers() {
    try {
      await this.userService.ensureAllUsersFollowFacebookBot();
    } catch (error) {
      this.logger.warn(`Failed to ensure bot followers: ${error?.message || error}`);
    }
  }

  private async syncNow() {
    if (this.syncing) return;
    this.syncing = true;
    try {
      const bot = await this.userService.ensureFacebookBotUser();
      const result = await this.postService.importFromFacebookPage(bot.id);
      if (result.imported.length > 0 || result.skipped > 0) {
        this.logger.log(`Facebook sync: imported ${result.imported.length}, skipped ${result.skipped}`);
      }
    } catch (error) {
      this.logger.warn(`Facebook sync failed: ${error?.message || error}`);
    } finally {
      this.syncing = false;
    }
  }
}
