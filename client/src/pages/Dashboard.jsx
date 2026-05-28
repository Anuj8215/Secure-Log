import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const severityColors = { low: 'bg-success', medium: 'bg-warning', high: 'bg-orange-500', critical: 'bg-danger' };
const severityBarColors = { low: '#639922', medium: '#EF9F27', high: '#f97316', critical: '#E24B4A' };

const StatCard = ({ label, value, color, icon }) => (
  <div className={`bg-white rounded-xl shadow-sm border-l-4 ${color} p-5`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className="text-3xl font-bold text-gray-800 mt-1">{value ?? '—'}</p>
      </div>
      <span className="text-3xl opacity-60">{icon}</span>
    </div>
  </div>
);

const Skeleton = () => (
  <div className="animate-pulse space-y-6">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="h-64 bg-gray-200 rounded-xl" />
      <div className="h-64 bg-gray-200 rounded-xl" />
    </div>
  </div>
);

const Dashboard = () => {
  const { token, user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/api/v1/dashboard/stats');
      setStats(res.data.data);
      setLastUpdated(new Date());
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (!token) return;
    const socket = io(import.meta.env.VITE_API_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socket.on('incident:new', (incident) => {
      toast.success(`New incident: ${incident.title}`);
      setStats((prev) => prev ? { ...prev, totalIncidents: prev.totalIncidents + 1, openIncidents: prev.openIncidents + 1 } : prev);
    });

    socket.on('incident:critical', (incident) => {
      toast.error(`🚨 CRITICAL: ${incident.title}`, { duration: 5000 });
    });

    if (user?.role === 'admin') {
      socket.on('threat:detected', (data) => {
        toast.error(`⚠️ Threat detected: ${data.type} from ${data.ip}`, { duration: 5000 });
      });
    }

    return () => socket.disconnect();
  }, [token, user?.role]);

  if (loading) return <Skeleton />;

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={fetchStats} className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90">
          Retry
        </button>
      </div>
    );
  }

  const total = stats.totalIncidents || 1;
  const severities = ['low', 'medium', 'high', 'critical'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Security Dashboard</h1>
          {lastUpdated && (
            <p className="text-sm text-gray-400 mt-0.5">
              Updated {lastUpdated.toLocaleTimeString()}
              {stats.fromCache && <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">cached</span>}
            </p>
          )}
        </div>
        <button onClick={fetchStats} className="text-sm px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition">
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Incidents" value={stats.totalIncidents} color="border-blue-500" icon="📋" />
        <StatCard label="Critical Open" value={stats.criticalOpen} color="border-danger" icon="🚨" />
        <StatCard label="Open / Investigating" value={stats.openIncidents} color="border-warning" icon="🔍" />
        <StatCard label="Resolution Rate" value={`${stats.resolutionRate}%`} color="border-success" icon="✅" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Incidents — Last 7 Days</h2>
          {stats.last7Days?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.last7Days} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="_id" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#7F77DD" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No data yet</div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Severity Breakdown</h2>
          <div className="space-y-4">
            {severities.map((sev) => {
              const count = stats.bySeverity?.[sev] || 0;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={sev}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${severityColors[sev]}`} />
                      <span className="text-sm capitalize text-gray-600">{sev}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-800">{count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: severityBarColors[sev] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {stats.topReporters?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-700 mb-4">Top Reporters</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Email</th>
                  <th className="pb-2 font-medium text-right">Incidents</th>
                </tr>
              </thead>
              <tbody>
                {stats.topReporters.map((r, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="py-2.5 font-medium text-gray-800">{r.name}</td>
                    <td className="py-2.5 text-gray-500">{r.email}</td>
                    <td className="py-2.5 text-right">
                      <span className="bg-primary/10 text-primary font-semibold px-2 py-0.5 rounded-full">{r.count}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
