import { Test, TestingModule } from '@nestjs/testing';
import { BoardsService } from './boards.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { BoardGateway } from '../ws/board/board.gateway.js';
import { mockPrismaService, mockBoardGateway } from '../common/test/mocks.js';

describe('BoardsService', () => {
  let service: BoardsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BoardsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: BoardGateway, useValue: mockBoardGateway },
      ],
    }).compile();

    service = module.get<BoardsService>(BoardsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
