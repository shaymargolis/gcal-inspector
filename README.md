# Google Calendar Inspector

A web-based tool for inspecting and analyzing Google Calendar events with advanced search and export capabilities.

## Features

- **Google Calendar Integration**: Connect to your Google Calendar using OAuth2 authentication
- **Multi-Calendar Support**: View and search across all your calendars
- **Advanced Event Search**: 
  - Search by event title, description, or location
  - Search by attendee, creator, or organizer email addresses
  - Server-side and client-side filtering for precise results
- **Event Inspection**: View detailed event information in a structured format
- **Event Lookup**: Fetch specific events by their unique ID
- **CSV Export**: Export event lists and individual event details to CSV format
- **Upcoming Events Filter**: Option to show only upcoming events or all events

## Setup

### Prerequisites

- Node.js (version 16 or higher)
- A Google Cloud Project with Calendar API enabled

### Dependencies

This application uses Material-UI (MUI) for the user interface components:
- `@mui/material` - Core Material-UI components
- `@mui/icons-material` - Material Design icons
- `@emotion/react` & `@emotion/styled` - Styling engine for MUI

### Installation

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd gcal-inspector
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up Google OAuth2 credentials:
   - Go to the [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select an existing one
   - Enable the Google Calendar API
   - Create OAuth 2.0 credentials (Web application type)
   - Add `http://localhost:5173` to the authorized JavaScript origins
   - Copy your Client ID

4. Create a `.env` file in the project root:
   ```env
   VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open your browser and navigate to `http://localhost:5173`

## Usage

1. **Sign In**: Click "Sign in with Google" to authenticate with your Google account
2. **Select Calendar**: Choose which calendar to inspect from the dropdown
3. **Search Events**: Use the search inputs to filter events by title/description or email addresses
4. **View Event Details**: Click on any event in the list to see its full details
5. **Export Data**: Use the CSV export buttons to download event data
6. **Fetch by ID**: Enter a specific event ID to look up a particular event

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Project Structure

- `src/App.jsx` - Main application component with all functionality (built with Material-UI)
- `public/` - Static assets
- `index.html` - HTML template

## Security

This application:
- Uses OAuth2 for secure Google API authentication
- Runs entirely in the browser (no server-side code)
- Never stores your credentials or calendar data
- Only requests read-only access to your calendars

## API Permissions

The application requests the following Google Calendar API permissions:
- `https://www.googleapis.com/auth/calendar.readonly` - Read-only access to calendar events

## License

This project is private and not intended for distribution.
