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

RUN mkdir -p /usr/share/nginx/html/games/app
COPY --from=builder /app/dist/ /usr/share/nginx/html/games/app/

# Expose the default HTTP port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]