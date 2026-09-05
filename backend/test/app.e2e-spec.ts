import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';

describe('Kanban API (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let boardId: string;
  let columnId1: string;
  let columnId2: string;
  let task1Id: string;
  let task2Id: string;
  let task3Id: string;

  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'password123';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Authentication', () => {
    it('/api/auth/register (POST)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: testEmail,
          name: 'E2E Test User',
          password: testPassword,
        });

      if (res.status !== 201) console.error('REGISTER ERROR:', res.body);
      expect(res.status).toBe(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user).toHaveProperty('email', testEmail);
      
      accessToken = res.body.accessToken;
    });

    it('/api/auth/login (POST)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
    });

    it('/api/auth/me (GET)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.email).toBe(testEmail);
    });
  });

  describe('2. Boards & Columns', () => {
    it('/api/boards (POST)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/boards')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'E2E Test Board' })
        .expect(201);

      boardId = res.body.id;
      expect(res.body.title).toBe('E2E Test Board');
    });

    it('create multiple columns', async () => {
      // Column 1
      const res1 = await request(app.getHttpServer())
        .post(`/api/boards/${boardId}/columns`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'To Do' })
        .expect(201);

      columnId1 = res1.body.id;
      expect(res1.body.position).toBe(1.0);

      // Column 2
      const res2 = await request(app.getHttpServer())
        .post(`/api/boards/${boardId}/columns`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'In Progress' })
        .expect(201);

      columnId2 = res2.body.id;
      expect(res2.body.position).toBe(2.0);
    });
  });

  describe('3. Tasks & Fractional Indexing Movement', () => {
    it('create tasks in Column 1', async () => {
      // Task 1
      const res1 = await request(app.getHttpServer())
        .post(`/api/columns/${columnId1}/tasks`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Task A' })
        .expect(201);

      task1Id = res1.body.id;
      expect(res1.body.position).toBe(1.0);

      // Task 2
      const res2 = await request(app.getHttpServer())
        .post(`/api/columns/${columnId1}/tasks`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Task B' })
        .expect(201);

      task2Id = res2.body.id;
      expect(res2.body.position).toBe(2.0);
      
      // Task 3
      const res3 = await request(app.getHttpServer())
        .post(`/api/columns/${columnId1}/tasks`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ title: 'Task C' })
        .expect(201);

      task3Id = res3.body.id;
      expect(res3.body.position).toBe(3.0);
    });

    it('move Task C between Task A and Task B (Fractional Indexing)', async () => {
      // Moving to targetIndex = 1 (between index 0 [Task A] and index 1 [Task B])
      const res = await request(app.getHttpServer())
        .patch(`/api/tasks/${task3Id}/move`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ targetColumnId: columnId1, position: 1 })
        .expect(200);

      // Task A is at 1.0, Task B is at 2.0.
      // So Task C should now be exactly at (1.0 + 2.0) / 2 = 1.5
      expect(res.body.position).toBe(1.5);
      expect(res.body.columnId).toBe(columnId1);
    });

    it('move Task B to the top of Column 1', async () => {
      // Moving to targetIndex = 0
      const res = await request(app.getHttpServer())
        .patch(`/api/tasks/${task2Id}/move`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ targetColumnId: columnId1, position: 0 })
        .expect(200);

      // Task A was at 1.0, so new top position should be 1.0 / 2 = 0.5
      expect(res.body.position).toBe(0.5);
    });

    it('move Task A to a different column (Column 2)', async () => {
      // Moving to targetIndex = 0 in empty column
      const res = await request(app.getHttpServer())
        .patch(`/api/tasks/${task1Id}/move`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ targetColumnId: columnId2, position: 0 })
        .expect(200);

      // Empty column defaults to 1.0
      expect(res.body.position).toBe(1.0);
      expect(res.body.columnId).toBe(columnId2);
    });
  });

  describe('4. Cleanup', () => {
    it('delete the test board (cascades tasks & columns)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/boards/${boardId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });
});
