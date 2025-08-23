import { useMemo } from 'react'
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from '@mui/material'
import { flattenObject } from '../utils/helpers.js'

function renderValue(v) {
  if (v === null) return <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>null</Typography>
  if (v === undefined) return <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>undefined</Typography>
  if (typeof v === 'object') return (
    <Box
      component="pre"
      sx={{
        margin: 0,
        whiteSpace: 'pre-wrap',
        overflowWrap: 'anywhere',
        maxHeight: 150,
        overflow: 'auto',
        bgcolor: 'background.default',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        p: 1,
        fontSize: '0.7rem',
      }}
    >
      {JSON.stringify(v, null, 2)}
    </Box>
  )
  return <Typography variant="body2" sx={{ fontSize: '0.75rem', wordBreak: 'break-word' }}>{String(v)}</Typography>
}

export function KeyValueTable({ obj }) {
  const rows = useMemo(() => flattenObject(obj), [obj])
  return (
    <TableContainer component={Paper} sx={{ maxHeight: 350 }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold', color: 'primary.main', fontSize: '0.75rem' }}>Field</TableCell>
            <TableCell sx={{ fontWeight: 'bold', color: 'primary.main', fontSize: '0.75rem' }}>Value</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(([k, v]) => (
            <TableRow key={k}>
              <TableCell component="th" sx={{ fontWeight: 'bold', width: '25%', fontSize: '0.75rem', wordBreak: 'break-word' }}>
                {k}
              </TableCell>
              <TableCell sx={{ fontSize: '0.75rem', wordBreak: 'break-word', maxWidth: 0 }}>
                {renderValue(v)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
