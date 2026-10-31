FROM node:24-alpine
WORKDIR /app
ARG STOREFRONT_CATALOG_MODE=demo
COPY . .
RUN npm ci --workspace @digital-store/web
ENV NODE_ENV=production
ENV PORT=3000
ENV INTERNAL_API_ORIGIN=http://api:4000
ENV STOREFRONT_CATALOG_MODE=$STOREFRONT_CATALOG_MODE
RUN npm run build --workspace @digital-store/web
RUN chown -R node:node /app
USER node
EXPOSE 3000
CMD ["npm", "run", "start", "--workspace", "@digital-store/web"]
