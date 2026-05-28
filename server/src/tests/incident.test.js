'use strict';

const request = require('supertest');
const app = require('../app');

const getToken = async (role = 'admin') => {
  const email = `${role}_${Date.now()}@test.com`;
  const password = 'Test@1234';

  await request(app)
    .post('/api/v1/auth/register')
    .send({ name: role, email, password, role: 'viewer' });

  if (role !== 'viewer') {
    const User = require('../models/User.model');
    await User.findOneAndUpdate({ email }, { role });
  }

  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password });
  return res.body.data.accessToken;
};

describe('POST /api/v1/incidents', () => {
  it('admin can create incident', async () => {
    const token = await getToken('admin');
    const res = await request(app)
      .post('/api/v1/incidents')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Test Incident', severity: 'high' });
    expect(res.status).toBe(201);
    expect(res.body.data.incident.title).toBe('Test Incident');
    expect(res.body.data.incident.severity).toBe('high');
  });

  it('analyst can create incident', async () => {
    const token = await getToken('analyst');
    const res = await request(app)
      .post('/api/v1/incidents')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Analyst Incident', severity: 'low' });
    expect(res.status).toBe(201);
  });

  it('viewer cannot create incident — 403', async () => {
    const token = await getToken('viewer');
    const res = await request(app)
      .post('/api/v1/incidents')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Viewer Incident', severity: 'low' });
    expect(res.status).toBe(403);
  });

  it('should return 400 when severity is missing', async () => {
    const token = await getToken('admin');
    const res = await request(app)
      .post('/api/v1/incidents')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'No severity' });
    expect(res.status).toBe(400);
  });

  it('should return 401 without token', async () => {
    const res = await request(app)
      .post('/api/v1/incidents')
      .send({ title: 'No auth', severity: 'low' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/incidents', () => {
  let token;

  beforeEach(async () => {
    token = await getToken('admin');
    for (const sev of ['low', 'high', 'critical']) {
      await request(app)
        .post('/api/v1/incidents')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: `${sev} incident`, severity: sev });
    }
  });

  it('should return paginated incidents', async () => {
    const res = await request(app)
      .get('/api/v1/incidents')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.incidents).toHaveLength(3);
    expect(res.body.data.pagination).toBeDefined();
    expect(res.body.data.pagination.total).toBe(3);
  });

  it('should filter by severity', async () => {
    const res = await request(app)
      .get('/api/v1/incidents?severity=critical')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.incidents).toHaveLength(1);
    expect(res.body.data.incidents[0].severity).toBe('critical');
  });

  it('should search by title', async () => {
    const res = await request(app)
      .get('/api/v1/incidents?search=high')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.incidents[0].title).toContain('high');
  });
});

describe('PATCH /api/v1/incidents/:id/status', () => {
  it('admin can update status', async () => {
    const token = await getToken('admin');
    const createRes = await request(app)
      .post('/api/v1/incidents')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Status test', severity: 'medium' });
    const id = createRes.body.data.incident._id;

    const res = await request(app)
      .patch(`/api/v1/incidents/${id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'investigating' });
    expect(res.status).toBe(200);
    expect(res.body.data.incident.status).toBe('investigating');
  });

  it('viewer cannot update status — 403', async () => {
    const adminToken = await getToken('admin');
    const viewerToken = await getToken('viewer');
    const createRes = await request(app)
      .post('/api/v1/incidents')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Viewer update test', severity: 'low' });
    const id = createRes.body.data.incident._id;

    const res = await request(app)
      .patch(`/api/v1/incidents/${id}/status`)
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ status: 'resolved' });
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/v1/incidents/:id', () => {
  it('admin can delete incident', async () => {
    const token = await getToken('admin');
    const createRes = await request(app)
      .post('/api/v1/incidents')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Delete me', severity: 'low' });
    const id = createRes.body.data.incident._id;

    const res = await request(app)
      .delete(`/api/v1/incidents/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);

    const getRes = await request(app)
      .get(`/api/v1/incidents/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(404);
  });

  it('analyst cannot delete incident — 403', async () => {
    const adminToken = await getToken('admin');
    const analystToken = await getToken('analyst');
    const createRes = await request(app)
      .post('/api/v1/incidents')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'No delete', severity: 'low' });
    const id = createRes.body.data.incident._id;

    const res = await request(app)
      .delete(`/api/v1/incidents/${id}`)
      .set('Authorization', `Bearer ${analystToken}`);
    expect(res.status).toBe(403);
  });
});
