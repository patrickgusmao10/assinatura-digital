import { useEffect, useState } from 'react';
import { Table, TableHead, TableRow, TableCell, TableBody, Paper, TableContainer, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Alert, Chip, FormControlLabel, Switch } from '@mui/material';
import Layout from '../components/Layout';
import { api } from '../lib/api';

const empty = { name: '', email: '', password: '', role: 'employee', active: true };
export default function Employees() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(null); // null = fechado; {_id?} = criar/editar
  const [msg, setMsg] = useState(null);
  const load = () => api('/employees').then(setList).catch((e) => setMsg({ s: 'error', t: e.message }));
  useEffect(() => { load(); }, []);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const save = async () => {
    try {
      if (form._id) await api(`/employees/${form._id}`, { method: 'PUT', body: { name: form.name, email: form.email, role: form.role, active: form.active } });
      else await api('/employees', { method: 'POST', body: { name: form.name, email: form.email, password: form.password, role: form.role } });
      setForm(null); setMsg({ s: 'success', t: 'Funcionário salvo.' }); load();
    } catch (e) { setMsg({ s: 'error', t: e.message }); }
  };
  const remove = async (u) => {
    if (!confirm(`Excluir ${u.name}? Se houver documentos vinculados, o usuário será apenas desativado.`)) return;
    try { const r = await api(`/employees/${u._id}`, { method: 'DELETE' }); setMsg({ s: 'success', t: r.deactivated ? 'Usuário possui documentos: foi desativado.' : 'Funcionário excluído.' }); load(); }
    catch (e) { setMsg({ s: 'error', t: e.message }); }
  };
  return (
    <Layout title="Funcionários" managerOnly>
      {msg && <Alert severity={msg.s} onClose={() => setMsg(null)} className="mb-3">{msg.t}</Alert>}
      <Button variant="contained" className="mb-3" onClick={() => setForm({ ...empty })}>Cadastrar funcionário</Button>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead><TableRow><TableCell>Nome</TableCell><TableCell>E-mail</TableCell><TableCell>Perfil</TableCell><TableCell>Situação</TableCell><TableCell>Impressão digital da chave</TableCell><TableCell /></TableRow></TableHead>
          <TableBody>
            {list.map((u) => (
              <TableRow key={u._id} hover>
                <TableCell>{u.name}</TableCell><TableCell>{u.email}</TableCell>
                <TableCell>{u.role === 'manager' ? 'Gerente' : 'Funcionário'}</TableCell>
                <TableCell><Chip size="small" label={u.active ? 'Ativo' : 'Inativo'} color={u.active ? 'success' : 'default'} /></TableCell>
                <TableCell><code>{u.fingerprint?.slice(0, 16)}…</code></TableCell>
                <TableCell align="right"><Button size="small" onClick={() => setForm({ ...u })}>Editar</Button><Button size="small" color="error" onClick={() => remove(u)}>Excluir</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Dialog open={!!form} onClose={() => setForm(null)} fullWidth maxWidth="xs">
        <DialogTitle>{form?._id ? 'Editar funcionário' : 'Cadastrar funcionário'}</DialogTitle>
        <DialogContent>
          <TextField label="Nome" fullWidth margin="dense" value={form?.name || ''} onChange={set('name')} />
          <TextField label="E-mail" type="email" fullWidth margin="dense" value={form?.email || ''} onChange={set('email')} />
          {!form?._id && <TextField label="Senha (mín. 10 caracteres)" type="password" fullWidth margin="dense" value={form?.password || ''} onChange={set('password')} helperText="Também protege a chave privada de assinatura do usuário." />}
          <TextField select label="Perfil" fullWidth margin="dense" value={form?.role || 'employee'} onChange={set('role')}>
            <MenuItem value="employee">Funcionário</MenuItem><MenuItem value="manager">Gerente</MenuItem>
          </TextField>
          {form?._id && <FormControlLabel control={<Switch checked={!!form.active} onChange={set('active')} />} label="Ativo" />}
        </DialogContent>
        <DialogActions><Button onClick={() => setForm(null)}>Cancelar</Button><Button variant="contained" onClick={save}>Salvar</Button></DialogActions>
      </Dialog>
    </Layout>
  );
}
