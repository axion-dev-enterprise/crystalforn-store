FROM node:24-alpine
WORKDIR /app
COPY . .
RUN npm ci --workspace @digital-store/api
ENV NODE_ENV=production
ENV PORT=4000
RUN npm run build --workspace @digital-store/api
RUN chown -R node:node /app
USER node
EXPOSE 4000
CMD ["npm", "run", "start", "--workspace", "@digital-store/api"]
