import { Global, Module } from '@nestjs/common';
import { BoardGateway } from './board/board.gateway.js';
import { JwtModule } from '@nestjs/jwt';

@Global()
@Module({
  imports: [JwtModule.register({})],
  providers: [BoardGateway],
  exports: [BoardGateway],
})
export class WsModule {}
