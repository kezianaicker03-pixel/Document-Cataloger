import { useState, useEffect, useCallback } from 'react';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string; expires_in?: number }) => void;
            error_callback?: (err: any) => void;
          }) => {
            requestAccessToken: () => void;
          };
        };
      };
    };
  }
}

export interface AuthState {
  accessToken: string | null;
  clientId: string | null;
  scopes: string[];
  userEmail: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const TOKEN_STORAGE_KEY = 'doc_cataloger_oauth_token';
const TOKEN_EXPIRY_KEY = 'doc_cataloger_oauth_expiry';

export function useGoogleAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    accessToken: null,
    clientId: null,
    scopes: [],
    userEmail: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  const [tokenClient, setTokenClient] = useState<any>(null);

  // Fetch client ID from server
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch('/api/auth/config');
        const data = await res.json();
        const clientId = data.clientId;
        const scopes = data.scopes || [
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/spreadsheets',
        ];

        // Check if cached token is still valid
        const cachedToken = sessionStorage.getItem(TOKEN_STORAGE_KEY);
        const cachedExpiry = sessionStorage.getItem(TOKEN_EXPIRY_KEY);
        const isStillValid = cachedToken && cachedExpiry && Date.now() < parseInt(cachedExpiry, 10);

        setAuthState((prev) => ({
          ...prev,
          clientId,
          scopes,
          accessToken: isStillValid ? cachedToken : null,
          isAuthenticated: !!isStillValid,
          isLoading: false,
        }));
      } catch (err: any) {
        console.error('Failed to load OAuth config:', err);
        setAuthState((prev) => ({
          ...prev,
          isLoading: false,
          error: 'Could not load Google authentication configuration.',
        }));
      }
    }
    loadConfig();
  }, []);

  // Initialize GSI token client
  useEffect(() => {
    if (!authState.clientId || typeof window === 'undefined') return;

    const checkGsi = () => {
      if (window.google?.accounts?.oauth2) {
        try {
          const client = window.google.accounts.oauth2.initTokenClient({
            client_id: authState.clientId!,
            scope: authState.scopes.join(' '),
            callback: (response) => {
              if (response.error) {
                console.error('OAuth error:', response);
                setAuthState((prev) => ({
                  ...prev,
                  error: `Google Sign-in failed: ${response.error}`,
                  isLoading: false,
                }));
                return;
              }

              if (response.access_token) {
                const token = response.access_token;
                const expiresInSec = response.expires_in || 3599;
                const expiryTime = Date.now() + expiresInSec * 1000;

                sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
                sessionStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());

                setAuthState((prev) => ({
                  ...prev,
                  accessToken: token,
                  isAuthenticated: true,
                  isLoading: false,
                  error: null,
                }));
              }
            },
            error_callback: (err) => {
              console.error('GSI client error:', err);
            },
          });
          setTokenClient(client);
        } catch (e: any) {
          console.warn('Error initializing GSI client:', e);
        }
      } else {
        setTimeout(checkGsi, 200);
      }
    };

    checkGsi();
  }, [authState.clientId, authState.scopes]);

  const login = useCallback(() => {
    if (tokenClient) {
      setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));
      tokenClient.requestAccessToken();
    } else {
      // If token client not ready yet, retry in 300ms
      setTimeout(() => {
        if (tokenClient) {
          tokenClient.requestAccessToken();
        } else {
          setAuthState((prev) => ({
            ...prev,
            error: 'Google Sign-In service is initializing. Please click again in a moment.',
          }));
        }
      }, 300);
    }
  }, [tokenClient]);

  const logout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
    setAuthState((prev) => ({
      ...prev,
      accessToken: null,
      isAuthenticated: false,
      userEmail: null,
      error: null,
    }));
  }, []);

  const setUserEmail = useCallback((email: string) => {
    setAuthState((prev) => ({ ...prev, userEmail: email }));
  }, []);

  return {
    ...authState,
    login,
    logout,
    setUserEmail,
  };
}
