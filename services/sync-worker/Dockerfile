FROM node:24-alpine
WORKDIR /app
COPY . .
RUN npm ci --workspace @digital-store/sync-worker
RUN npm run build --workspace @digital-store/sync-worker
ENV NODE_ENV=production
RUN chown -R node:node /app
USER node
CMD ["npm", "run", "start", "--workspace", "@digital-store/sync-worker"]
