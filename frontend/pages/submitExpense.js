import { useState } from 'react';
import { useRouter } from 'next/router';
import { Paper, TextField, Button, Alert, Typography } from '@mui/material';
import Layout from '../components/Layout';
import { api } from '../lib/api';

export default function SubmitExpense() {
  const router = useRouter();
  const [f, setF] = useState({ title: '', category: '', amount: '', description: '' });
  const [files, setFiles] = useState([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (ev) => {
    ev.preventDefault(); setErr('');
    if (!files.length) return setErr('Anexe ao menos um recibo (PDF, PNG ou JPG, até 5 MB).');
    const form = new FormData();
    Object.entries(f).forEach(([k, v]) => form.append(k, v));
    files.forEach((x) => form.append('receipts', x));
    setBusy(true);
    try { await api('/expenses', { method: 'POST', form }); router.push('/dashboard'); }
    catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <Layout title="Cadastrar relatório de despesa">
      <Paper className="p-5 max-w-xl" component="form" onSubmit={submit}>
        {err && <Alert severity="error" className="mb-3">{err}</Alert>}
        <TextField label="Título" fullWidth margin="dense" required value={f.title} onChange={set('title')} inputProps={{ maxLength: 120 }} />
        <TextField label="Categoria" fullWidth margin="dense" required value={f.category} onChange={set('category')} placeholder="Ex.: Viagem, Alimentação" />
        <TextField label="Valor (R$)" type="number" fullWidth margin="dense" required value={f.amount} onChange={set('amount')} inputProps={{ min: 0.01, step: 0.01 }} />
        <TextField label="Descrição" fullWidth margin="dense" multiline minRows={3} value={f.description} onChange={set('description')} inputProps={{ maxLength: 2000 }} />
        <div className="py-3">
          <Button variant="outlined" component="label">Selecionar recibos<input hidden type="file" multiple accept="application/pdf,image/png,image/jpeg" onChange={(e) => setFiles(Array.from(e.target.files).slice(0, 5))} /></Button>
          <Typography variant="body2" className="pt-2">{files.length ? files.map((x) => x.name).join(', ') : 'Nenhum arquivo selecionado (máx. 5 arquivos de 5 MB).'}</Typography>
        </div>
        <Button type="submit" variant="contained" disabled={busy}>Enviar para validação</Button>
      </Paper>
    </Layout>
  );
}
