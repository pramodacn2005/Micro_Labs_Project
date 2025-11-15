import React, { createContext, useContext, useEffect, useState } from 'react';
import { getFirebaseAuth, getUserData } from '../services/firebaseService';
import { onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Fetch additional user data from Firestore
        const userDataResult = await getUserData(firebaseUser.uid);
        if (userDataResult.success) {
          const data = userDataResult.data;
          // Keep role as-is (don't set default here, let RoleSelector handle it)
          setUserData(data);
        } else {
          console.error('Failed to fetch user data:', userDataResult.error);
          setUserData({
            fullName: firebaseUser.displayName || 'User',
            email: firebaseUser.email,
            phone: null
            // Don't set role here - let RoleSelector prompt user
          });
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const refreshUserData = async () => {
    if (user) {
      const userDataResult = await getUserData(user.uid);
      if (userDataResult.success) {
        setUserData(userDataResult.data);
      }
    }
  };

  const value = {
    user,
    userData,
    loading,
    isAuthenticated: !!user,
    refreshUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
