import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface RequestUser {
  id: string;
  email: string;
  username?: string;
  name?: string;
  role: string;
  status: string;
  avatarUrl?: string;
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as RequestUser;
  },
);
