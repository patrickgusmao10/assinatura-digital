import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Paper, Alert, Typography, Button, CircularProgress } from '@mui/material';
import Layout from '../components/Layout';
import { dt, brl } from '../components/common';
import { api } from '../lib/api';

export default function VerifySignature() {
  const router = useRouter();
  const id = router.query.id;
  const [r, setR] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setErr(''); setBusy(true);
    try { setR(await api(`/expenses/${id}/verify`)); } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  useEffect(() => { if (router.isReady && id) run(); }, [router.isReady, id]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Layout title="Verificar assinatura digital" managerOnly>
      {router.isReady && !id && <Alert severity="info">Escolha um documento em <Link href="/signedExpenses">Documentos assinados</Link>.</Alert>}
      {err && <Alert severity="error" className="mb-3">{err}</Alert>}
      {busy && <CircularProgress />}
      {r && (
        <Paper className="p-5 max-w-2xl">
          <Alert severity={r.valid ? 'success' : 'error'} className="mb-3">{r.valid ? 'Assinatura VÁLIDA: documento autêntico e íntegro.' : 'Assinatura INVÁLIDA: há inconsistências.'}</Alert>
          {r.checks.map((c) => <Alert key={c.key} severity={c.ok ? 'success' : 'error'} variant="outlined" className="mb-2"><b>{c.label}</b><br />{c.detail}</Alert>)}
          <Typography className="pt-3"><b>Documento:</b> {r.document.title} ({brl(r.document.amount)}), enviado por {r.document.submittedBy}</Typography>
          <Typography><b>Signatário:</b> {r.signature.signer} ({r.signature.signerEmail})</Typography>
          <Typography><b>Data da assinatura:</b> {dt(r.signature.signedAt)}</Typography>
          <Typography><b>Algoritmo:</b> {r.signature.algorithm}</Typography>
          <Typography className="break-all"><b>Impressão digital da chave:</b> <code>{r.signature.fingerprint}</code></Typography>
          <Typography className="break-all"><b>SHA-256 do conteúdo assinado:</b> <code>{r.signature.payloadSha256}</code></Typography>
          <Typography className="break-all"><b>Assinatura (Base64):</b> <code>{r.signature.signatureB64.slice(0, 96)}…</code></Typography>
          <div className="pt-3 flex gap-2"><Button variant="outlined" onClick={run}>Verificar novamente</Button><Button component={Link} href="/signedExpenses">Voltar</Button></div>
        </Paper>
      )}
    </Layout>
  );
}
