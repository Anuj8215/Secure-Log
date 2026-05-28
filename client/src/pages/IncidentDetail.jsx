import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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

const IncidentDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [incident, setIncident] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState('');
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [incRes, auditRes] = await Promise.all([
          api.get(`/api/v1/incidents/${id}`),
          api.get('/api/v1/audit', { params: { action: 'CREATE_INCIDENT', limit: 50 } }).catch(() => ({ data: { data: { logs: [] } } })),
        ]);
        setIncident(incRes.data.data.incident);
        setNewStatus(incRes.data.data.incident.status);
        const incidentLogs = auditRes.data.data.logs.filter(
          (l) => l.resource === `incidents/${id}`
        );
        setAuditLogs(incidentLogs);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load incident');
        navigate('/incidents');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, navigate]);

  const handleUpdateStatus = async () => {
    if (newStatus === incident.status) return;
    setUpdating(true);
    try {
      const res = await api.patch(`/api/v1/incidents/${id}/status`, { status: newStatus });
      setIncident(res.data.data.incident);
      toast.success('Status updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/api/v1/incidents/${id}`);
      toast.success('Incident deleted');
      navigate('/incidents');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (!incident) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/incidents" className="text-gray-400 hover:text-gray-600 text-sm">← Incidents</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-600 text-sm truncate">{incident.title}</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900">{incident.title}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Description</p>
              <p className="text-gray-700">{incident.description || 'No description provided.'}</p>
            </div>
            {incident.affectedSystem && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Affected System</p>
                <p className="text-gray-700">{incident.affectedSystem}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Reported By</p>
              <p className="text-gray-700">
                {incident.reportedBy?.name || 'System'}{' '}
                {incident.reportedBy?.email && (
                  <span className="text-gray-400">({incident.reportedBy.email})</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Type</p>
              <p className="text-gray-700 capitalize">{incident.type?.replace(/_/g, ' ')}</p>
            </div>
          </div>

          {auditLogs.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Activity</h2>
              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div key={log._id} className="flex items-start gap-3 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-gray-700">{log.userName}</span>
                      <span className="text-gray-400"> · {log.action}</span>
                      <span className="block text-xs text-gray-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Severity</p>
              <span className={`text-sm font-bold px-3 py-1.5 rounded-full capitalize ${SEVERITY_BADGE[incident.severity]}`}>
                {incident.severity}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Status</p>
              <span className={`text-sm font-bold px-3 py-1.5 rounded-full capitalize ${STATUS_BADGE[incident.status]}`}>
                {incident.status}
              </span>
            </div>

            {user?.role !== 'viewer' && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Update Status</p>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary mb-2"
                >
                  {['open', 'investigating', 'resolved', 'closed'].map((s) => (
                    <option key={s} value={s} className="capitalize">{s}</option>
                  ))}
                </select>
                <button
                  onClick={handleUpdateStatus}
                  disabled={updating || newStatus === incident.status}
                  className="w-full py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
                >
                  {updating ? 'Saving…' : 'Save Status'}
                </button>
              </div>
            )}

            <div className="pt-2 border-t border-gray-100 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Created</span>
                <span className="text-gray-600">{new Date(incident.createdAt).toLocaleDateString()}</span>
              </div>
              {incident.resolvedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Resolved</span>
                  <span className="text-gray-600">{new Date(incident.resolvedAt).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {user?.role === 'admin' && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="w-full py-2 border border-danger text-danger rounded-lg text-sm font-medium hover:bg-danger/5 transition"
                >
                  Delete Incident
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 font-medium">Are you sure?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex-1 py-2 bg-danger text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-60"
                    >
                      {deleting ? 'Deleting…' : 'Yes, Delete'}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IncidentDetail;
