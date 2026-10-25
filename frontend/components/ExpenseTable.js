import { Table, TableHead, TableRow, TableCell, TableBody, Paper, TableContainer, Typography } from '@mui/material';
import { StatusChip, brl, dt } from './common';

// actions(e) devolve os botões de cada linha
export default function ExpenseTable({ rows, actions, empty = 'Nenhum documento.' }) {
  if (!rows) return null;
  if (!rows.length) return <Typography color="text.secondary">{empty}</Typography>;
  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead><TableRow><TableCell>Título</TableCell><TableCell>Enviado por</TableCell><TableCell>Valor</TableCell><TableCell>Data</TableCell><TableCell>Status</TableCell>{actions && <TableCell />}</TableRow></TableHead>
        <TableBody>
          {rows.map((e) => (
            <TableRow key={e._id} hover>
              <TableCell>{e.title}</TableCell><TableCell>{e.submittedBy?.name}</TableCell><TableCell>{brl(e.amount)}</TableCell><TableCell>{dt(e.createdAt)}</TableCell>
              <TableCell><StatusChip status={e.status} /></TableCell>
              {actions && <TableCell align="right">{actions(e)}</TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
