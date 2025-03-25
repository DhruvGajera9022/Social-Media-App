import { PartialType } from '@nestjs/mapped-types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateRoleDto } from './create-role.dto';

export class UpdateRoleDTO extends PartialType(CreateRoleDto) {
  @ApiPropertyOptional({
    description: 'The name of the role',
    example: 'moderator',
  })
  name?: string;
}
