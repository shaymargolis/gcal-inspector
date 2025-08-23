import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Typography
} from '@mui/material'
import {
  Google as GoogleIcon,
  Logout as LogoutIcon,
  Person as PersonIcon
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
          <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
            Sign in to load your calendars.
          </Typography>
        )}
      </CardContent>
    </Card>
  )
}
