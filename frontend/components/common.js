import { Chip, Typography, Link as MLink, Box } from '@mui/material';
import { receiptUrl } from '../lib/api';

export const brl = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const dt = (d) => (d ? new Date(d).toLocaleString('pt-BR') : '-');
const S = { pending: ['Pendente de validação', 'warning'], validated: ['Validado (aguardando assinatura)', 'info'], rejected: ['Rejeitado', 'error'], signed: ['Assinado', 'success'] };
export const StatusChip = ({ status }) => <Chip size="small" label={S[status]?.[0] || status} color={S[status]?.[1] || 'default'} />;

export function ExpenseDetails({ e }) {
  const row = (k, v) => <Typography key={k} className="py-1"><b>{k}:</b> {v}</Typography>;
  return (
    <Box>
      {row('Título', e.title)}
      {row('Categoria', e.category)}
      {row('Valor', brl(e.amount))}
      {row('Descrição', e.description || '-')}
      {row('Enviado por', e.submittedBy?.name)}
      {row('Data de envio', dt(e.createdAt))}
      {row('Status', <StatusChip status={e.status} />)}
      {e.validation?.at && row('Validação', `${e.validation.by?.name || ''} em ${dt(e.validation.at)}${e.validation.note ? ' - ' + e.validation.note : ''}`)}
      <Typography className="pt-2"><b>Recibos:</b></Typography>
      {e.receipts.map((r, i) => (
        <Typography key={i}><MLink href={receiptUrl(e._id, i)} target="_blank" rel="noopener noreferrer">{r.originalName}</MLink> <small>(SHA-256 {r.sha256.slice(0, 16)}…)</small></Typography>
      ))}
    </Box>
  );
}
