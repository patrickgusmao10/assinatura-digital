import { useState } from 'react';
import { useRouter } from 'next/router';
import { Paper, TextField, Button, Typography, Alert } from '@mui/material';
import { useAuth } from '../lib/auth';

export default function Login() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (ev) => {
    ev.preventDefault(); setErr(''); setBusy(true);
    try { await login(email, password); router.replace('/dashboard'); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Paper className="w-full max-w-sm p-6" component="form" onSubmit={submit}>
        <Typography variant="h5" gutterBottom>Assinatura Digital</Typography>
        <Typography color="text.secondary" className="pb-4">Entre com seu e-mail e senha.</Typography>
        {err && <Alert severity="error" className="mb-3">{err}</Alert>}
        <TextField label="E-mail" type="email" fullWidth margin="normal" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
        <TextField label="Senha" type="password" fullWidth margin="normal" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        <Button type="submit" variant="contained" fullWidth disabled={busy} className="mt-4">Entrar</Button>
      </Paper>
    </div>
  );
}
