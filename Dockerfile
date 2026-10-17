FROM node:22-alpine
WORKDIR /app
# PORT is injected by most hosts. TRUST_PROXY makes rate limiting use the real client IP behind their proxy.
# DB_PATH must live on a persistent volume, otherwise saved data is lost when the container is replaced.
ENV NODE_ENV=production PORT=8080 TRUST_PROXY=1 DB_PATH=/data/gigsaathi.db
COPY package.json server.js ./
COPY lib ./lib
COPY public ./public
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/api/health || exit 1
CMD ["node", "--disable-warning=ExperimentalWarning", "server.js"]
