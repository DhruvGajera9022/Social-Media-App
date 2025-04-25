import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UpdateUserDTO } from './dto/update-user.dto';
import { SearchUserDTO } from './dto/search-user.dto';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;

  const mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };

  const mockUsersService = {
    users: jest.fn(),
    userById: jest.fn(),
    searchUser: jest.fn(),
    updateUser: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('users', () => {
    it('should return all users', async () => {
      const mockUsers = [
        { id: 1, username: 'user1', email: 'user1@example.com' },
        { id: 2, username: 'user2', email: 'user2@example.com' },
      ];

      mockUsersService.users.mockResolvedValue(mockUsers);

      await controller.users(mockResponse as any);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'Users data retrieved.',
        data: mockUsers,
      });
    });

    it('should handle errors', async () => {
      const error = new Error('Test error');
      mockUsersService.users.mockRejectedValue(error);

      await controller.users(mockResponse as any);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: error.message,
        error: error,
      });
    });
  });

  describe('searchUser', () => {
    it('should search users with pagination', async () => {
      const searchQuery: SearchUserDTO = {
        firstName: 'john',
        page: 1,
        limit: 10,
      };

      const mockSearchResult = {
        users: [
          { id: 1, username: 'john', email: 'john@example.com' },
          { id: 2, username: 'johnny', email: 'johnny@example.com' },
        ],
        page: 1,
        limit: 10,
        totalUsers: 2,
        totalPages: 1,
      };

      mockUsersService.searchUser.mockResolvedValue(mockSearchResult);

      await controller.searchUser(searchQuery, mockResponse as any);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'User data found.',
        data: mockSearchResult,
      });
    });

    it('should throw BadRequestException when firstName is missing', async () => {
      const searchQuery: SearchUserDTO = {
        page: 1,
        limit: 10,
      };

      await expect(
        controller.searchUser(searchQuery, mockResponse as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('userById', () => {
    it('should return a user by id', async () => {
      const mockUser = {
        id: 1,
        username: 'user1',
        email: 'user1@example.com',
      };

      mockUsersService.userById.mockResolvedValue(mockUser);

      await controller.userById(1, mockResponse as any);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'User found successfully.',
        data: mockUser,
      });
    });

    it('should handle errors', async () => {
      const error = new Error('Test error');
      mockUsersService.userById.mockRejectedValue(error);

      await controller.userById(1, mockResponse as any);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: error.message,
        error: error,
      });
    });
  });

  describe('updateUser', () => {
    const updateUserDto: UpdateUserDTO = {
      username: 'newUsername',
      email: 'new@example.com',
      roleId: 2,
    };

    it('should update a user', async () => {
      const mockUpdatedUser = {
        id: 1,
        ...updateUserDto,
      };

      mockUsersService.updateUser.mockResolvedValue(mockUpdatedUser);

      await controller.updateUser(1, updateUserDto, mockResponse as any);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'User data has been successfully updated.',
        data: mockUpdatedUser,
      });
    });

    it('should handle user not found', async () => {
      mockUsersService.updateUser.mockResolvedValue(null);

      await controller.updateUser(999, updateUserDto, mockResponse as any);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'User with ID 999 not found.',
        error: expect.any(NotFoundException),
      });
    });
  });

  describe('delete', () => {
    it('should delete a user', async () => {
      const mockDeletedUser = {
        id: 1,
        username: 'user1',
        email: 'user1@example.com',
      };

      mockUsersService.delete.mockResolvedValue(mockDeletedUser);

      await controller.delete(1, mockResponse as any);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'User deleted successfully.',
        data: mockDeletedUser,
      });
    });

    it('should handle user not found', async () => {
      mockUsersService.delete.mockResolvedValue(null);

      await controller.delete(999, mockResponse as any);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'User with ID 999 not found.',
        error: expect.any(NotFoundException),
      });
    });
  });
});
