import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Alert } from '@mui/material';
import Layout from '../components/Layout';
import ExpenseTable from '../components/ExpenseTable';
import { api } from '../lib/api';

export default function SignedExpenses() {
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api('/expenses?status=signed').then(setRows).catch((e) => setErr(e.message)); }, []);
  return (
    <Layout title="Documentos assinados" managerOnly>
      {err && <Alert severity="error">{err}</Alert>}
      <ExpenseTable rows={rows} empty="Nenhum documento assinado ainda."
        actions={(e) => <Button size="small" variant="contained" component={Link} href={`/verifySignature?id=${e._id}`}>Verificar assinatura</Button>} />
    </Layout>
  );
}
