FROM node:20-slim

# Build tools required to compile better-sqlite3 from source
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first (layer cache)
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# SQLite data directory
RUN mkdir -p /app/data

# Make startup script executable
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

# Default port — Railway overrides via $PORT at runtime
EXPOSE 3000

CMD ["./start.sh"]
