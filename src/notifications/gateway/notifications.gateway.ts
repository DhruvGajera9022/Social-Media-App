import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway(5002, {
  cors: {
    origin: '*',
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private userSockets: Map<number, string[]> = new Map();

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId
      ? +client.handshake.query.userId
      : null;

    if (userId) {
      const userConnections = this.userSockets.get(userId) || [];
      userConnections.push(client.id);
      this.userSockets.set(userId, userConnections);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.handshake.query.userId
      ? +client.handshake.query.userId
      : null;

    if (userId) {
      const userConnections = this.userSockets.get(userId) || [];
      const updatedConnections = userConnections.filter(
        (id) => id !== client.id,
      );

      if (updatedConnections.length > 0) {
        this.userSockets.set(userId, updatedConnections);
      } else {
        this.userSockets.delete(userId);
      }
    }
  }

  sendNotificationToUser(userId: number, notification: any) {
    const userConnections = this.userSockets.get(userId);

    if (userConnections && userConnections.length > 0) {
      userConnections.forEach((socketId) => {
        this.server.to(socketId).emit('notification', notification);
      });
    }
  }
}
