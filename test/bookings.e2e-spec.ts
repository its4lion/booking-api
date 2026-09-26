import 'dotenv/config';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ApiExceptionFilter } from '../src/common/api-exception.filter';

let prisma: PrismaClient;
const slots = [
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
];

describe('Appointment booking API (PostgreSQL)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    if (!process.env.TEST_DATABASE_URL) throw new Error('Set TEST_DATABASE_URL to an isolated PostgreSQL database or schema');
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    prisma = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL } } });
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
  });

  beforeEach(async () => {
    await prisma.booking.deleteMany({ where: { slotId: { in: slots } } });
    for (let i = 0; i < slots.length; i++) {
      await prisma.slot.upsert({ where: { id: slots[i] }, update: {}, create: {
        id: slots[i], startsAt: new Date(`2031-02-0${i + 1}T09:00:00.000Z`), endsAt: new Date(`2031-02-0${i + 1}T09:30:00.000Z`),
      } });
    }
  });

  afterAll(async () => { await app?.close(); await prisma?.$disconnect(); });

  it('books successfully and removes the slot from availability', async () => {
    const result = await request(app.getHttpServer()).post('/bookings').send({ slotId: slots[0], customerName: ' Morgan Chen ', customerEmail: ' morgan.chen@sample.net ' }).expect(201);
    expect(result.body.booking).toMatchObject({ slotId: slots[0], customerName: 'Morgan Chen', customerEmail: 'morgan.chen@sample.net', status: 'active' });
    const available = await request(app.getHttpServer()).get('/slots').expect(200);
    expect(available.body.slots.some((slot: { id: string }) => slot.id === slots[0])).toBe(false);
  });

  it('allows exactly one of two concurrent booking requests and persists one active booking', async () => {
    const payload = (customerName: string) => ({ slotId: slots[1], customerName, customerEmail: `${customerName.toLowerCase().replace(' ', '.')}@sample.net` });
    const outcomes = await Promise.all([
      request(app.getHttpServer()).post('/bookings').send(payload('Morgan Chen')),
      request(app.getHttpServer()).post('/bookings').send(payload('Avery Patel')),
    ]);
    expect(outcomes.map((response) => response.status).sort()).toEqual([201, 409]);
    expect(await prisma.booking.count({ where: { slotId: slots[1], status: 'active' } })).toBe(1);
  });

  it('cancels, restores availability, and permits a later booking', async () => {
    const first = await request(app.getHttpServer()).post('/bookings').send({ slotId: slots[2], customerName: 'Riley Park', customerEmail: 'riley.park@sample.net' }).expect(201);
    const cancelled = await request(app.getHttpServer()).delete(`/bookings/${first.body.booking.id}`).expect(200);
    expect(cancelled.body.booking.status).toBe('cancelled');
    expect((await request(app.getHttpServer()).get('/slots')).body.slots.some((slot: { id: string }) => slot.id === slots[2])).toBe(true);
    const next = await request(app.getHttpServer()).post('/bookings').send({ slotId: slots[2], customerName: 'Quinn Bailey', customerEmail: 'quinn.bailey@sample.net' }).expect(201);
    expect(next.body.booking.status).toBe('active');
  });
});
