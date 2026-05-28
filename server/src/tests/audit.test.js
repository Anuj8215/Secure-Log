'use strict';

const request = require('supertest');
const app = require('../app');

const getAdminToken = async () => {
  const email = `audit_admin_${Date.now()}@test.com`;
  await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'Admin', email, password: 'Test@1234' });
  const User = require('../models/User.model');
  await User.findOneAndUpdate({ email }, { role: 'admin' });
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password: 'Test@1234' });
  return res.body.data.accessToken;
};

describe('GET /api/v1/audit', () => {
  it('admin can access audit logs', async () => {
    const token = await getAdminToken();
    const res = await request(app)
      .get('/api/v1/audit')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.logs).toBeDefined();
    expect(res.body.data.pagination).toBeDefined();
  });

  it('viewer cannot access audit logs — 403', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Viewer', email: 'auditviewer@test.com', password: 'Test@1234' });
    const res1 = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'auditviewer@test.com', password: 'Test@1234' });
    const token = res1.body.data.accessToken;

    const res = await request(app)
      .get('/api/v1/audit')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('audit log is created when incident is created', async () => {
    const token = await getAdminToken();
    await request(app)
      .post('/api/v1/incidents')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Audit test incident', severity: 'high' });

    await new Promise((r) => setTimeout(r, 100));

    const res = await request(app)
      .get('/api/v1/audit')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.logs.length).toBeGreaterThan(0);
  });
});
