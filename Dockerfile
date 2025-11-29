# Use Node.js 20 on Alpine Linux
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application
# This runs 'vite build' (frontend -> dist/public) and 'esbuild' (backend -> dist/index.js)
RUN npm run build

# Prune dev dependencies to save space (optional, but good for production)
RUN npm prune --production

# Expose port 8080 (Google Cloud Run default)
EXPOSE 8080

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Start the application
CMD ["npm", "start"]
