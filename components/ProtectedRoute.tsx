import React, { useEffect, ReactNode } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../hooks/AuthContext';

// ✅ Define props type for children
interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // ✅ Redirect to login if not authenticated
    if (!loading && !user) {
      router.replace('/login'); // 🔁 Update if your login route is different
    }
  }, [user, loading]);

  if (loading) {
    // ✅ Optional: You can style this loader however you like
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // ✅ Show protected children only when user is authenticated
  return user ? children : null;
};

export default ProtectedRoute;
