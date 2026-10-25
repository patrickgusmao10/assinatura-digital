import { createContext, useContext, useEffect, useState } from 'react';
import { api, setCsrf } from './api';

const Ctx = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    api('/auth/me').then((d) => { setCsrf(d.csrfToken); setUser(d.user); }).catch(() => {}).finally(() => setReady(true));
  }, []);
  const login = async (email, password) => {
    const d = await api('/auth/login', { method: 'POST', body: { email, password } });
    setCsrf(d.csrfToken); setUser(d.user);
  };
  const logout = async () => { await api('/auth/logout', { method: 'POST' }).catch(() => {}); setCsrf(null); setUser(null); };
  return <Ctx.Provider value={{ user, ready, login, logout }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
