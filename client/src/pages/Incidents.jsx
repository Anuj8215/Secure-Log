import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const SEVERITY_BADGE = {
  low: 'bg-success/10 text-success',
  medium: 'bg-warning/10 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-danger/10 text-danger',
};

const STATUS_BADGE = {
  open: 'bg-danger/10 text-danger',
  investigating: 'bg-warning/10 text-yellow-700',
  resolved: 'bg-success/10 text-success',
  closed: 'bg-gray-100 text-gray-500',
};

const Badge = ({ value, map }) => (
  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${map[value] || 'bg-gray-100 text-gray-500'}`}>
    {value}
  </span>
);

const SkeletonRow = () => (
  <tr className="animate-pulse">
    {[...Array(7)].map((_, i) => (
      <td key={i} className="px-4 py-3"><div className="h-4 bg-gray-200 rounded" /></td>
    ))}
  </tr>
);

const Incidents = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, pages: 1 });
  const [filters, setFilters] = useState({ severity: '', status: '', search: '' });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const searchTimer = useRef(null);

  const fetchIncidents = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (filters.severity) params.severity = filters.severity;
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;
      const res = await api.get('/api/v1/incidents', { params });
      setIncidents(res.data.data.incidents);
      setPagination(res.data.data.pagination);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load incidents');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchIncidents(1);
  }, [fetchIncidents]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setFilters((f) => ({ ...f, search }));
    }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  useEffect(() => {
    if (!token) return;
    const socket = io(import.meta.env.VITE_API_URL, { auth: { token } });

    socket.on('incident:new', (incident) => {
      toast.success(`New incident: ${incident.title}`);
      setIncidents((prev) => [incident, ...prev]);
    });

    socket.on('incident:updated', ({ id, status }) => {
      setIncidents((prev) => prev.map((inc) => inc._id === id ? { ...inc, status } : inc));
    });

    socket.on('incident:deleted', ({ id }) => {
      setIncidents((prev) => prev.filter((inc) => inc._id !== id));
    });

    return () => socket.disconnect();
  }, [token]);

  const clearFilters = () => {
    setFilters({ severity: '', status: '', search: '' });
    setSearch('');
  };

  const hasFilters = filters.severity || filters.status || filters.search;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Incidents</h1>
        {user?.role !== 'viewer' && (
          <Link
            to="/incidents/new"
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition"
          >
            + New Incident
          </Link>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <select
          value={filters.severity}
          onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Severities</option>
          {['low', 'medium', 'high', 'critical'].map((s) => (
            <option key={s} value={s} className="capitalize">{s}</option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Statuses</option>
          {['open', 'investigating', 'resolved', 'closed'].map((s) => (
            <option key={s} value={s} className="capitalize">{s}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Search by title…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[180px] px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Clear
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Title', 'Severity', 'Status', 'Affected System', 'Reported By', 'Created', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
              ) : incidents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    <div className="text-4xl mb-2">📭</div>
                    <div>No incidents found</div>
                  </td>
                </tr>
              ) : (
                incidents.map((inc) => (
                  <tr key={inc._id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 font-medium text-gray-800 max-w-[200px] truncate">{inc.title}</td>
                    <td className="px-4 py-3"><Badge value={inc.severity} map={SEVERITY_BADGE} /></td>
                    <td className="px-4 py-3"><Badge value={inc.status} map={STATUS_BADGE} /></td>
                    <td className="px-4 py-3 text-gray-500 truncate max-w-[120px]">{inc.affectedSystem || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{inc.reportedBy?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {new Date(inc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/incidents/${inc._id}`}
                          className="text-xs px-2.5 py-1 bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition"
                        >
                          View
                        </Link>
                        {user?.role !== 'viewer' && (
                          <Link
                            to={`/incidents/${inc._id}`}
                            className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 transition"
                          >
                            Update
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.pages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
            <span className="text-gray-500">
              {pagination.total} total — page {pagination.page} of {pagination.pages}
            </span>
            <div className="flex gap-1">
              <button
                disabled={pagination.page === 1}
                onClick={() => fetchIncidents(pagination.page - 1)}
                className="px-3 py-1 border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50"
              >
                Previous
              </button>
              {[...Array(pagination.pages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => fetchIncidents(i + 1)}
                  className={`px-3 py-1 border rounded-md transition ${
                    pagination.page === i + 1
                      ? 'bg-primary text-white border-primary'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={pagination.page === pagination.pages}
                onClick={() => fetchIncidents(pagination.page + 1)}
                className="px-3 py-1 border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Incidents;
