import { Test, TestingModule } from '@nestjs/testing';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateUserDTO } from './dto/update-user.dto';

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    users: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('users', () => {
    it('should return all users without passwords', async () => {
      const mockUsers = [
        { id: 1, username: 'user1', email: 'user1@example.com' },
        { id: 2, username: 'user2', email: 'user2@example.com' },
      ];

      mockPrismaService.users.findMany.mockResolvedValue(mockUsers);

      const result = await service.users();

      expect(result).toEqual(mockUsers);
      expect(mockPrismaService.users.findMany).toHaveBeenCalledWith({
        omit: { password: true },
      });
    });

    it('should throw InternalServerErrorException on error', async () => {
      mockPrismaService.users.findMany.mockRejectedValue(new Error());

      await expect(service.users()).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('userById', () => {
    it('should return a user by id', async () => {
      const mockUser = {
        id: 1,
        username: 'user1',
        email: 'user1@example.com',
        posts: [],
      };

      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);

      const result = await service.userById(1);

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.users.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        omit: { password: true },
        include: { posts: true },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(null);

      await expect(service.userById(999)).rejects.toThrow(NotFoundException);
    });

    it('should throw InternalServerErrorException on error', async () => {
      mockPrismaService.users.findUnique.mockRejectedValue(new Error());

      await expect(service.userById(1)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('searchUser', () => {
    it('should search users with pagination', async () => {
      const mockUsers = [
        { id: 1, username: 'john', email: 'john@example.com' },
        { id: 2, username: 'johnny', email: 'johnny@example.com' },
      ];
      const totalUsers = 2;
      const page = 1;
      const limit = 10;

      mockPrismaService.users.findMany.mockResolvedValue(mockUsers);
      mockPrismaService.users.count.mockResolvedValue(totalUsers);

      const result = await service.searchUser('john', page, limit);

      expect(result).toEqual({
        page,
        limit,
        totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
        users: mockUsers,
      });
      expect(mockPrismaService.users.findMany).toHaveBeenCalledWith({
        where: {
          username: {
            contains: 'john',
            mode: 'insensitive',
          },
        },
        skip: 0,
        take: limit,
        omit: { password: true },
      });
    });

    it('should throw InternalServerErrorException on error', async () => {
      mockPrismaService.users.findMany.mockRejectedValue(new Error());

      await expect(service.searchUser('john', 1, 10)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('updateUser', () => {
    const updateUserDto: UpdateUserDTO = {
      username: 'newUsername',
      email: 'new@example.com',
      roleId: 2,
    };

    it('should update a user', async () => {
      const mockUser = {
        id: 1,
        username: 'oldUsername',
        email: 'old@example.com',
      };
      const mockUpdatedUser = {
        ...mockUser,
        ...updateUserDto,
      };

      mockPrismaService.users.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.users.update.mockResolvedValue(mockUpdatedUser);

      const result = await service.updateUser(1, updateUserDto);

      expect(result).toEqual(mockUpdatedUser);
      expect(mockPrismaService.users.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateUserDto,
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.users.findUnique.mockResolvedValue(null);

      await expect(service.updateUser(999, updateUserDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw InternalServerErrorException on error', async () => {
      mockPrismaService.users.findUnique.mockRejectedValue(new Error());

      await expect(service.updateUser(1, updateUserDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('delete', () => {
    it('should delete a user', async () => {
      const mockUser = {
        id: 1,
        username: 'user1',
        email: 'user1@example.com',
      };

      mockPrismaService.users.delete.mockResolvedValue(mockUser);

      const result = await service.delete(1);

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.users.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw InternalServerErrorException on error', async () => {
      mockPrismaService.users.delete.mockRejectedValue(new Error());

      await expect(service.delete(1)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
