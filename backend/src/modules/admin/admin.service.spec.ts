import { ForbiddenException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Comment } from '../engagement/entities/comment.entity';
import { Like } from '../engagement/entities/like.entity';
import { Post } from '../post/entities/post.entity';
import { User, UserStatus } from '../user/entities/user.entity';
import { AdminService } from './admin.service';
import { Report } from './entities/report.entity';

const createRepositoryMock = <T>() =>
  ({
    findOne: jest.fn(),
    save: jest.fn(async (payload) => payload),
  }) as unknown as jest.Mocked<Repository<T>>;

describe('AdminService.updateUserStatus', () => {
  it('prevents an admin from blocking their own account', async () => {
    const userRepository = createRepositoryMock<User>();
    const service = new AdminService(
      userRepository,
      createRepositoryMock<Post>(),
      createRepositoryMock<Comment>(),
      createRepositoryMock<Like>(),
      createRepositoryMock<Report>(),
      {} as DataSource,
    );

    userRepository.findOne.mockResolvedValue({
      id: 'admin-1',
      status: UserStatus.ACTIVE,
    } as User);

    await expect(
      service.updateUserStatus(
        'admin-1',
        { status: UserStatus.BLOCKED, reason: 'test' },
        'admin-1',
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});
