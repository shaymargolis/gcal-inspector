import {
  Box,
  Card,
  CardContent,
  Button,
  Typography
} from '@mui/material'
import {
  OpenInNew as OpenInNewIcon
} from '@mui/icons-material'
import { KeyValueTable } from './KeyValueTable.jsx'

export function EventDetails({ eventObj }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" mb={2}>
          Event details
        </Typography>
        
        {!eventObj ? (
          <Typography variant="body2" color="text.secondary">
            Select an event from the list, or fetch by ID.
          </Typography>
        ) : (
          <>
            <Box display="flex" alignItems="center" gap={2} mb={2} flexWrap="wrap">
              <Button
                variant="contained"
                startIcon={<OpenInNewIcon />}
                href={eventObj.htmlLink}
                target="_blank"
                rel="noreferrer"
                size="small"
              >
                Open in Google Calendar
              </Button>
              <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                ID: {eventObj.id}
              </Typography>
            </Box>
            <KeyValueTable obj={eventObj} />
          </>
        )}
      </CardContent>
    </Card>
  )
}
