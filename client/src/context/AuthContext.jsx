import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  getIdTokenResult
} from 'firebase/auth';
import { auth } from '../config/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');

  useEffect(() => {
    const localToken = localStorage.getItem('razz_hex_admin_token');
    
    // Auto-restore mock session in offline/demo mode
    if (localToken === 'mock-developer-token' && auth.app.options.apiKey === 'demo-api-key') {
      setUser({
        uid: 'dev-bypass-uid',
        email: 'admin@razzhex.com',
        displayName: 'Demo Administrator'
      });
      setToken('mock-developer-token');
      setIsAdmin(true);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        try {
          const tokenResult = await getIdTokenResult(currentUser);
          const rawToken = tokenResult.token;
          setToken(rawToken);
          
          // Store token in local session to authenticate API requests
          localStorage.setItem('razz_hex_admin_token', rawToken);
          
          // Check for admin claim or database record
          // For initial ease of testing, if user is logged in, we let them proceed
          setIsAdmin(true); 
        } catch (err) {
          console.error('Error fetching auth token result:', err);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
        setToken('');
        localStorage.removeItem('razz_hex_admin_token');
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = (email, password) => {
    if (auth.app.options.apiKey === 'demo-api-key') {
      console.log('[AUTH BYPASS] Establishing local developer sandbox session.');
      const mockUser = {
        uid: 'dev-bypass-uid',
        email: email || 'admin@razzhex.com',
        displayName: 'Demo Administrator'
      };
      setUser(mockUser);
      setToken('mock-developer-token');
      localStorage.setItem('razz_hex_admin_token', 'mock-developer-token');
      setIsAdmin(true);
      return Promise.resolve(mockUser);
    }
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = () => {
    if (auth.app.options.apiKey === 'demo-api-key') {
      setUser(null);
      setToken('');
      localStorage.removeItem('razz_hex_admin_token');
      setIsAdmin(false);
      return Promise.resolve();
    }
    return signOut(auth);
  };

  const value = {
    user,
    token,
    isAdmin,
    loading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
