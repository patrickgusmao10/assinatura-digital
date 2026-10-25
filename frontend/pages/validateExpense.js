import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Paper, Button, TextField, Alert } from '@mui/material';
import Layout from '../components/Layout';
import { ExpenseDetails } from '../components/common';
import { api } from '../lib/api';

export default function ValidateExpense() {
  const router = useRouter();
  const id = router.query.id;
  const [e, setE] = useState(null);
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => { if (router.isReady && id) api(`/expenses/${id}`).then(setE).catch((x) => setErr(x.message)); }, [router.isReady, id]);
  const decide = async (approve) => {
    setErr('');
    try { const r = await api(`/expenses/${id}/validate`, { method: 'POST', body: { approve, note } }); setE(r); }
    catch (x) { setErr(x.message); }
  };
  return (
    <Layout title="Validar documento" managerOnly>
      {err && <Alert severity="error" className="mb-3">{err}</Alert>}
      {e && (
        <Paper className="p-5 max-w-2xl">
          <ExpenseDetails e={e} />
          {e.status === 'pending' ? (
            <div className="pt-4">
              <TextField label="Observação (opcional)" fullWidth multiline minRows={2} value={note} onChange={(x) => setNote(x.target.value)} inputProps={{ maxLength: 500 }} />
              <div className="pt-3 flex gap-2">
                <Button variant="contained" color="success" onClick={() => decide(true)}>Validar</Button>
                <Button variant="outlined" color="error" onClick={() => decide(false)}>Rejeitar</Button>
              </div>
            </div>
          ) : (
            <div className="pt-4 flex gap-2">
              {e.status === 'validated' && <Button variant="contained" component={Link} href={`/signExpense?id=${e._id}`}>Ir para assinatura</Button>}
              <Button component={Link} href="/pendingExpenses">Voltar</Button>
            </div>
          )}
        </Paper>
      )}
    </Layout>
  );
}
