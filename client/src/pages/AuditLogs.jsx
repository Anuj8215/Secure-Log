import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axios';

const ACTION_BADGE = (action) => {
  if (action.startsWith('CREATE_') || action.startsWith('POST_')) return 'bg-success/10 text-success';
  if (action.startsWith('DELETE_')) return 'bg-danger/10 text-danger';
  if (action.startsWith('UPDATE_') || action.startsWith('PATCH_')) return 'bg-warning/10 text-yellow-700';
  if (action === 'BLOCK_IP') return 'bg-danger/10 text-danger';
  if (action.startsWith('REVOKE_')) return 'bg-orange-100 text-orange-600';
  if (action.startsWith('GENERATE_')) return 'bg-blue-100 text-blue-600';
  return 'bg-gray-100 text-gray-500';
};

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, pages: 1 });
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const refreshTimer = useRef(null);

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (actionFilter) params.action = actionFilter;
      const res = await api.get('/api/v1/audit', { params });
      setLogs(res.data.data.logs);
      setPagination(res.data.data.pagination);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [actionFilter]);

  useEffect(() => {
    fetchLogs(1);
    refreshTimer.current = setInterval(() => fetchLogs(1), 30000);
    return () => clearInterval(refreshTimer.current);
  }, [fetchLogs]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">Auto-refreshes every 30s</span>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Filter by action (e.g. CREATE_INCIDENT)…"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="flex-1 min-w-[220px] px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {actionFilter && (
          <button
            onClick={() => setActionFilter('')}
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
                {['User', 'Action', 'Resource', 'IP Address', 'Timestamp'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(5)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-200 rounded" /></td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                    <div className="text-4xl mb-2">📋</div>
                    <div>No audit logs found</div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">
                        {log.userId?.name || log.userName || '—'}
                      </div>
                      {log.userId?.email && (
                        <div className="text-xs text-gray-400">{log.userId.email}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${ACTION_BADGE(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate font-mono text-xs">
                      {log.resource || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{log.ip || '—'}</td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                      {new Date(log.timestamp).toLocaleString()}
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
                onClick={() => fetchLogs(pagination.page - 1)}
                className="px-3 py-1 border border-gray-200 rounded-md disabled:opacity-40 hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                disabled={pagination.page === pagination.pages}
                onClick={() => fetchLogs(pagination.page + 1)}
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

export default AuditLogs;
