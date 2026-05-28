import { useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import api from '../api/axios';

const SEVERITIES = ['low', 'medium', 'high', 'critical'];
const TYPES = [
  { value: 'manual', label: 'Manual' },
  { value: 'brute_force', label: 'Brute Force' },
  { value: 'suspicious_login', label: 'Suspicious Login' },
  { value: 'ddos', label: 'DDoS' },
  { value: 'other', label: 'Other' },
];

const CreateIncident = () => {
  const navigate = useNavigate();
  const idempotencyKey = useRef(uuidv4());
  const [form, setForm] = useState({
    title: '',
    description: '',
    severity: '',
    type: 'manual',
    affectedSystem: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errs = {};
    if (!form.title.trim() || form.title.length < 3) errs.title = 'Title must be at least 3 characters';
    if (!form.severity) errs.severity = 'Severity is required';
    if (form.description && form.description.length > 2000) errs.description = 'Max 2000 characters';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      await api.post('/api/v1/incidents', form, {
        headers: { 'Idempotency-Key': idempotencyKey.current },
      });
      toast.success('Incident created');
      navigate('/incidents');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create incident');
    } finally {
      setLoading(false);
    }
  };

  const field = (name) => ({
    value: form[name],
    onChange: (e) => {
      setForm({ ...form, [name]: e.target.value });
      if (errors[name]) setErrors({ ...errors, [name]: '' });
    },
  });

  const inputClass = (name) =>
    `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary ${
      errors[name] ? 'border-danger focus:ring-danger/30' : 'border-gray-200'
    }`;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/incidents" className="text-gray-400 hover:text-gray-600 text-sm">← Incidents</Link>
        <span className="text-gray-300">/</span>
        <span className="text-gray-600 text-sm">New Incident</span>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Create Incident</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-danger">*</span>
            </label>
            <input type="text" {...field('title')} className={inputClass('title')} placeholder="Brief incident title" />
            {errors.title && <p className="text-xs text-danger mt-1">{errors.title}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              {...field('description')}
              rows={4}
              className={inputClass('description')}
              placeholder="Describe what happened…"
            />
            {errors.description && <p className="text-xs text-danger mt-1">{errors.description}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Severity <span className="text-danger">*</span>
              </label>
              <select {...field('severity')} className={inputClass('severity')}>
                <option value="">Select severity</option>
                {SEVERITIES.map((s) => (
                  <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
              {errors.severity && <p className="text-xs text-danger mt-1">{errors.severity}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select {...field('type')} className={inputClass('type')}>
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Affected System</label>
            <input
              type="text"
              {...field('affectedSystem')}
              className={inputClass('affectedSystem')}
              placeholder="e.g. auth-service, API gateway"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-60 flex items-center gap-2"
            >
              {loading && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              {loading ? 'Creating…' : 'Create Incident'}
            </button>
            <Link
              to="/incidents"
              className="px-6 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateIncident;
