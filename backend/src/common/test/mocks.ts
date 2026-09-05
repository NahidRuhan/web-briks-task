import { vitest } from 'vitest';

export const mockPrismaService = {
  user: { findUnique: vitest.fn(), create: vitest.fn() },
  board: { findUnique: vitest.fn(), findMany: vitest.fn(), create: vitest.fn(), update: vitest.fn(), delete: vitest.fn() },
  boardMember: { upsert: vitest.fn(), delete: vitest.fn() },
  column: { findUnique: vitest.fn(), findFirst: vitest.fn(), create: vitest.fn(), update: vitest.fn(), delete: vitest.fn() },
  task: { findUnique: vitest.fn(), findFirst: vitest.fn(), findMany: vitest.fn(), create: vitest.fn(), update: vitest.fn(), delete: vitest.fn() },
  $transaction: vitest.fn((callback) => callback(mockPrismaService)),
};

export const mockBoardGateway = {
  broadcastToBoard: vitest.fn(),
};

export const mockJwtService = {
  sign: vitest.fn(),
  verify: vitest.fn(),
};
