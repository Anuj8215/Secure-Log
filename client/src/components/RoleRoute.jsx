import { Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RoleRoute = ({ roles }) => {
  const { user } = useAuth();

  if (!roles.includes(user?.role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-6xl">🚫</div>
        <h2 className="text-2xl font-bold text-gray-800">Access Denied</h2>
        <p className="text-gray-500">You do not have permission to view this page.</p>
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition"
        >
          Go Back
        </button>
      </div>
    );
  }

  return <Outlet />;
};

export default RoleRoute;
