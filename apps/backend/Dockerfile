FROM directus/directus:11.9.3


# Switch to root user to install packages
USER root

# Install Git using apk
RUN apk update && \
    apk add git


# Install required dependencies for Puppeteer
RUN apk update && apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    udev \
    dbus \
    curl
# Set environment variables for Puppeteer
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true


# Switch back to the 'node' user for safety
USER node

USER root
RUN corepack enable
USER node

RUN corepack enable && \
    corepack prepare pnpm@8.6.12 --activate

RUN pnpm install directus-extension-sync@3.0.3

RUN pnpm install directus-extension-flow-manager@1.4.1

# set environment variables for Directus: MARKETPLACE_TRUST=all
ENV MARKETPLACE_TRUST=all