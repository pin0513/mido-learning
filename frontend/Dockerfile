FROM node:22-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_API_URL

ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# 知識地圖旗標：靜態詳細頁在 build 時讀（docs/kp-db-restructure.md 第 17 節）。
# 正式值只從 .github/workflows/deploy-frontend.yml 的 KP_BUILD_FLAGS 傳進來；執行時的值是同一處的 KP_RUNTIME_FLAGS。
# 沒傳就是空字串，等同「關」，和以前不帶任何 KP_* 的 build 一樣。只放在 builder，不進最後的 image。
ARG KP_ENABLED
ARG KP_HOME_ENABLED
ARG KP_SOFTSKILLS_ENABLED
ARG KP_YUWEN_ENABLED
ARG KP_DETAIL_V2_ENABLED
ENV KP_ENABLED=$KP_ENABLED
ENV KP_HOME_ENABLED=$KP_HOME_ENABLED
ENV KP_SOFTSKILLS_ENABLED=$KP_SOFTSKILLS_ENABLED
ENV KP_YUWEN_ENABLED=$KP_YUWEN_ENABLED
ENV KP_DETAIL_V2_ENABLED=$KP_DETAIL_V2_ENABLED

RUN corepack enable && corepack prepare pnpm@9 --activate
RUN pnpm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# 動態首頁（/city-home）在請求時讀 content/：知識點 YAML、taxonomy、schema，
# 以及 content/home-disciplines.yaml。後者 build 不會打開，檔案追蹤不會帶走，
# 正式 image 缺檔時 GET / 會 500。整份 content 放到行程讀的 /app/content。
COPY --from=builder --chown=nextjs:nodejs /app/content ./content

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
