'use strict';

const request = require('supertest');
const app = require('../app');

describe('POST /api/v1/auth/register', () => {
  it('should create a user and return 201', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Test User', email: 'test@test.com', password: 'Test@1234' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.message).toBe('Account created');
  });

  it('should return 400 for invalid email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Test', email: 'not-an-email', password: 'Test@1234' });
    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
    expect(res.body.errors).toBeDefined();
  });

  it('should return 400 for weak password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Test', email: 'test2@test.com', password: 'password' });
    expect(res.status).toBe(400);
  });

  it('should return 409 for duplicate email', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Test', email: 'dup@test.com', password: 'Test@1234' });
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Test', email: 'dup@test.com', password: 'Test@1234' });
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Email already in use');
  });
});

describe('POST /api/v1/auth/login', () => {
  beforeEach(async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Test User', email: 'login@test.com', password: 'Test@1234' });
  });

  it('should login and return accessToken', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'login@test.com', password: 'Test@1234' });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.email).toBe('login@test.com');
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('should return 401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'login@test.com', password: 'WrongPass@1' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid credentials');
  });

  it('should return 401 for non-existent user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@test.com', password: 'Test@1234' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/auth/me', () => {
  let token;

  beforeEach(async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Me User', email: 'me@test.com', password: 'Test@1234' });
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'me@test.com', password: 'Test@1234' });
    token = res.body.data.accessToken;
  });

  it('should return current user with valid token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('me@test.com');
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('should return 401 without token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('should return 401 with invalid token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer invalidtoken123');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/auth/logout', () => {
  it('should logout and blacklist the token', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Logout', email: 'logout@test.com', password: 'Test@1234' });
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'logout@test.com', password: 'Test@1234' });
    const token = loginRes.body.data.accessToken;

    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${token}`);
    expect(logoutRes.status).toBe(200);

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(meRes.status).toBe(401);
  });
});
