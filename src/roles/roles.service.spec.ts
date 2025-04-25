import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RolesService } from './roles.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDTO } from './dto/update-role.dto';

describe('RolesService', () => {
  let service: RolesService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    roles: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRole', () => {
    it('should create a new role', async () => {
      const createRoleDto: CreateRoleDto = { name: 'test-role' };
      const expectedRole = { id: 1, name: 'test-role' };

      mockPrismaService.roles.create.mockResolvedValue(expectedRole);

      const result = await service.createRole(createRoleDto);

      expect(result).toEqual(expectedRole);
      expect(mockPrismaService.roles.create).toHaveBeenCalledWith({
        data: createRoleDto,
      });
    });
  });

  describe('findAll', () => {
    it('should return an array of roles', async () => {
      const expectedRoles = [
        { id: 1, name: 'role1' },
        { id: 2, name: 'role2' },
      ];

      mockPrismaService.roles.findMany.mockResolvedValue(expectedRoles);

      const result = await service.findAll();

      expect(result).toEqual(expectedRoles);
      expect(mockPrismaService.roles.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a role by id', async () => {
      const expectedRole = { id: 1, name: 'test-role' };

      mockPrismaService.roles.findUnique.mockResolvedValue(expectedRole);

      const result = await service.findOne(1);

      expect(result).toEqual(expectedRole);
      expect(mockPrismaService.roles.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException when role is not found', async () => {
      mockPrismaService.roles.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.roles.findUnique).toHaveBeenCalledWith({
        where: { id: 999 },
      });
    });
  });

  describe('updateRole', () => {
    it('should update a role', async () => {
      const updateRoleDto: UpdateRoleDTO = { name: 'updated-role' };
      const expectedRole = { id: 1, name: 'updated-role' };

      mockPrismaService.roles.update.mockResolvedValue(expectedRole);

      const result = await service.updateRole(1, updateRoleDto);

      expect(result).toEqual(expectedRole);
      expect(mockPrismaService.roles.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateRoleDto,
      });
    });

    it('should throw NotFoundException when updating non-existent role', async () => {
      const updateRoleDto: UpdateRoleDTO = { name: 'updated-role' };

      mockPrismaService.roles.update.mockRejectedValue(new Error());

      await expect(service.updateRole(999, updateRoleDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteRole', () => {
    it('should delete a role', async () => {
      const expectedRole = { id: 1, name: 'test-role' };

      mockPrismaService.roles.delete.mockResolvedValue(expectedRole);

      const result = await service.deleteRole(1);

      expect(result).toEqual(expectedRole);
      expect(mockPrismaService.roles.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException when deleting non-existent role', async () => {
      mockPrismaService.roles.delete.mockRejectedValue(new Error());

      await expect(service.deleteRole(999)).rejects.toThrow(NotFoundException);
    });
  });
});
