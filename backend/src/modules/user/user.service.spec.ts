import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { UserService } from './user.service';
import { Follow } from './entities/follow.entity';
import { User, UserProvider } from './entities/user.entity';

const createRepositoryMock = <T>() =>
  ({
    create: jest.fn((payload) => payload),
    save: jest.fn(async (payload) => payload),
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  }) as unknown as jest.Mocked<Repository<T>>;

describe('UserService.findOrCreateByGoogle', () => {
  let service: UserService;
  let userRepository: jest.Mocked<Repository<User>>;

  beforeEach(() => {
    userRepository = createRepositoryMock<User>();

    service = new UserService(
      userRepository,
      createRepositoryMock<Follow>(),
      { transaction: jest.fn() } as unknown as DataSource,
      { get: jest.fn() } as unknown as ConfigService,
    );
  });

  it('links google id onto an existing local account with the same email', async () => {
    const existingUser = {
      id: 'user-1',
      email: 'person@example.com',
      name: 'Local Person',
      password: 'hashed-password',
      provider: UserProvider.LOCAL,
      googleId: null,
      avatarUrl: null,
    } as User;

    userRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existingUser);

    const result = await service.findOrCreateByGoogle(
      'google-123',
      'person@example.com',
      'Google Person',
    );

    expect(userRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'user-1',
        googleId: 'google-123',
        provider: UserProvider.LOCAL,
        avatarUrl: UserService.DEFAULT_AVATAR_URL,
      }),
    );
    expect(result).toMatchObject({
      id: 'user-1',
      googleId: 'google-123',
      provider: UserProvider.LOCAL,
    });
  });

  it('creates a new google user when no matching account exists', async () => {
    userRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const createSpy = jest.spyOn(service, 'create').mockResolvedValue({
      id: 'user-2',
      email: 'new@example.com',
      name: 'New User',
      googleId: 'google-456',
      provider: UserProvider.GOOGLE,
    } as User);

    const result = await service.findOrCreateByGoogle(
      'google-456',
      'new@example.com',
      'New User',
    );

    expect(createSpy).toHaveBeenCalledWith({
      googleId: 'google-456',
      email: 'new@example.com',
      name: 'New User',
      provider: UserProvider.GOOGLE,
    });
    expect(result.provider).toBe(UserProvider.GOOGLE);
  });

  it('rejects linking when the email is already attached to another google id', async () => {
    userRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'user-3',
        email: 'conflict@example.com',
        googleId: 'google-old',
        provider: UserProvider.GOOGLE,
      } as User);

    await expect(
      service.findOrCreateByGoogle('google-new', 'conflict@example.com', 'Conflict User'),
    ).rejects.toThrow(ConflictException);

    expect(userRepository.save).not.toHaveBeenCalled();
  });
});
