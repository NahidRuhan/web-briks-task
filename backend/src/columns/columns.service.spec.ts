import { Test, TestingModule } from '@nestjs/testing';
import { ColumnsService } from './columns.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { BoardGateway } from '../ws/board/board.gateway.js';
import { mockPrismaService, mockBoardGateway } from '../common/test/mocks.js';

describe('ColumnsService', () => {
  let service: ColumnsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ColumnsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: BoardGateway, useValue: mockBoardGateway },
      ],
    }).compile();

    service = module.get<ColumnsService>(ColumnsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
