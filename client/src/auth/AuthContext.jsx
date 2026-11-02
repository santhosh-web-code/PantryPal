import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { apiRequest } from '../utils/api.js';

const AuthContext = createContext(null);
let sessionRequest;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [portal, setPortal] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const authOperation = useRef(0);

  useEffect(() => {
    try {
      localStorage.removeItem('pantrypal-token');
      localStorage.removeItem('pantrypal-user');
    } catch (storageError) {
      console.warn('Unable to clear legacy authentication data from browser storage.', storageError);
    }

    const operation = authOperation.current;
    sessionRequest ??= apiRequest('/api/auth/me')
      .then(payload => ({ user: payload.user, portal: payload.portal }))
      .catch(requestError => {
        if (requestError.status === 401) return null;
        throw requestError;
      })
      .finally(() => { sessionRequest = null; });

    let active = true;
    sessionRequest.then(restoredUser => {
      if (!active || authOperation.current !== operation) return;
      setUser(restoredUser?.user || null);
      setPortal(restoredUser?.portal || null);
      setStatus(restoredUser?.user ? 'authenticated' : 'unauthenticated');
    }).catch(requestError => {
      if (!active || authOperation.current !== operation) return;
      setError(requestError.message);
      setStatus('error');
    });

    return () => { active = false; };
  }, []);

  const authenticate = useCallback(async (path, credentials, selectedPortal) => {
    authOperation.current += 1;
    setError('');
    try {
      const payload = await apiRequest(path, {
        method: 'POST',
        body: JSON.stringify({ ...credentials, portal: selectedPortal })
      });
      setUser(payload.user);
      setPortal(payload.portal || selectedPortal || (payload.user.role === 'buyer' ? 'member' : 'owner'));
      setStatus('authenticated');
      return payload.user;
    } catch (requestError) {
      setUser(null);
      setPortal(null);
      setStatus('unauthenticated');
      throw requestError;
    }
  }, []);

  const login = useCallback((credentials, selectedPortal) => authenticate('/api/auth/login', credentials, selectedPortal), [authenticate]);
  const register = useCallback((credentials, selectedPortal) => authenticate('/api/auth/register', credentials, selectedPortal), [authenticate]);
  const logout = useCallback(async () => {
    authOperation.current += 1;
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      setPortal(null);
      setStatus('unauthenticated');
      setError('');
    }
  }, []);

  const value = useMemo(() => ({ user, portal, status, error, login, register, logout }), [user, portal, status, error, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
