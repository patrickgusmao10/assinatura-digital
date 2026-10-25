import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { AppBar, Toolbar, Typography, Button, Container, Box, CircularProgress, Alert } from '@mui/material';
import { useAuth } from '../lib/auth';

export default function Layout({ title, managerOnly, children }) {
  const { user, ready, logout } = useAuth();
  const router = useRouter();
  useEffect(() => { if (ready && !user) router.replace('/login'); }, [ready, user, router]);
  if (!ready || !user) return <Box className="p-10 text-center"><CircularProgress /></Box>;
  const blocked = managerOnly && user.role !== 'manager';
  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography component={Link} href="/dashboard" variant="h6" sx={{ flexGrow: 1, color: 'inherit', textDecoration: 'none' }}>Assinatura Digital</Typography>
          <Typography className="mr-4">{user.name} ({user.role === 'manager' ? 'Gerente' : 'Funcionário'})</Typography>
          <Button color="inherit" onClick={async () => { await logout(); router.replace('/login'); }}>Sair</Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" className="py-6">
        <Typography variant="h5" gutterBottom>{title}</Typography>
        {blocked ? <Alert severity="error">Acesso restrito ao Gerente.</Alert> : children}
      </Container>
    </>
  );
}
