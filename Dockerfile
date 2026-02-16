# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

COPY . .

# Install pnpm and dependencies
RUN npm install -g pnpm && rm -rf node_modules && pnpm install --frozen-lockfile

# Build the application
RUN pnpm run build

# Stage 2: Run the application
FROM node:20-alpine AS runner

WORKDIR /app

# Install pnpm (again) in runner image to handle any potential runtime dependencies or scripts if nitro needs it
# Although nitro usually bundles everything, it's safer to have pnpm available for any unforeseen scripts
RUN npm install -g pnpm

# Copy package.json from builder stage
# This is mainly for pnpm to potentially resolve any runtime scripts or dependencies if required
COPY --from=builder /app/package.json ./

# Copy the built application from the builder stage
COPY --from=builder /app/.output ./.output

# Set environment variables
ENV NODE_ENV=production

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
# Nitro output usually resides in .output/server/index.mjs
CMD ["node", ".output/server/index.mjs"]
