import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Typography, Alert } from '@mui/material';
import Layout from '../components/Layout';
import ExpenseTable from '../components/ExpenseTable';
import { api } from '../lib/api';

export default function PendingExpenses() {
  const [pending, setPending] = useState(null);
  const [validated, setValidated] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    api('/expenses?status=pending').then(setPending).catch((e) => setErr(e.message));
    api('/expenses?status=validated').then(setValidated).catch((e) => setErr(e.message));
  }, []);
  return (
    <Layout title="Documentos pendentes" managerOnly>
      {err && <Alert severity="error">{err}</Alert>}
      <Typography variant="h6" gutterBottom>Aguardando validação</Typography>
      <ExpenseTable rows={pending} empty="Nenhum documento aguardando validação."
        actions={(e) => <Button size="small" variant="contained" component={Link} href={`/validateExpense?id=${e._id}`}>Validar</Button>} />
      <Typography variant="h6" className="pt-6" gutterBottom>Validados, aguardando assinatura</Typography>
      <ExpenseTable rows={validated} empty="Nenhum documento aguardando assinatura."
        actions={(e) => <Button size="small" variant="contained" color="secondary" component={Link} href={`/signExpense?id=${e._id}`}>Assinar</Button>} />
    </Layout>
  );
}
