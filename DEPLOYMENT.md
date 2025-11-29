# Deployment Guide - MediInsightViz

This guide covers deploying MediInsightViz to various platforms.

## Table of Contents
- [Replit Deployment](#replit-deployment)
- [Vercel Deployment](#vercel-deployment)
- [Heroku Deployment](#heroku-deployment)
- [Docker Deployment](#docker-deployment)
- [Traditional VPS Deployment](#traditional-vps-deployment)

---

## Replit Deployment

### Using Replit's Built-in Publishing

1. **Click the "Publish" button** in your Replit workspace
2. **Configure your deployment**:
   - Choose a custom domain (optional)
   - Set environment variables in Replit Secrets:
     - `OPENAI_API_KEY`
     - `SESSION_SECRET`
3. **Click "Publish"** and your app will be live

### Environment Variables in Replit
- Go to Tools → Secrets
- Add:
  - `OPENAI_API_KEY` = your OpenAI API key
  - `SESSION_SECRET` = random secret string

---

## Vercel Deployment

### Prerequisites
- Vercel account
- GitHub repository

### Steps

1. **Prepare your project**:
```bash
# Create vercel.json
cat > vercel.json << EOF
{
  "version": 2,
  "builds": [
    {
      "src": "server/index.ts",
      "use": "@vercel/node"
    },
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist/public"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "server/index.ts"
    },
    {
      "src": "/(.*)",
      "dest": "/dist/public/$1"
    }
  ]
}
EOF
```

2. **Update package.json scripts**:
```json
{
  "scripts": {
    "build": "npm run build:frontend && npm run build:backend",
    "build:frontend": "vite build",
    "build:backend": "esbuild server/index.ts --bundle --platform=node --outfile=dist/server.js",
    "vercel-build": "npm run build"
  }
}
```

3. **Deploy**:
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables
vercel env add OPENAI_API_KEY
vercel env add SESSION_SECRET

# Deploy to production
vercel --prod
```

---

## Heroku Deployment

### Prerequisites
- Heroku account
- Heroku CLI installed

### Steps

1. **Create Procfile**:
```bash
echo "web: npm start" > Procfile
```

2. **Update package.json**:
```json
{
  "scripts": {
    "start": "NODE_ENV=production node dist/server.js",
    "build": "npm run build:frontend && npm run build:backend",
    "build:frontend": "vite build",
    "build:backend": "esbuild server/index.ts --bundle --platform=node --outfile=dist/server.js"
  },
  "engines": {
    "node": "18.x"
  }
}
```

3. **Deploy**:
```bash
# Login to Heroku
heroku login

# Create app
heroku create mediinsightviz

# Set environment variables
heroku config:set OPENAI_API_KEY=your_key_here
heroku config:set SESSION_SECRET=your_secret_here
heroku config:set NODE_ENV=production

# Deploy
git push heroku main

# Open app
heroku open
```

---

## Docker Deployment

### Create Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Build the application
RUN npm run build

# Expose port
EXPOSE 5000

# Set environment to production
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
```

### Create .dockerignore

```
node_modules
dist
.git
.env
attached_assets
*.log
```

### Create docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - SESSION_SECRET=${SESSION_SECRET}
    restart: unless-stopped
```

### Deploy

```bash
# Build image
docker build -t mediinsightviz .

# Run container
docker run -p 5000:5000 \
  -e OPENAI_API_KEY=your_key \
  -e SESSION_SECRET=your_secret \
  mediinsightviz

# Or use docker-compose
docker-compose up -d
```

---

## Traditional VPS Deployment

### Prerequisites
- Ubuntu 20.04+ server
- Domain name (optional)
- SSH access

### Steps

1. **Connect to your server**:
```bash
ssh user@your-server-ip
```

2. **Install Node.js**:
```bash
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

3. **Install PM2** (process manager):
```bash
sudo npm install -g pm2
```

4. **Clone and setup your application**:
```bash
# Clone repository
git clone https://github.com/mnikor/MediInsightViz.git
cd MediInsightViz

# Install dependencies
npm install

# Build application
npm run build
```

5. **Create environment file**:
```bash
cat > .env << EOF
NODE_ENV=production
OPENAI_API_KEY=your_openai_api_key
SESSION_SECRET=your_random_secret
EOF
```

6. **Start with PM2**:
```bash
# Start application
pm2 start npm --name "mediinsightviz" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

7. **Setup Nginx reverse proxy** (optional):
```bash
# Install Nginx
sudo apt install nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/mediinsightviz
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:
```bash
# Enable configuration
sudo ln -s /etc/nginx/sites-available/mediinsightviz /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

8. **Setup SSL with Let's Encrypt** (optional):
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is setup automatically
```

---

## Environment Variables

All deployment methods require these environment variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | Your OpenAI API key | ✅ Yes |
| `SESSION_SECRET` | Random secret for sessions | ✅ Yes |
| `NODE_ENV` | Set to `production` | ✅ Yes |
| `PORT` | Port to run on (default: 5000) | ❌ No |

---

## Build Commands

### For all deployments:

```json
{
  "scripts": {
    "build": "npm run build:frontend && npm run build:backend",
    "build:frontend": "vite build",
    "build:backend": "esbuild server/index.ts --bundle --platform=node --outfile=dist/server.js",
    "start": "NODE_ENV=production node dist/server.js"
  }
}
```

---

## Post-Deployment Checklist

- [ ] Environment variables configured correctly
- [ ] Application starts without errors
- [ ] File upload works (test with sample PDF)
- [ ] AI analysis returns results
- [ ] Charts render correctly
- [ ] Export functions work (PNG, SVG, PDF, PPT)
- [ ] Dark mode toggles properly
- [ ] SSL certificate installed (for production)
- [ ] Monitoring setup (optional: PM2, DataDog, etc.)
- [ ] Backup strategy in place

---

## Monitoring & Maintenance

### Using PM2 (VPS deployment)
```bash
# View logs
pm2 logs mediinsightviz

# Monitor resources
pm2 monit

# Restart application
pm2 restart mediinsightviz

# Update application
git pull
npm install
npm run build
pm2 restart mediinsightviz
```

### Health Check Endpoint
Add this to your Express server for monitoring:

```typescript
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  });
});
```

---

## Troubleshooting

### Common Issues

**1. Build fails**
- Ensure Node.js version is 18+
- Run `npm install` before building
- Check for TypeScript errors

**2. AI analysis not working**
- Verify `OPENAI_API_KEY` is set correctly
- Check OpenAI API quota/limits
- Review server logs for errors

**3. File uploads fail**
- Check file size limits (10MB default)
- Verify MIME type validation
- Ensure temp directory has write permissions

**4. Port already in use**
- Change port in environment: `PORT=3000`
- Kill existing process on port 5000

---

## Scaling Considerations

### For high traffic:

1. **Load Balancing**: Use Nginx or cloud load balancer
2. **Database**: Migrate from in-memory to PostgreSQL
3. **File Storage**: Use S3/cloud storage instead of local
4. **API Rate Limiting**: Implement rate limits for OpenAI calls
5. **Caching**: Add Redis for session/data caching
6. **CDN**: Serve static assets via CDN

---

## Support

For deployment issues:
- Check server logs
- Review this guide
- Open GitHub issue
- Contact support

**Happy Deploying! 🚀**
