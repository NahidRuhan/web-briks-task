import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: '*', // For dev, can be restricted to FRONTEND_URL
    credentials: true,
  },
  namespace: '/boards',
})
export class BoardGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'super_secret_jwt_key_example',
      });
      // Attach user info to socket
      (client as any).user = payload;
    } catch (e) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // console.log('Client disconnected', client.id);
  }

  @SubscribeMessage('join-board')
  handleJoinBoard(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { boardId: string },
  ) {
    if (!payload?.boardId) return;
    client.join(`board:${payload.boardId}`);
  }

  @SubscribeMessage('leave-board')
  handleLeaveBoard(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { boardId: string },
  ) {
    if (!payload?.boardId) return;
    client.leave(`board:${payload.boardId}`);
  }

  @SubscribeMessage('task:drag-move')
  handleDragMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { boardId: string, taskId: string, delta: { x: number, y: number }, user: any },
  ) {
    if (!payload?.boardId) return;
    // Broadcast to everyone in the room EXCEPT the sender
    client.broadcast.to(`board:${payload.boardId}`).emit('task:drag-move', payload);
  }

  @SubscribeMessage('task:drag-end')
  handleDragEnd(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { boardId: string, taskId: string },
  ) {
    if (!payload?.boardId) return;
    client.broadcast.to(`board:${payload.boardId}`).emit('task:drag-end', payload);
  }

  @SubscribeMessage('task:drag-over-state')
  handleDragOverState(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { boardId: string, activeId: string, overId: string, isOverTask: boolean, isOverColumn: boolean, modifier?: number },
  ) {
    if (!payload?.boardId) return;
    client.broadcast.to(`board:${payload.boardId}`).emit('task:drag-over-state', payload);
  }

  @SubscribeMessage('column:drag-over-state')
  handleColumnDragOverState(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { boardId: string, activeId: string, overId: string },
  ) {
    if (!payload?.boardId) return;
    client.broadcast.to(`board:${payload.boardId}`).emit('column:drag-over-state', payload);
  }

  @SubscribeMessage('column:drag-move')
  handleColumnDragMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { boardId: string, columnId: string, delta: { x: number, y: number }, user: any },
  ) {
    if (!payload?.boardId) return;
    client.broadcast.to(`board:${payload.boardId}`).emit('column:drag-move', payload);
  }

  @SubscribeMessage('column:drag-end')
  handleColumnDragEnd(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { boardId: string, columnId: string },
  ) {
    if (!payload?.boardId) return;
    client.broadcast.to(`board:${payload.boardId}`).emit('column:drag-end', payload);
  }

  broadcastToBoard(boardId: string, event: string, payload: any) {
    this.server.to(`board:${boardId}`).emit(event, payload);
  }
}
