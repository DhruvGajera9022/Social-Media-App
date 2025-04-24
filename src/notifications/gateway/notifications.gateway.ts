import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*', // In production, replace with your frontend URL
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private userSockets: Map<number, string[]> = new Map();

  handleConnection(client: Socket) {
    const userId = +client.id;
    if (userId) {
      const userConnections = this.userSockets.get(userId) || [];
      userConnections.push(client.id);
      this.userSockets.set(userId, userConnections);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = +client.id;
    if (userId) {
      const userConnections = this.userSockets.get(userId) || [];
      const updatedConnections = userConnections.filter(
        (id) => id !== client.id,
      );
      if (updatedConnections.length > 0) {
        this.userSockets.set(userId, userConnections);
      } else {
        this.userSockets.delete(userId);
      }
    }
  }

  sendNotificationToUser(userId: number, notification: any) {
    const userConnections = this.userSockets.get(userId);
    if (userConnections) {
      userConnections.forEach((socketId) => {
        this.server.to(socketId).emit('notification', notification);
      });
    }
  }
}
