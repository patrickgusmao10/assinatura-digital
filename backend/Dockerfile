FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY src ./src
RUN mkdir -p /data/uploads && chown -R node:node /data /app
USER node
EXPOSE 4000
CMD ["node", "src/server.js"]
