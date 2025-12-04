# Use a stable Node version
FROM node:22-alpine

# Create app directory
WORKDIR /app

# Copy package files first (better caching)
COPY package*.json ./

# Install dependencies
RUN npm install --production=false

# Copy rest of app
COPY . .

# Build TypeScript -> JavaScript
RUN npm run build

# Switch to production mode for final run
RUN npm prune --production

# Set correct CMD
CMD ["node", "dist/server.js"]
