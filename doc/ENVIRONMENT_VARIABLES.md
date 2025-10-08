# Environment Variables for 5ik.TV

This document lists all environment variables used in the 5ik.TV project.

## Google Analytics

```bash
# Google Analytics 4 Measurement ID (for web app)
# Get this from your GA4 property
# Format: G-XXXXXXXXXX
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Google Analytics 4 Measurement ID (for server-side analytics - Roku)
# Get this from your GA4 property
# Format: G-XXXXXXXXXX
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Google Analytics 4 API Secret (for server-side analytics - Roku)
# Create this in your GA4 property under Data Streams > Measurement Protocol API secrets
GTM_API_SECRET=your_api_secret_here
```

## Setup Instructions

1. Copy your `.env` file to `.env.local` for local development
2. Add the Google Analytics Measurement ID to your environment variables
3. Restart your development server after adding new environment variables

## Google Analytics Setup

1. Go to [Google Analytics](https://analytics.google.com/)
2. Create a new GA4 property or use an existing one
3. Copy the Measurement ID (format: G-XXXXXXXXXX)
4. Add it to your `.env.local` file as shown above

## Testing

To test if Google Analytics is working:

1. Add the GA Measurement ID to your environment variables
2. Start your development server
3. Open your browser's developer tools
4. Check the console for GA-related messages
5. Use Google Analytics Real-time reports to verify events are being tracked

## Production Deployment

Make sure to add the environment variable to your production environment:

- **Vercel**: Add to Project Settings > Environment Variables
- **Other platforms**: Add to your deployment platform's environment variable settings
