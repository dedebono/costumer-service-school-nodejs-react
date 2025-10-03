import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { getToken, setToken, clearToken, getUser, setUser, clearUser } from '../lib/auth.js';


const AuthCtx = createContext(null);


export function AuthProvider({ children }) {
const [token, setTok] = useState(() => getToken());
const [user, setUsr] = useState(() => getUser());
const [loading, setLoading] = useState(true);


  useEffect(() => {
    async function verifyUserToken() {
      const currentToken = getToken();
      if (currentToken) {
        try {
          // Set token for the upcoming API call
          setToken(currentToken);
          const { user: freshUser } = await api('/auth/me');
          setUsr(freshUser);
          setUser(freshUser); // also save to localStorage
        } catch (error) {
          // Token is invalid or expired, clear everything
          clearToken();
          clearUser();
          setUsr(null);
          setTok('');
        }
      }
      setLoading(false);
    }

    verifyUserToken();
  }, []); // Empty dependency array ensures this runs only once on mount


const login = async (email, password) => {
    const data = await api('/auth/login', { method: 'POST', body: { email, password } });setToken(data.token);
setUser(data.user);
setTok(data.token);
setUsr(data.user);
};


const logout = () => {
clearToken();
clearUser();
setTok('');
setUsr(null);
};


const value = useMemo(() => ({ token, user, login, logout, loading }), [token, user, loading]);
return <AuthCtx.Provider value={value}>{!loading && children}</AuthCtx.Provider>;
}


export function useAuth() {
const ctx = useContext(AuthCtx);
if (!ctx) throw new Error('useAuth must be used within AuthProvider');
return ctx;
}