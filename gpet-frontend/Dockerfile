FROM node:26.13.0-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.30.2-alpine
COPY --from=build /app/dist/gpet-frontend/browser /usr/share/nginx/html
COPY nginx/security.conf /etc/nginx/gpet-security.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
HEALTHCHECK --interval=20s --timeout=3s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
