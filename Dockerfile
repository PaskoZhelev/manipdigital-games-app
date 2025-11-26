# --- Stage 1: Build the App ---
FROM node:24-alpine as builder

WORKDIR /app

# Install dependencies (no --production flag needed here)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code and build (using build:no-check from previous steps)
COPY . .
RUN npm run build:no-check

# --- Stage 2: Serve with Nginx ---
FROM nginx:alpine

# Copy the custom nginx config for subpath routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the build output from Stage 1. 
# We copy the entire 'dist' folder to the Nginx root directory.
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose the default HTTP port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]