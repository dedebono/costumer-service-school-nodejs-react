import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';
import { getToken, setToken, clearToken, getUser, setUser, clearUser } from '../lib/auth.js';


const AuthCtx = createContext(null);


export function AuthProvider({ children }) {
const [token, setTok] = useState(() => getToken());
const [user, setUsr] = useState(() => getUser());
const [loading, setLoading] = useState(true);


useEffect(() => {
if (token && user) {
setToken(token);
setUser(user);
}
setLoading(false);
}, [token, user]);


const login = async (email, password) => {
const data = await api('/api/auth/login', { method: 'POST', body: { email, password } });
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