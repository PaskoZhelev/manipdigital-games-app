FROM node:25-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./

RUN npm ci

# Copy source code and run build
COPY . .

# Run the build command
RUN npm run build:no-check

# We stop here. The only thing we care about is the /app/dist folder.