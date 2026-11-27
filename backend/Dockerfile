FROM node:22-alpine

WORKDIR /app/backend
ENV NODE_ENV=production
ENV PORT=3002

COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node backend/ ./
COPY --chown=node:node shared/ /app/shared/

USER node
EXPOSE 3002
CMD ["node", "server.js"]
