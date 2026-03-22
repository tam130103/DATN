import {
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { FacebookSyncService } from './facebook-sync.service';

type FacebookWebhookRequest = Request & {
  rawBody?: Buffer;
};

@Controller('facebook/webhook')
export class FacebookWebhookController {
  constructor(private readonly facebookSyncService: FacebookSyncService) {}

  @Get()
  verify(@Query() query: Record<string, string | undefined>) {
    return this.facebookSyncService.verifyWebhook(
      query['hub.mode'],
      query['hub.verify_token'],
      query['hub.challenge'],
    );
  }

  @Post()
  @HttpCode(200)
  async receive(
    @Req() request: FacebookWebhookRequest,
    @Headers('x-hub-signature-256') signature?: string,
  ) {
    if (!this.facebookSyncService.validateSignature(signature, request.rawBody)) {
      throw new ForbiddenException('Invalid Facebook webhook signature.');
    }

    await this.facebookSyncService.handleWebhookPayload(request.body);
    return { received: true };
  }
}
