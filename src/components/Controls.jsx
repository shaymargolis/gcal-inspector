import {
  Card,
  CardContent,
  Grid,
  Stack,
  TextField,
  FormControlLabel,
  Checkbox,
  Button,
  IconButton,
  InputAdornment,
  MenuItem
} from '@mui/material'
import {
  Search as SearchIcon,
  Clear as ClearIcon
} from '@mui/icons-material'

export function Controls({ 
  calendars, 
  selectedCalId, 
  setSelectedCalId, 
  showOnlyNext, 
  setShowOnlyNext,
  titleQuery,
  setTitleQuery,
  emailQuery,
  setEmailQuery,
  onApplySearch,
  onClearSearch
}) {
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Grid container spacing={3} alignItems="flex-end">
          <Grid item xs={12} md={6}>
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
              <TextField
                select
                label="Calendar"
                value={selectedCalId}
                onChange={(e) => setSelectedCalId(e.target.value)}
                sx={{ minWidth: 200 }}
              >
                {calendars.map(c => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.summary} {c.primary ? '(primary)' : ''}
                  </MenuItem>
                ))}
              </TextField>

              <FormControlLabel
                control={
                  <Checkbox
                    checked={showOnlyNext}
                    onChange={(e) => setShowOnlyNext(e.target.checked)}
                  />
                }
                label="Only upcoming"
              />
            </Stack>
          </Grid>

          <Grid item xs={12} md={6}>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <TextField
                placeholder="Search title / description / location"
                value={titleQuery}
                onChange={(e) => setTitleQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 260 }}
              />
              <TextField
                placeholder="Search by emails"
                value={emailQuery}
                onChange={(e) => setEmailQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 260 }}
              />
              <Button variant="contained" onClick={onApplySearch}>
                Search
              </Button>
              <IconButton onClick={onClearSearch} color="inherit">
                <ClearIcon />
              </IconButton>
            </Stack>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}
