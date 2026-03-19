FROM node:20-slim

WORKDIR /app

RUN npm install -g pnpm

# モノレポのワークスペース設定をコピー
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# 依存関係インストール
RUN pnpm install --frozen-lockfile --filter @nightops/api...

# Prismaクライアント生成
RUN cd apps/api && npx prisma generate

# ビルド
RUN cd apps/api && npx nest build

EXPOSE 3000

CMD ["node", "apps/api/dist/main.js"]
