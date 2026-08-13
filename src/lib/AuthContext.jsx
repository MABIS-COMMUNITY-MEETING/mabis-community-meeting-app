import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';
import { isHackerMode, disableHackerMode, HACKER_USER } from '@/lib/hacker';
import { queryClientInstance } from '@/lib/query-client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    checkAppState();
  }, []);

  useEffect(() => {
    if (!user?.id || user.id === HACKER_USER.id) return undefined;
    let stop = () => {};
    let cancelled = false;

    import('@/lib/offline-cache').then(({ startOfflineQueryPersistence }) => {
      if (!cancelled) stop = startOfflineQueryPersistence(queryClientInstance, user.id);
    });

    return () => {
      cancelled = true;
      stop();
    };
  }, [user?.id]);

  const recoverOfflineState = async (error) => {
    if (!appParams.token || error?.status === 401 || error?.status === 403) return false;
    if (navigator.onLine !== false && error?.status && error.status < 500) return false;

    const { restoreOfflineQueries, restoreOfflineUser } = await import('@/lib/offline-cache');
    const offlineUser = restoreOfflineUser(appParams.token);
    if (!offlineUser) return false;

    await restoreOfflineQueries(queryClientInstance, offlineUser.id);
    setUser(offlineUser);
    setIsAuthenticated(true);
    setIsLoadingAuth(false);
    setIsLoadingPublicSettings(false);
    setAuthChecked(true);
    setAuthError(null);
    return true;
  };

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      // First, check app public settings (with token if available)
      // This will tell us if auth is required, user not registered, etc.
      const appClient = createAxiosClient({
        baseURL: `/api/apps/public`,
        headers: {
          'X-App-Id': appParams.appId
        },
        token: appParams.token, // Include token if available
        interceptResponses: true
      });
      
      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);
        
        // A genuine Base44 session always wins over the optional local hacker
        // easter egg. The old order let a stale localStorage flag impersonate
        // the user even while their real MABIS account token was still valid.
        if (appParams.token) {
          await checkUserAuth();
        } else if (isHackerMode()) {
          setUser(HACKER_USER);
          setIsAuthenticated(true);
          setIsLoadingAuth(false);
          setAuthChecked(true);
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
          setAuthChecked(true);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        if (await recoverOfflineState(appError)) return;
        
        // Handle app-level errors
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required'
            });
          } else if (reason === 'user_not_registered') {
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app'
            });
          } else {
            setAuthError({
              type: reason,
              message: appError.message
            });
          }
        } else {
          setAuthError({
            type: 'unknown',
            message: appError.message || 'Failed to load app'
          });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      if (await recoverOfflineState(error)) return;
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      // Now check if the user is authenticated
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      disableHackerMode();
      const { restoreOfflineQueries, saveOfflineUser } = await import('@/lib/offline-cache');
      await restoreOfflineQueries(queryClientInstance, currentUser.id);
      saveOfflineUser(currentUser, appParams.token);
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    } catch (error) {
      console.error('User auth check failed:', error);
      if (await recoverOfflineState(error)) return;
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
      
      // If user auth fails, it might be an expired token
      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  const logout = async (shouldRedirect = true) => {
    const { clearOfflineData } = await import('@/lib/offline-cache');
    await clearOfflineData();
    queryClientInstance.clear();
    if (user?.id === HACKER_USER.id) {
      disableHackerMode();
      setUser(null);
      setIsAuthenticated(false);
      window.location.href = '/login';
      return;
    }
    // A stale hacker flag must never prevent a real Base44 logout.
    disableHackerMode();
    setUser(null);
    setIsAuthenticated(false);
    
    if (shouldRedirect) {
      // Use the SDK's logout method which handles token cleanup and redirect
      base44.auth.logout(window.location.href);
    } else {
      // Just remove the token without redirect
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    // Use the SDK's redirectToLogin method
    base44.auth.redirectToLogin(window.location.href);
  };

  // Lightweight user refresh — no loading state, no screen flash
  const updateUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      disableHackerMode();
      const { saveOfflineUser } = await import('@/lib/offline-cache');
      saveOfflineUser(currentUser, appParams.token);
      setUser(currentUser);
    } catch (e) { /* ignore */ }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      refetchUser: checkUserAuth,
      updateUser,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};