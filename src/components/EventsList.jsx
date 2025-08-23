import {
  Box,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  Typography,
  CircularProgress
} from '@mui/material'
import {
  Event as EventIcon
} from '@mui/icons-material'
import { formatDateRange } from '../utils/helpers.js'

export function EventsList({ 
  loading, 
  filteredEvents, 
  onPickListEvent 
}) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={2}>
          <EventIcon />
          <Typography variant="h6">
            Events {loading ? '· Loading…' : `· ${filteredEvents.length}`}
          </Typography>
          {loading && <CircularProgress size={20} />}
        </Box>
        
        {!loading && filteredEvents.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No events match your filters.
          </Typography>
        )}
        
        <List sx={{ maxHeight: 350, overflow: 'auto' }}>
          {filteredEvents.map(ev => (
            <ListItem
              key={ev.id}
              button
              onClick={() => onPickListEvent(ev)}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                mb: 1,
                '&:hover': {
                  borderColor: 'primary.main',
                },
              }}
            >
              <ListItemText
                primary={ev.summary || '(no title)'}
                secondary={
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      {formatDateRange(ev.start, ev.end)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {ev.creator?.email || 'unknown'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                      {ev.id}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  )
}
