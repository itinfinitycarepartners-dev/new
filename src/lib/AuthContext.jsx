// @ts-nocheck
// AuthContext.jsx - Complete Working Version with Fixed Token Handling
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { auth, candidate, tokenStorage, initMessaging } from '@/api/icpClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [candidateData, setCandidateData] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  // ─── Load candidate data from API ──────────────────────────────────────
  const loadCandidateData = useCallback(async () => {
    const token = tokenStorage.get();
    if (!token) {
      console.log('[Auth] No token available to load candidate data');
      return null;
    }

    try {
      console.log('[Auth] Loading candidate data with token...');
      const result = await candidate.getMyDeals();
      console.log('[Auth] Candidate data response:', result);
      
      if (result && result.success && result.data) {
        setCandidateData(result.data);
        setUser((prev) => ({
          ...(prev || {}),
          full_name: result.data.candidateName || prev?.email?.split('@')[0] || 'Candidate',
          email: result.data.email || prev?.email,
          candidateData: result.data,
        }));
        console.log('[Auth] Candidate data loaded successfully');
        return result.data;
      } else {
        console.warn('[Auth] Candidate data response was not successful:', result);
        return null;
      }
    } catch (e) {
      console.error('[Auth] Failed to load candidate data:', e);

      const explicitSessionExpiry =
        e?.sessionExpired === true ||
        e?.data?.sessionExpired === true ||
        e?.data?.tokenExpired === true ||
        e?.data?.invalidToken === true ||
        e?.data?.code === 'TOKEN_EXPIRED' ||
        e?.data?.code === 'INVALID_TOKEN';

      if (explicitSessionExpiry) {
        tokenStorage.clear();
        setIsAuthenticated(false);
        setUser(null);
        localStorage.removeItem('icp_user_email');
        localStorage.removeItem('icp_user_name');
      }

      throw e;
    }
  }, []);

  // ─── Check authentication state ────────────────────────────────────────
  const checkAppState = useCallback(async () => {
    setIsLoadingAuth(true);
    setAuthError(null);

    const token = tokenStorage.get();
    console.log('[Auth] checkAppState - token exists:', !!token);
    console.log('[Auth] Token preview:', token ? token.substring(0, 20) + '...' : 'none');
    
    if (!token) {
      console.log('[Auth] No token found, user is not authenticated');
      setIsAuthenticated(false);
      setUser(null);
      setCandidateData(null);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      return;
    }

    try {
      // First try to load candidate data - if this works, the token is valid
      console.log('[Auth] Validating session by loading candidate data...');
      const data = await loadCandidateData();
      
      if (data) {
        // Success - token is valid
        const storedEmail = localStorage.getItem('icp_user_email') || '';
        const storedName = localStorage.getItem('icp_user_name') || storedEmail.split('@')[0];
        
        setUser({ 
          email: storedEmail, 
          full_name: storedName,
          candidateData: data
        });
        setIsAuthenticated(true);
        console.log('[Auth] Session valid, user authenticated:', storedEmail);
        
        // Initialize WebSocket for messaging
        initMessaging(token);
      } else {
        // No data returned - try session check as fallback
        console.log('[Auth] No candidate data, trying session check...');
        try {
          const session = await auth.sessionInfo();
          console.log('[Auth] Session info:', session);
          
          if (session && session.success && session.isActive) {
            // Session is valid but no candidate data - this is unusual but we can proceed
            const storedEmail = localStorage.getItem('icp_user_email') || '';
            const storedName = localStorage.getItem('icp_user_name') || storedEmail.split('@')[0];
            
            setUser({ 
              email: storedEmail, 
              full_name: storedName
            });
            setIsAuthenticated(true);
            console.log('[Auth] Session valid from session check');
            
            // Try loading candidate data again
            setTimeout(() => loadCandidateData(), 1000);
          } else {
            throw new Error('Session invalid');
          }
        } catch (sessionErr) {
          throw sessionErr;
        }
      }
    } catch (err) {
      console.error('[Auth] Session check error:', err);
      
      const explicitSessionExpiry =
        err?.sessionExpired === true ||
        err?.data?.sessionExpired === true ||
        err?.data?.tokenExpired === true ||
        err?.data?.invalidToken === true ||
        err?.data?.code === 'TOKEN_EXPIRED' ||
        err?.data?.code === 'INVALID_TOKEN';

      if (explicitSessionExpiry) {
        tokenStorage.clear();
        localStorage.removeItem('icp_user_email');
        localStorage.removeItem('icp_user_name');
        setIsAuthenticated(false);
        setUser(null);
        setCandidateData(null);
        setAuthError({
          type: 'auth_required',
          message: err.message || 'Your session has expired'
        });
      } else {
        const storedEmail = localStorage.getItem('icp_user_email') || '';
        const storedName =
          localStorage.getItem('icp_user_name') ||
          storedEmail.split('@')[0] ||
          'Candidate';

        console.log('[Auth] Temporary API failure; preserving login');
        setUser((previous) => previous || {
          email: storedEmail,
          full_name: storedName
        });
        setIsAuthenticated(true);
        setAuthError({
          type: 'temporary_error',
          message: err.message || 'Some candidate information is temporarily unavailable'
        });
        initMessaging(token);
      }
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }, [loadCandidateData]);

  // ─── Initial auth check on mount ──────────────────────────────────────
  useEffect(() => {
    console.log('[Auth] Initial auth check on mount...');
    checkAppState();
  }, []); // Run only once on mount

  // ─── Login success handler ─────────────────────────────────────────────
  const loginSuccess = useCallback(async (token, email, name) => {
    if (!token || !email) {
      console.error('[Auth] loginSuccess called with invalid params');
      return;
    }
    
    console.log('[Auth] loginSuccess called with token:', token ? 'exists' : 'none');
    console.log('[Auth] Token preview:', token.substring(0, 20) + '...');
    console.log('[Auth] Email:', email, 'Name:', name);
    
    try {
      // IMPORTANT: Store token FIRST
      tokenStorage.set(token);
      
      // Verify the token was stored
      const storedToken = tokenStorage.get();
      console.log('[Auth] Token stored, retrieval check:', storedToken ? 'success' : 'failed');
      
      // Store user data
      localStorage.setItem('icp_user_email', email);
      localStorage.setItem('icp_user_name', name || email.split('@')[0]);
      
      // Update state
      setUser({ 
        email, 
        full_name: name || email.split('@')[0] 
      });
      setIsAuthenticated(true);
      setAuthError(null);
      
      console.log('[Auth] loginSuccess - isAuthenticated set to true');
      
      // Initialize WebSocket for messaging
      initMessaging(token);
      
      // Load candidate data - wait for it to complete
      try {
        console.log('[Auth] Loading candidate data after login...');
        const data = await loadCandidateData();
        console.log('[Auth] Candidate data loaded:', data ? 'success' : 'no data');
        
        // If candidate data failed to load but we have a valid token, 
        // we might still be authenticated
        if (!data) {
          console.warn('[Auth] No candidate data, but token may still be valid');
        }
      } catch (err) {
        console.error('[Auth] Failed to load candidate data after login:', err);
        // Don't throw - we still have a valid token
      }
      
      console.log('[Auth] loginSuccess completed successfully');
      
      // Return the token for the login component
      return token;
    } catch (err) {
      console.error('[Auth] loginSuccess post-login error:', err);

      const storedToken = tokenStorage.get();
      if (storedToken) {
        setIsAuthenticated(true);
        setUser((previous) => previous || {
          email,
          full_name: name || email.split('@')[0]
        });
        setAuthError({
          type: 'temporary_error',
          message: err.message || 'Some account information is temporarily unavailable'
        });
        return storedToken;
      }

      throw err;
    }
  }, [loadCandidateData]);

  // ─── Logout handler ────────────────────────────────────────────────────
  const logout = useCallback(async (shouldRedirect = true) => {
    console.log('[Auth] Logging out...');
    
    try {
      // Call logout API
      await auth.logout();
    } catch (e) {
      console.error('[Auth] Logout API error:', e);
    } finally {
      // Clear all stored data
      tokenStorage.clear();
      localStorage.removeItem('icp_user_email');
      localStorage.removeItem('icp_user_name');
      
      // Reset state
      setUser(null);
      setCandidateData(null);
      setIsAuthenticated(false);
      setAuthError(null);
      
      console.log('[Auth] Logout completed, isAuthenticated set to false');
      
      // Redirect to login
      if (shouldRedirect) {
        window.location.href = '/login';
      }
    }
  }, []);

  // ─── Navigate to login ─────────────────────────────────────────────────
  const navigateToLogin = useCallback(() => {
    console.log('[Auth] Navigating to login');
    window.location.href = '/login';
  }, []);

  // ─── Force refresh authentication ──────────────────────────────────────
  const refreshAuth = useCallback(async () => {
    console.log('[Auth] Refreshing authentication...');
    await checkAppState();
  }, [checkAppState]);

  // ─── Get current token with validation ────────────────────────────────
  const getValidToken = useCallback(() => {
    const token = tokenStorage.get();
    if (!token) {
      console.warn('[Auth] No token available');
      return null;
    }
    return token;
  }, []);

  // ─── Context value ─────────────────────────────────────────────────────
  const value = {
    user,
    candidateData,
    isAuthenticated,
    isLoadingAuth,
    authError,
    authChecked,
    logout,
    navigateToLogin,
    loginSuccess,
    loadCandidateData,
    checkAppState,
    refreshAuth,
    getValidToken,
    // Additional helpers
    getToken: tokenStorage.get,
    isLoggedIn: () => isAuthenticated && !!tokenStorage.get(),
  };

  return React.createElement(AuthContext.Provider, { value }, children);
};

// ─── Hook for using auth context ──────────────────────────────────────
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// ─── Higher-order component for protected routes ──────────────────────
export const withAuth = (Component) => {
  return function WithAuthWrapper(props) {
    const { isAuthenticated, isLoadingAuth, navigateToLogin } = useAuth();
    
    if (isLoadingAuth) {
      return (
        <div className="fixed inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
        </div>
      );
    }
    
    if (!isAuthenticated) {
      navigateToLogin();
      return null;
    }
    
    return React.createElement(Component, props);
  };
};