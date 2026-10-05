# syntax=docker/dockerfile:1
# Board-Server im Container. Laufzeit: tsx (ohnehin Produktionsabhängigkeit) – kein separater Build-Schritt,
# dadurch identisches Verhalten wie `npm start`. Bildvorschauen (HEIC) laufen per WASM, keine nativen Module.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# nur Produktionsabhängigkeiten; esbuild (für tsx) bringt sein Binary als plattformspezifisches optionales Paket mit
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund && npm cache clean --force

FROM node:22-alpine
ENV NODE_ENV=production \
    AB_HOST=0.0.0.0 \
    AB_PORT=4317 \
    AB_DATA_DIR=/data \
    AB_IN_CONTAINER=1
WORKDIR /app
COPY --from=deps --chown=root:root /app/node_modules ./node_modules
COPY --chown=root:root package.json ./
COPY --chown=root:root src ./src
# Daten gehören dem unprivilegierten Nutzer „node“ (UID 1000 aus dem Basis-Image)
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 4317
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.AB_PORT||4317)+'/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
CMD ["node", "--import", "tsx", "src/server/index.ts"]
