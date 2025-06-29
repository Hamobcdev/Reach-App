import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react";

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, userProfile, loading, fetchUserProfile } = useAuth();
  const [profileLoading, setProfileLoading] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // If user exists but no profile, try to fetch it
    if (user && !userProfile && !loading) {
      setProfileLoading(true);
      fetchUserProfile(user.id).finally(() => {
        setProfileLoading(false);
      });
    }
  }, [user, userProfile, loading, fetchUserProfile]);

  // Show loading spinner while auth is loading or profile is being fetched
  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If no user, redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If specific role is required, check user role
  if (requiredRole) {
    const userRole = userProfile?.role;
    
    if (!userRole || userRole !== requiredRole) {
      // User doesn't have required role, redirect to appropriate page
      if (userRole === 'admin') {
        return <Navigate to="/admin" replace />;
      } else {
        return <Navigate to="/generate" replace />;
      }
    }
  }

  // User is authenticated and has required role (if any)
  return children;
};

export default ProtectedRoute;