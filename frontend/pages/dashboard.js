import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Grid, Card, CardContent, CardActions, Button, Typography, Alert } from '@mui/material';
import Layout from '../components/Layout';
import ExpenseTable from '../components/ExpenseTable';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

export default function Dashboard() {
  const { user } = useAuth();
  const [list, setList] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { if (user) api('/expenses').then(setList).catch((e) => setErr(e.message)); }, [user]);
  const count = (s) => (list || []).filter((e) => e.status === s).length;
  const isM = user?.role === 'manager';
  const cards = [
    { t: 'Cadastrar relatório de despesa', d: 'Envie uma despesa com recibos.', href: '/submitExpense', b: 'Nova despesa' },
    ...(isM ? [
      { t: 'Funcionários', d: 'Cadastrar, listar, editar e excluir.', href: '/employees', b: 'Gerenciar' },
      { t: `Pendentes (${count('pending')} a validar / ${count('validated')} a assinar)`, d: 'Validar e assinar documentos.', href: '/pendingExpenses', b: 'Abrir' },
      { t: `Assinados (${count('signed')})`, d: 'Listar e verificar assinaturas digitais.', href: '/signedExpenses', b: 'Abrir' },
    ] : []),
  ];
  return (
    <Layout title="Painel">
      {err && <Alert severity="error">{err}</Alert>}
      <Grid container spacing={2} className="pb-6">
        {cards.map((c) => (
          <Grid item xs={12} sm={6} md={3} key={c.href}>
            <Card className="h-full"><CardContent><Typography variant="subtitle1" fontWeight={600}>{c.t}</Typography><Typography color="text.secondary">{c.d}</Typography></CardContent>
              <CardActions><Button component={Link} href={c.href}>{c.b}</Button></CardActions></Card>
          </Grid>
        ))}
      </Grid>
      <Typography variant="h6" gutterBottom>{isM ? 'Documentos recentes' : 'Minhas despesas'}</Typography>
      <ExpenseTable rows={list && list.slice(0, 10)} empty="Nenhuma despesa cadastrada ainda." />
    </Layout>
  );
}
