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
    console.log(`Client connected: ${client.id}`);
    const userId = client.handshake.query.userId
      ? +client.handshake.query.userId
      : null;

    if (userId) {
      console.log(`User ${userId} connected with socket ${client.id}`);
      const userConnections = this.userSockets.get(userId) || [];
      userConnections.push(client.id);
      this.userSockets.set(userId, userConnections);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
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
        console.log(`User ${userId} disconnected completely`);
      }
    }
  }

  sendNotificationToUser(userId: number, notification: any) {
    console.log(`Sending notification to user ${userId}:`, notification);
    const userConnections = this.userSockets.get(userId);

    if (userConnections && userConnections.length > 0) {
      console.log(
        `Found ${userConnections.length} active connections for user ${userId}`,
      );
      userConnections.forEach((socketId) => {
        this.server.to(socketId).emit('notification', notification);
        console.log(`Emitted notification to socket ${socketId}`);
      });
    } else {
      console.log(`No active connections found for user ${userId}`);
    }
  }
}
