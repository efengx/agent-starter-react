# ==================================
# Stage 1: Builder - 构建阶段
# ==================================
FROM node:22.16.0-alpine AS builder

WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install
COPY . .
RUN pnpm build

# ==================================
# Stage 2: Runner - 生产阶段
# ==================================
FROM node:22.16.0-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# 【关键修复-1】: 在生产镜像中也全局安装 pnpm
RUN npm install -g pnpm

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=builder /app/public ./public
# 确保这个配置文件名是正确的
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules

# 【关键修复-2】: 更改文件所有权
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

# 现在 pnpm 命令是可用的
CMD ["pnpm", "start"]