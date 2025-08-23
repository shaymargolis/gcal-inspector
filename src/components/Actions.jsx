import {
  Card,
  CardContent,
  Grid,
  Stack,
  TextField,
  Button
} from '@mui/material'
import {
  Download as DownloadIcon
} from '@mui/icons-material'

export function Actions({ 
  eventIdInput, 
  setEventIdInput, 
  onFetchById, 
  onExportEventsCsv, 
  onExportEventCsv, 
  eventObj 
}) {
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={6}>
            <Stack direction="row" spacing={2} alignItems="center">
              <TextField
                placeholder="Event ID (optional)"
                value={eventIdInput}
                onChange={(e) => setEventIdInput(e.target.value)}
                sx={{ minWidth: 280 }}
              />
              <Button variant="contained" onClick={onFetchById}>
                Fetch by ID
              </Button>
            </Stack>
          </Grid>
          <Grid item xs={12} md={6}>
            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={onExportEventsCsv}
              >
                Export Events CSV
              </Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={onExportEventCsv}
                disabled={!eventObj}
              >
                Export Selected Event CSV
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}
