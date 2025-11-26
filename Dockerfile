# Stage 1: Build
FROM node:25-alpine as builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# This builds the app using the 'base' URL defined in vite.config.ts
RUN npm run build

# Stage 2: Serve
FROM nginx:alpine

# Clean default nginx files
RUN rm -rf /usr/share/nginx/html/*

# Create the directory structure matching your URL
# This is a robust way to ensure Nginx finds files at /games/app/symbiomes/...
RUN mkdir -p /usr/share/nginx/html/games/app/symbiomes

# Copy build artifacts to that specific subfolder
COPY --from=builder /app/dist /usr/share/nginx/html/games/app/symbiomes

# Copy custom Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]