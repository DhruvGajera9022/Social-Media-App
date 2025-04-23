import { IsEnum, IsInt } from 'class-validator';
import { NotificationType } from '../enum/notification.enum';

export class CreateNotificationDto {
  @IsInt()
  userId: number;

  @IsInt()
  actorId: number;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsInt()
  entityId: number;
}
