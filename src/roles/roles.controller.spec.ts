import { Test, TestingModule } from '@nestjs/testing';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDTO } from './dto/update-role.dto';
import { Response } from 'express';

describe('RolesController', () => {
  let controller: RolesController;
  let rolesService: Partial<Record<keyof RolesService, jest.Mock>>;
  let mockRes: Partial<Response>;

  const mockLogger = {
    error: jest.fn(),
    log: jest.fn(),
  };

  beforeEach(async () => {
    rolesService = {
      createRole: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      updateRole: jest.fn(),
      deleteRole: jest.fn(),
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [
        { provide: RolesService, useValue: rolesService },
        { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger },
      ],
    }).compile();

    controller = module.get<RolesController>(RolesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a role', async () => {
      const dto: CreateRoleDto = { name: 'TEST_ROLE' };
      const result = { id: 1, name: 'TEST_ROLE' };
      rolesService.createRole!.mockResolvedValue(result);

      await controller.create(dto, mockRes as Response);

      expect(rolesService.createRole).toHaveBeenCalledWith(dto);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Role created successfully.',
        data: result,
      });
    });
  });

  describe('findAll', () => {
    it('should return all roles', async () => {
      const roles = [{ id: 1, name: 'ADMIN' }];
      rolesService.findAll!.mockResolvedValue(roles);

      await controller.findAll(mockRes as Response);

      expect(rolesService.findAll).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Role retrieved successfully.',
        data: roles,
      });
    });
  });

  describe('findOne', () => {
    it('should return a role by ID', async () => {
      const role = { id: 1, name: 'USER' };
      rolesService.findOne!.mockResolvedValue(role);

      await controller.findOne('1', mockRes as Response);

      expect(rolesService.findOne).toHaveBeenCalledWith(1);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Role found successfully.',
        data: role,
      });
    });
  });

  describe('updateRole', () => {
    it('should update a role by ID', async () => {
      const dto: UpdateRoleDTO = { name: 'MODERATOR' };
      const updated = { id: 1, name: 'MODERATOR' };
      rolesService.updateRole!.mockResolvedValue(updated);

      await controller.updateRole('1', dto, mockRes as Response);

      expect(rolesService.updateRole).toHaveBeenCalledWith(1, dto);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Role updated successfully.',
        data: updated,
      });
    });
  });

  describe('deleteRole', () => {
    it('should delete a role by ID', async () => {
      const deleted = { id: 1, name: 'TO_DELETE' };
      rolesService.deleteRole!.mockResolvedValue(deleted);

      await controller.deleteRole('1', mockRes as Response);

      expect(rolesService.deleteRole).toHaveBeenCalledWith(1);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        message: 'Role deleted successfully.',
        data: deleted,
      });
    });
  });
});
