import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Paper, Button, TextField, Alert, Typography } from '@mui/material';
import Layout from '../components/Layout';
import { ExpenseDetails, dt } from '../components/common';
import { api } from '../lib/api';

export default function SignExpense() {
  const router = useRouter();
  const id = router.query.id;
  const [e, setE] = useState(null);
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (router.isReady && id) api(`/expenses/${id}`).then(setE).catch((x) => setErr(x.message)); }, [router.isReady, id]);
  const sign = async () => {
    setErr(''); setBusy(true);
    try { setE(await api(`/expenses/${id}/sign`, { method: 'POST', body: { password } })); setPassword(''); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <Layout title="Assinar documento digitalmente" managerOnly>
      {err && <Alert severity="error" className="mb-3">{err}</Alert>}
      {e && (
        <Paper className="p-5 max-w-2xl">
          <ExpenseDetails e={e} />
          {e.status === 'validated' && (
            <div className="pt-4">
              <Alert severity="info" className="mb-3">Ao assinar, o conteúdo do documento e o hash SHA-256 dos recibos são assinados com a sua chave privada (RSA-PSS). Confirme com a sua senha.</Alert>
              <TextField label="Sua senha" type="password" fullWidth value={password} onChange={(x) => setPassword(x.target.value)} autoComplete="current-password" />
              <Button variant="contained" className="mt-3" disabled={busy || !password} onClick={sign}>Assinar digitalmente</Button>
            </div>
          )}
          {e.status === 'signed' && (
            <div className="pt-4">
              <Alert severity="success">Documento assinado por {e.signature?.signer?.name} em {dt(e.signature?.signedAt)}.</Alert>
              <Typography variant="body2" className="pt-2">Impressão digital da chave: <code>{e.signature?.fingerprint}</code></Typography>
              <Button className="mt-2" component={Link} href={`/verifySignature?id=${e._id}`}>Verificar assinatura</Button>
            </div>
          )}
          {!['validated', 'signed'].includes(e.status) && <Alert severity="warning" className="mt-3">Este documento não está validado para assinatura.</Alert>}
        </Paper>
      )}
    </Layout>
  );
}
