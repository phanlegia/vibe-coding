FROM node:22-slim
WORKDIR /app
COPY . .
ENV NODE_ENV=production DB_FILE=/data/data.sqlite PORT=3000
VOLUME /data
EXPOSE 3000
CMD ["node", "--disable-warning=ExperimentalWarning", "server.js"]
