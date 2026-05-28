import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out');
    navigate('/login');
  };

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const linkClass = (path) =>
    `px-3 py-2 rounded-md text-sm font-medium transition ${
      isActive(path) ? 'bg-primary text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'
    }`;

  const roleBadgeColor = {
    admin: 'bg-red-500',
    analyst: 'bg-blue-500',
    viewer: 'bg-gray-500',
  };

  return (
    <nav className="bg-gray-900 border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link to="/dashboard" className="text-primary font-bold text-lg tracking-tight">
              🔒 SecureLog
            </Link>
            <div className="hidden sm:flex items-center gap-1">
              <Link to="/dashboard" className={linkClass('/dashboard')}>Dashboard</Link>
              <Link to="/incidents" className={linkClass('/incidents')}>Incidents</Link>
              {user?.role === 'admin' && (
                <Link to="/audit" className={linkClass('/audit')}>Audit Logs</Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-gray-300 text-sm hidden sm:block">{user?.name}</span>
            <span className={`text-white text-xs px-2 py-0.5 rounded-full font-medium ${roleBadgeColor[user?.role] || 'bg-gray-500'}`}>
              {user?.role}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm px-3 py-1.5 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 transition"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="sm:hidden flex gap-1 pb-2">
          <Link to="/dashboard" className={linkClass('/dashboard')}>Dashboard</Link>
          <Link to="/incidents" className={linkClass('/incidents')}>Incidents</Link>
          {user?.role === 'admin' && (
            <Link to="/audit" className={linkClass('/audit')}>Audit</Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
