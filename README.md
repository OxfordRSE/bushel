# FigShare Integration Interface

A Next.js application for interacting with the FigShare API, providing a user interface for managing research data repositories.

## Setup

```bash
# Install dependencies
bun install

# Set up environment variables
cp .env.example .env.local

# Run development server
bun dev
```

## Environment Variables

`NEXT_PUBLIC_MOCK_FIGSHARE_API`: Set to 'true' to use mock API endpoints
`NEXT_PUBLIC_FIGSHARE_CLIENT_ID`: Your FigShare OAuth client ID
`NEXT_PUBLIC_APP_URL`: Application URL (e.g., http://localhost:3000)

## Development

Uses local mock endpoints under /api/figshare_mock
Simulates OAuth flow locally
Provides test data for development

## Production Mode

Connects to live FigShare API endpoints
Requires valid OAuth credentials
Uses real FigShare authentication flow

## Project Structure

```plaintext
src/
  app/
    api/
      figshare_mock/  # Mock API endpoints
    auth/
      callback/       # OAuth callback handling
    page.tsx         # Main application page
  components/        # React components
  lib/
    config.ts        # Environment configuration
```

## UI Components
Built using:

- shadcn/ui for component library
- Tailwind CSS for styling
- Lucide React for icons

In collaboration with Claude AI's Sonnet model.
