# RestauSync - Internet Deployment Guide

This guide explains how to configure RestauSync for internet connectivity and deployment.

## Frontend Configuration

### Environment Setup

The frontend is configured to work with internet-accessible APIs. Update the following files with your actual domain:

**`frontend/src/environments/environment.ts`** (Production)
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://your-api-domain.com/api/v1', // Replace with your actual API domain
  appName: 'RestauSync',
  // ... other config
};
```

**`frontend/src/environments/environment.development.ts`** (Development)
```typescript
export const environment = {
  production: false,
  apiUrl: 'https://your-api-domain.com/api/v1', // Replace with your actual API domain
  appName: 'RestauSync',
};
```

### Supported Hosting Platforms

The frontend works with:
- **Vercel**: Automatic deployment from GitHub
- **Netlify**: Drag & drop or Git integration
- **GitHub Pages**: With proper build configuration
- **Traditional hosting**: Upload built files to any web server

### Build Commands

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Build for development
npm run build:dev
```

## Backend Configuration

### Environment Variables

Create a `.env` file in the backend directory based on `.env.example`:

```env
# Server Configuration
PORT=4003
API_PREFIX=/api/v1
NODE_ENV=production

# Database Configuration (use cloud database for internet access)
DB_HOST=your-database-host
DB_PORT=5432
DB_USERNAME=your-username
DB_PASSWORD=your-password
DB_NAME=restausync

# JWT Configuration
JWT_SECRET=your-secure-jwt-secret

# File Upload Configuration
MAX_FILE_SIZE=5242880
UPLOAD_DIR=uploads
```

### CORS Configuration

The backend is configured to allow internet access. For production, set `NODE_ENV=production` to allow all HTTPS origins.

### Supported Hosting Platforms

- **Render**: Free tier available, automatic deployments
- **Railway**: Modern deployment platform
- **Heroku**: Traditional but reliable
- **VPS/Cloud servers**: DigitalOcean, AWS, Google Cloud, etc.

### Deployment Steps

1. **Set up your database** (PostgreSQL recommended for production)
2. **Configure environment variables** in your hosting platform
3. **Deploy the backend** to your chosen platform
4. **Update frontend environment** with the backend URL
5. **Deploy the frontend** to a static hosting service

### Database Setup

For internet deployment, use a cloud database:
- **Supabase**: Free PostgreSQL database
- **Neon**: Serverless PostgreSQL
- **PlanetScale**: MySQL-compatible
- **MongoDB Atlas**: If switching to MongoDB

### Security Considerations

1. **HTTPS Only**: Ensure all connections use HTTPS
2. **Environment Variables**: Never commit secrets to code
3. **CORS**: Properly configured for your domain only in production
4. **Database**: Use connection pooling and prepared statements
5. **File Uploads**: Implement proper validation and storage limits

### Testing Internet Connectivity

1. **Backend**: Test API endpoints with tools like Postman or curl
2. **Frontend**: Build and serve locally, then test with production API URL
3. **Database**: Verify connection and data persistence
4. **File Uploads**: Test image uploads and serving

### Common Issues

1. **CORS Errors**: Check allowed origins in backend configuration
2. **Database Connection**: Verify credentials and network access
3. **File Uploads**: Ensure upload directory is writable and accessible
4. **Environment Variables**: Confirm all required variables are set

### Monitoring

Consider adding monitoring services:
- **Uptime monitoring**: UptimeRobot, Pingdom
- **Error tracking**: Sentry, Rollbar
- **Performance monitoring**: New Relic, DataDog

## Quick Start for Internet Deployment

1. **Choose hosting platforms** (e.g., Render for backend, Vercel for frontend)
2. **Set up database** (Supabase recommended for simplicity)
3. **Deploy backend** with environment variables
4. **Update frontend** with backend URL
5. **Deploy frontend** to static hosting
6. **Test all functionality** end-to-end

For detailed setup instructions for specific platforms, check the documentation of your chosen hosting service.