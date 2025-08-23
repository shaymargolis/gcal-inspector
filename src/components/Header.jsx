import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Typography,
  Alert
} from '@mui/material'
import {
  Google as GoogleIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  Event as EventIcon
} from '@mui/icons-material'

export function Header({ ready, authed, profile, signIn, signOut }) {
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="h4" component="h1">
              Google Calendar Inspector
            </Typography>
            {profile?.email && (
              <Chip 
                icon={<PersonIcon />} 
                label={profile.email} 
                variant="outlined" 
                size="small"
              />
            )}
          </Box>
          <Box>
            {!authed ? (
              <Button
                variant="contained"
                startIcon={<GoogleIcon />}
                disabled={!ready}
                onClick={signIn}
                size="large"
              >
                Sign in with Google
              </Button>
            ) : (
              <Button
                variant="outlined"
                startIcon={<LogoutIcon />}
                onClick={signOut}
              >
                Sign out
              </Button>
            )}
          </Box>
        </Box>

        {!authed && (
          <>
            <Alert severity="info" sx={{ mt: 3, mb: 2 }}>
              <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>
                What is Google Calendar Inspector?
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                A free web tool that helps you analyze and export your Google Calendar events. 
                Search through your calendar events by title, description, location, or attendee emails. 
                Export your calendar data to CSV format for further analysis or backup purposes. 
                Find specific events by their unique ID and view detailed event information. 
                Perfect for calendar management, data extraction, and event analysis.
              </Typography>
            </Alert>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SearchIcon color="primary" fontSize="small" />
                <Typography variant="body2" color="text.secondary">
                  Search events by title, description, or location
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EventIcon color="primary" fontSize="small" />
                <Typography variant="body2" color="text.secondary">
                  Find events by specific ID
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DownloadIcon color="primary" fontSize="small" />
                <Typography variant="body2" color="text.secondary">
                  Export to CSV format
                </Typography>
              </Box>
            </Box>
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontStyle: 'italic' }}>
              Sign in with your Google account to start inspecting your calendars.
            </Typography>
          </>
        )}
      </CardContent>
    </Card>
  )
}
