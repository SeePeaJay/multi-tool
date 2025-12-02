# --- Builder stage ---
ARG NODE_VERSION=20.18.0
FROM node:${NODE_VERSION}-alpine AS builder

WORKDIR /app

# Copy manifests first for better caching
COPY package*.json ./
COPY client/package*.json client/
COPY server/package*.json server/
COPY shared/package*.json shared/

# Install all workspace dependencies
RUN npm ci

# Copy remaining source code
COPY . .

# Define build-time arguments for client environment variables
ARG VITE_COLLAB_URL
ENV VITE_COLLAB_URL=$VITE_COLLAB_URL
ARG VITE_CLIENT_ID
ENV VITE_CLIENT_ID=$VITE_CLIENT_ID

# Run your existing build script (builds shared + client, copies dist into server)
RUN npm run build

# --- Runtime stage ---
FROM node:${NODE_VERSION}-alpine AS runtime

WORKDIR /app

# Copy only what’s needed at runtime
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared/dist ./shared/dist
COPY package*.json ./
COPY server/package*.json server/
COPY shared/package*.json shared/

# Install only production dependencies and setup symlinks for server
RUN npm ci --omit=dev --workspace server --workspace shared

EXPOSE 3000
CMD ["npm", "run", "start"]