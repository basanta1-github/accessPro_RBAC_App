# AccessPro (RBAC App) — Backend Interview Prep

> This is not a README recap. Each question targets a **specific decision in this codebase**. Practice saying the answer out loud, pointing at the exact file, function, variable, and value.
>
> **Stack:** Node.js + Express 5, MongoDB (Mongoose 8), Redis, JWT (`jsonwebtoken`), bcrypt, Stripe, Nodemailer, Speakeasy (2FA), Jest + Supertest + `mongodb-memory-server`.
>
> **Answer format:** For each question a short "cover this" pointer is given. Expand it into a 30–90 second spoken answer.

---

## Map of the codebase (memorize this)

- `server.js` → boots env, `connectDB(MONGO_URI, afterDBMiddleware)`, `app.listen(PORT)`.
- `app.js` → middleware order + route mounts + error handler.
- `config/` → `database.js`, `redisClient.js`, `stripe.js`, `env.js`.
- `controllers/` → `authController.js`, `userActionControllers.js`, `projectControllers.js`, `tenantController.js`, `userInviteController.js`, `auditController.js`, `activityLogger.js`.
- `middlewares/` → `authentication.js` (`protect`), `attachTenant.js`, `authorize.js`, `tenantSubDomain.js`, `cache.js`, `controllerLogger.js` (`withActivityLog`), `errorHandler.js`, `planRestriction.js`, `restrictByUserLimit.js`, `asyncHandler.js`, rate limiters.
- `models/` → `User.js`, `Tenant.js`, `Roles.js`, `Project.js`, `Invite.js`, `blackListedToken.js`, `activityMetric.js`, `tenantAuditLog.js`, `passwordReset.js`.
- `plugins/softDelete.js` → soft-delete Mongoose plugin.
- `script/webhookHandlerRoute.js` → Stripe webhook handler.
- `utils/` → `generateTokens.js`, `createDefaultroles.js`, `passwordPolicy.js`, `kpiChacheKeys.js`, etc.

---

# BASIC (50)

1. **What problem does AccessPro solve?** Multi-tenant RBAC SaaS: each company (Tenant) has isolated Users, Roles, Projects, billing, and audit logs.
2. **Why Express 5 (`express: ^5.1.0`)?** Latest Express; note async error handling differences vs v4. Be ready to say what changed (auto-catch of rejected promises in some cases, but this app still uses `asyncHandler`).
3. **What is the entry point and boot order?** `server.js` loads dotenv → imports `app` → `connectDB(...)` → `app.listen(process.env.PORT)`.
4. **Why is the Stripe webhook mounted before `express.json()` in `app.js`?** Stripe needs the **raw** body for signature verification, so `/billing/webhook` uses `express.raw({ type: "application/json" })` and must be registered before the JSON body parser.
5. **List the app-level middleware in order.** `express.raw` (webhook only) → `helmet()` → `cors()` → `morgan("dev")` → `cookieParser()` → `express.json()` → `express.urlencoded()` → `appRateLimiter` → routes → health `GET /` → `errorHandler` (last).
6. **Why must `errorHandler` be registered last?** Express error middleware (4 args) only catches errors from middleware/handlers declared before it.
7. **What does `helmet()` do here?** Sets secure HTTP headers (CSP defaults, `X-Frame-Options`, HSTS, etc.) to reduce common web vulnerabilities.
8. **What database do you use and via what library?** MongoDB via Mongoose `^8.19.1`.
9. **How do you connect to MongoDB?** `config/database.js` `connectDB(MONGO_URI, ...)` using `mongoose.connect`, called from `server.js`.
10. **How are passwords stored?** bcrypt-hashed in `User.js` `pre("save")` hook using `bcrypt.genSalt(10)` then `bcrypt.hash`. Never plaintext.
11. **How many bcrypt salt rounds and why 10?** 10 rounds — a balance of security vs login latency; higher rounds = exponentially slower hashing.
12. **How do you verify a password on login?** `user.matchPassword(password)` → `bcrypt.compare(plaintext, hash)`.
13. **What library issues JWTs?** `jsonwebtoken ^9.0.2`, in `utils/generateTokens.js`.
14. **What signing algorithm do your JWTs use?** No `algorithm` option is passed to `jwt.sign`, so it defaults to **HS256** (HMAC-SHA256, symmetric secret).
15. **What claims are in the access token?** `userId`, `tenantId`, `role`, `companyName`, `permissions`.
16. **What claims are in the refresh token?** Only `userId` and `tenantId`.
17. **Which env vars hold the JWT secrets/expiry?** `JWT_ACCESS_SECRET` / `JWT_ACCESS_EXPIRES`; `REFRESH_TOKEN_SECRET` / `REFRESH_EXPIRES`.
18. **What is a "tenant" in your data model?** A company/organization (`models/Tenant.js`) that owns users, projects, roles, and a `subscription` object.
19. **What roles exist by default?** `owner`, `admin`, `employee` — created per tenant by `utils/createDefaultroles.js`.
20. **When are default roles created?** During `POST /register`, after `Tenant.create`, via `createdefaultRoles(tenant._id)`.
21. **What role does the first registered user get?** `owner`.
22. **How do you authenticate a protected request?** `protect` middleware (`authentication.js`): reads `Authorization: Bearer <token>`, checks blacklist, `jwt.verify`, loads `User` and `Tenant`, sets `req.user` / `req.tenant`.
23. **What happens if no `Bearer` token is sent?** `protect` returns `401 "No token provided"`.
24. **How does logout work if JWTs are stateless?** Logout writes the token to a `BlackListedTokens` collection; `protect` rejects any blacklisted token.
25. **What fields does the blacklist model store?** `token` (unique) and `expiresAt` (`models/blackListedToken.js`).
26. **What cache do you use and how is it configured?** Redis via `redis ^5.10.0` in `config/redisClient.js` (`REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`, defaults `127.0.0.1:6379`).
27. **What does the app export for Redis in test mode?** In `NODE_ENV==="test"` the module exports `null` (Redis disabled in tests).
28. **What does `cacheMiddleware` do on a cache hit?** Returns `res.status(200).json(JSON.parse(cachedData))` and skips the controller.
29. **How does `cacheMiddleware` populate the cache on a miss?** It monkey-patches `res.json` to `redisClient.setEx(key, ttl, JSON.stringify(data))` before sending.
30. **What is the default cache TTL if none is passed?** 60 seconds (`expirationInSeconds = 60` default).
31. **What is the users cache key and TTL?** Key `users:tenantId:${req.tenantId}`, TTL **300s** on `/api/users/getUsers`.
32. **What is the projects cache key and TTL?** Key `projects:tenantId:${req.tenantId}`, TTL **60s** on `/projects/getProjects`.
33. **What HTTP request logger do you use?** `morgan("dev")`.
34. **How do you handle async errors in controllers?** `asyncHandler` wraps promises and forwards rejections to `next(err)`; plus `withActivityLog` catches and returns 500.
35. **What does `withActivityLog` do?** Wraps a controller, intercepts status/json, and asynchronously records an `ActivityMetric` audit entry (action label + success/fail).
36. **Where are secrets configured?** Environment variables loaded via `dotenv` (`.env`), read through `process.env.*`.
37. **What payment provider do you integrate?** Stripe (`stripe ^19.3.1`), initialized in `config/stripe.js`.
38. **What billing endpoints exist?** `POST /api/billing/subscribe`, `GET /api/billing/stripe-success`, `POST /api/billing/cancel-subscription`, `GET /api/billing/check-subscription`.
39. **What plans exist?** Free, Pro, Enterprise (drives user limits and rate limits).
40. **How do you send email?** `nodemailer` via SMTP env vars (`SMTP_HOST/PORT/USER/PASS`), e.g. invoice and invite emails.
41. **How is 2FA implemented?** `speakeasy` for TOTP secrets + `qrcode` for provisioning; enforced for `admin`/`owner` when `twoFactor.enabled`.
42. **What test framework and tools?** Jest, Supertest, `mongodb-memory-server`; `npm test` runs `cross-env NODE_ENV=test jest --runInBand`.
43. **Why `--runInBand` in tests?** Run tests serially in one process to avoid shared in-memory Mongo / port conflicts and flaky parallelism.
44. **What does the health route return?** `GET /` returns a simple health/status JSON.
45. **What is soft delete here?** `plugins/softDelete.js` marks docs `isDeleted` instead of removing, and filters them out of normal queries.
46. **How do you restore a soft-deleted record?** A restore controller flips `isDeleted` back (users/projects), then invalidates the relevant cache.
47. **What is `req.tenantId` and where is it set?** The active tenant's `_id`, set by `attachTenant` after verifying it matches the JWT's tenant.
48. **What CORS origin is configured?** A single origin string is passed to `cors(...)` in `app.js` (e.g. the frontend URL) — be ready to explain it's restrictive/single-origin.
49. **How do you validate input?** Manual inline checks in controllers (required fields) + `utils/passwordPolicy.js`; no Joi/Zod.
50. **What does `passwordPolicy` enforce?** Min length 8 and a regex requiring upper + lower + digit + special character.

---

# INTERMEDIATE (50)

1. **Walk through exactly what happens on `POST /login`.** Route (`authRoutes.js`) applies `loginRateLimiter` → `withActivityLog(login, "LOGIN")`. Controller: `Tenant.findOne({ name: companyName })` → `User.findOne({ email, tenantId })` (with `_skipSoftDelete` so deleted users are detectable) → `isDeleted` check (403) → lockout check (`lockUntil > Date.now()` → 403) → `matchPassword` → on fail increment `failedLoginAttempts` (lock at ≥5 for 15 min) → on success reset counters + `lastLogin` → 2FA branch or issue access+refresh tokens.
2. **What middleware runs before the login controller, in order?** App-level: helmet → cors → morgan → cookieParser → json/urlencoded → `appRateLimiter`; route-level: `loginRateLimiter` → `withActivityLog`.
3. **Why look up the tenant by `companyName` before the user?** Users are unique **per tenant**, so you must resolve the tenant first to scope the `User.findOne({ email, tenantId })` query.
4. **What is `.setOptions({ _skipSoftDelete: ["User"] })` doing in login and why?** It bypasses the soft-delete query filter so a deleted user is still found — letting you return an explicit 403 for deleted accounts instead of a generic "user not found".
5. **Explain the account lockout mechanism.** On wrong password, `failedLoginAttempts += 1`; at `>= 5`, `lockUntil = Date.now() + 15*60*1000` (15 min). Login checks `lockUntil > Date.now()` up front and returns 403.
6. **When do you reset lockout counters?** On a successful password match: `failedLoginAttempts = 0`, `lockUntil = null`, set `lastLogin`.
7. **What does the 2FA login branch return, and what's the risk?** For `admin`/`owner` with `twoFactor.enabled`, login returns `{ action: "verify-2fa-login", userId }` with **no tokens**. Risk: it returns only `userId` (no signed temporary challenge token), so the second step must be careful not to trust a raw userId.
8. **Walk through `POST /register`.** Validate required fields → `Tenant.findOne({ $or: [name, domain, email] })` (dedupe) → `passwordPolicy` → `Tenant.create` → `createdefaultRoles(tenant._id)` → create `User` with `role: "owner"` → `user.save()` (bcrypt pre-save) → 201.
9. **How does `generateAccessToken` embed permissions?** It signs the user's role `permissions` array into the token so `authorize` can (optionally) read them without a DB hit — though `authorize` currently reloads from DB.
10. **How does the refresh flow work?** `POST /refresh` verifies the refresh token against `REFRESH_TOKEN_SECRET`, reloads the user + role permissions, and returns a **new access token only**.
11. **Do you rotate refresh tokens? What's the implication?** No — there is no refresh-token store or rotation. A leaked refresh token stays valid until expiry and cannot be individually revoked.
12. **Explain the JWT blacklist end-to-end.** Logout: `jwt.decode(token)` → `expiresAt = new Date(decoded.exp*1000)` → `BlackListedTokens.create({ token, expiresAt })`. `protect` does `BlackListedTokens.findOne({ token })` and 401s if present.
13. **Does the blacklist auto-expire entries? What's the gap?** The schema stores `expiresAt` but has **no TTL index**, so entries are never auto-purged — the collection grows unbounded without a cleanup job. (Fix: `expiresAt` index with `expireAfterSeconds: 0`.)
14. **Why blacklist on the DB rather than Redis?** Simplicity/durability; but note Redis with native TTL would be a better fit for short-lived token denylists.
15. **Explain your Redis cache invalidation strategy.** On writes, controllers call `invalidateCache(pattern)`. Users: `users:tenantId:*` invalidated on create/delete/soft-delete/restore and invite events. Projects: `projects:tenantId:*` on create/update/delete/soft-delete/restore. Tenants: clears both `tenant:${id}` and `tenants:all`.
16. **Why TTL 300s for users but 60s for projects?** Users change less frequently than projects, so a longer TTL is acceptable; projects are more volatile, so a shorter TTL bounds staleness. Both are backstops behind explicit invalidation.
17. **How does `invalidateCache` handle wildcard patterns?** If the pattern contains `*`, it runs `redisClient.keys(pattern)` then `del(keys)`; otherwise a direct `del(key)`.
18. **What's the danger of `redisClient.keys("users:*")` in invalidation?** `KEYS` is O(N) and blocks Redis; at scale `SCAN` or key-tracking is preferred.
19. **What happens if Redis is down during a cached GET?** `cacheMiddleware` wraps logic in try/catch and calls `next()` on error — it degrades gracefully to the DB (no cache).
20. **Explain multi-tenant isolation via `attachTenant`.** It checks `req.user.tenantId` exists (else 401), compares `req.user.tenantId.toString() !== req.tenant._id.toString()` → 403 "Cross-tenant access", then sets `req.tenantId` and `req.user.tenant`.
21. **Where does `req.tenant` come from vs `req.user.tenantId`?** `req.user.tenantId` comes from the verified JWT (via `protect`). `req.tenant` is resolved either from the JWT (`protect` loads `Tenant.findById(decoded.tenantId)`) or from `tenantSubDomain` (`x-tenant` header/subdomain).
22. **What happens if a JWT from tenant A is sent with `x-tenant: B`?** `protect` sets `req.user.tenantId = A`; `tenantSubDomain` sets `req.tenant = B`; `attachTenant` sees A ≠ B → **403 Cross-tenant access**. This is covered by integration tests.
23. **How does tenant scoping actually reach the DB queries?** Controllers explicitly filter by `req.tenantId` (e.g. `User.find({ tenantId: req.tenantId })`, `Project.find({ tenantId: req.tenantId })`).
24. **Is there a Mongoose plugin that auto-scopes tenant?** No — tenant filtering is manual in each controller. The only global plugin is soft-delete. (Talking point: a tenant plugin would reduce the risk of a forgotten filter.)
25. **Explain `tenantSubDomain` middleware.** `tenantDomain = req.headers["x-tenant"] || req.subdomains?.[0]` → `Tenant.findOne({ domain: tenantDomain })` → sets `req.tenant`.
26. **How does `authorize` check permissions?** Reloads the user, loads role `{ name: user.role, tenantId }`, then `requiredPermissions.some(perm => role.permissions.some(p => p.startsWith(perm)))`.
27. **What does the `startsWith` permission match imply?** Prefix matching: a route requiring `user:create` is satisfied by `user:create:employee` or `user:create:admin`. Convenient, but be ready to defend the granularity risk.
28. **Give the permission taxonomy.** e.g. `user:view/update/deactivated/restored`, `user:create:admin`, `user:delete:admin`, `user:create:employee`, `project:create/view/update/delete/deactivated/restored`, `tenant:view/update/...`, `audit:view`.
29. **How do you enforce per-plan feature access?** `planRestriction` middleware blocks a feature unless `tenant.subscription.plan` is in the allowed list (e.g. audit export gated by plan).
30. **How do you enforce a per-plan user cap?** `restrictByUserLimit`: Free=5, Pro=10, Enterprise=Infinity active users; blocks creation beyond the cap.
31. **Explain your rate limiting layers.** `appRateLimiter` composes a global limiter (10,000 req / 24h) + a tenant-plan limiter (Free 100, Pro 1000, Enterprise 5000). Plus `loginRateLimiter` (5/min) and `passwordResetLimiter` (5/hour).
32. **What's a bug/caveat in the tenant rate limiter?** It creates a new limiter instance per request (state not shared) and the `windowMs` is `60*60*100` = 360,000ms (6 min), not 1 hour. Good "what would you fix" answer.
33. **How does Stripe webhook signature verification work?** `stripe.webhooks.constructEvent(req.body /* raw */, sig, WEBHOOK_SIGNING_SECRET)`; on failure returns 400. Requires the raw body from `express.raw`.
34. **Why does the webhook always return `res.json({ received: true })` even after handler errors?** To ACK receipt so Stripe doesn't hammer retries; internal errors are logged (as `STRIPE_WEBHOOK_FAILED` activity) but still 200. Trade-off: a failed-but-acked event won't be retried.
35. **What is `lastPaymentIntentIdSent` protecting?** In `checkout.session.completed` (mode `payment`): if `tenant.subscription.lastPaymentIntentIdSent === session.payment_intent`, skip — prevents double-processing a duplicate `checkout.session.completed` delivery.
36. **What is `lastInvoiceIdSent` protecting?** In `invoice.payment_succeeded` / `invoice_payment.paid`: if `tenant.subscription.lastInvoiceIdSent === invoice.id`, skip — prevents applying the same invoice/renewal twice.
37. **What is a "duplicate webhook event" and why does it matter?** Stripe guarantees at-least-once delivery; the same event can arrive multiple times (retries, network). Without idempotency you'd double-charge state, double-email, or double-refund.
38. **How is refund idempotency handled?** `charge.refunded` and `doRefundIfNeeded` guard on `tenant.subscription.lastRefund.refundId === refund.id` and skip if already recorded.
39. **Which webhook events do you handle?** `checkout.session.completed`, `invoice.payment_succeeded`/`invoice_payment.paid`, `invoice.payment_failed`, `customer.subscription.updated`/`deleted`, `charge.refunded`.
40. **What happens on `invoice.payment_failed`?** Set `subscription.status = "past_due"`, save tenant, send a "Payment Failed" email.
41. **Why do you email on `subscription.deleted` but NOT on `charge.refunded`?** To avoid double-notifying — the cancellation email is sent once in the subscription cancel path; `charge.refunded` only records the refund idempotently.
42. **What subscription fields live on the Tenant?** `plan`, `status`, `stripeCustomerId`, `stripeSubscriptionId`, `stripePaymentIntentId`, `checkoutSessionId`, `currentPeriodEnd`, `defaultPaymentMethod`, `amountPaid`, `lastInvoiceIdSent`, `lastPaymentIntentIdSent`, `lastRefund`.
43. **How does the invite flow work?** `POST /inviteRoute/invite` (needs `user:create`) creates an `Invite` (email, tenantId, role, token, expiresAt, status) and emails a signed token; accept verifies the token and creates the user.
44. **What's a latent bug in the invite token secrets?** Invite creation signs with one secret while accept verifies with `INVITE_TOKEN_SECRET`; if they differ, acceptance breaks. Know which util signs (`utils/generateInviteToken.js`).
45. **What does the audit/activity system record?** `ActivityMetric` docs: tenantId, userId, action, metadata, method, path, statusCode, ip, success — written by `activityLogger` / `withActivityLog`.
46. **How do you avoid logging secrets in audit metadata?** `withActivityLog` redacts `password` and `token` fields to `[REDACTED]` before persisting.
47. **What indexes exist on `ActivityMetric` and why?** `{tenantId,createdAt:-1}`, `{tenantId,action,createdAt:-1}`, `{createdAt:-1}` — to support tenant-scoped, action-filtered, time-sorted audit queries efficiently.
48. **How does audit export work and how is it gated?** `/audit/export` requires `audit:view` plus a plan restriction; streams/returns CSV of activity records.
49. **How are KPI metrics cached and what's missing?** `/api/metrics/tenant` uses key `kpi:tenant:${tenantId}:from:${from}:to:${to}` TTL 10s; `/api/metrics/admin` uses `kpi:admin:system` TTL 10s. Missing: no explicit `kpi:*` invalidation on writes (relies on the 10s TTL).
50. **How do integration tests spin up the DB?** `mongodb-memory-server` in `tests/setup.js` starts an in-memory Mongo; test env secrets are set there; tests run with `--runInBand`.

---

# ADVANCED (50)

1. **Your access token embeds `permissions`, but `authorize` reloads the role from DB each request. Why the redundancy, and which is authoritative?** DB is authoritative (permissions can change mid-session); the embedded claim is a convenience/fallback. Trade-off: reloading adds a DB read per authorized request but guarantees freshness and enables mid-session revocation.
2. **How would you make permission checks scale without a DB read per request?** Cache role→permissions in Redis keyed by `{tenantId,role}` with invalidation on role edits; or trust the JWT claim and force short token TTL + re-issue on role change.
3. **The blacklist has `expiresAt` but no TTL index. Walk through the consequences and the exact fix.** Unbounded collection growth + slower `findOne` on `protect`. Fix: `blackListedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })` so Mongo's TTL monitor purges expired tokens; consider moving to Redis with per-token TTL for O(1) lookups.
4. **`protect` does a `findOne` on the blacklist for every protected request. What's the performance risk and mitigation?** Extra round-trip + index dependency on the hot path. Mitigation: Redis `EXISTS blacklist:<jti>`, add a `jti` claim so you store an id not the full token, and set TTL = token remaining life.
5. **Your JWTs don't include a `jti`. Why does that limit your revocation design?** Without a unique id you must store the entire token string to blacklist it. A `jti` enables compact denylists, per-session revocation, and "log out all devices".
6. **HS256 vs RS256 — why does it matter here, and when would you switch?** HS256 uses one shared secret for sign+verify; anyone who can verify can also forge. If you split verification to other services, switch to RS256 (private signs, public verifies) to avoid distributing the signing secret.
7. **Tenant isolation depends on every controller remembering to filter by `req.tenantId`. How is that a systemic risk and how would you eliminate it?** One forgotten filter = cross-tenant leak. Eliminate with a Mongoose plugin that injects `tenantId` into all queries from an async-local-storage context, or per-tenant DB/connection. Contrast with the current manual approach.
8. **Explain precisely why the A-JWT + B-header attack returns 403 and where the isolation would break if `attachTenant` were skipped.** `attachTenant` is the only gate comparing JWT tenant vs resolved tenant. If a route mounts `tenantSubDomain` (setting `req.tenant=B`) and controllers used `req.tenant` instead of `req.tenantId`, skipping `attachTenant` would query tenant B's data with tenant A's identity. So route middleware ordering is security-critical.
9. **On `/tenants/:id` the cache middleware runs before tenant/authorize checks. What's the exploit and fix?** A cache hit can serve a response before authorization runs, potentially leaking another tenant's cached payload or bypassing checks. Fix: cache **after** auth/tenant middleware, and namespace cache keys by requesting tenant.
10. **Your users have a globally-unique `email` index. Why is that wrong for multi-tenant and what's the correct index?** It prevents the same email from existing in two tenants. Correct: compound unique index `{ tenantId: 1, email: 1 }` so email is unique **per tenant**.
11. **`User.js` uses `strict: false`. What subtle bugs does that enable (e.g. `companyName`)?** Undeclared fields (like `companyName`) silently persist; typos become new fields, validation is bypassed, and queries on "expected" fields may miss data. Prefer `strict: true` + explicit schema.
12. **`Roles` has no unique compound index on `{tenantId,name}`. What can go wrong?** Duplicate role docs per tenant; `Roles.findOne({name,tenantId})` becomes non-deterministic. Fix with a unique compound index and upsert-on-conflict.
13. **The tenant rate limiter instantiates a new limiter per request and its window is 6 min not 1 hour. Explain both bugs' impact.** Per-request instances mean counters reset every request → effectively no limiting. The `60*60*100` typo (should be `60*60*1000`) shrinks the window. Net: the "tenant plan quota" is largely non-functional. Fix: single shared limiter with a Redis store keyed by tenant.
14. **Your login rate limiter keys on `${ip}:{tenant}` literally (tenant not interpolated). What's the effect?** All tenants share the same bucket per IP (the literal `{tenant}` string never interpolates), so the limit is coarser than intended and one tenant's traffic can throttle another behind a shared IP/NAT.
15. **Webhook returns 200 even when the handler throws. Walk through the failure mode and the correct pattern.** Stripe sees success and won't retry, so a transient DB failure permanently drops that event. Correct: return non-2xx on retryable failures (so Stripe retries) but keep idempotency guards to dedupe; use an event ledger to record processed `event.id`.
16. **Your idempotency uses `lastPaymentIntentIdSent`/`lastInvoiceIdSent` (one value each). Why is storing only the *last* id insufficient, and what's more robust?** Only guards against the immediately-repeated id; out-of-order or interleaved events (two different invoices retried around each other) can slip through. Robust: a dedicated `processed_stripe_events` collection keyed by `event.id` with a unique index, checked at the top of the handler.
17. **`invoice.payment_succeeded` reads `tenant.subscription.lastInvoiceIdSent` but earlier code does `if (!tenant) console.error(...)` without returning. What's the latent crash?** If `tenant` is null, the code proceeds to `tenant.subscription.lastInvoiceIdSent` → TypeError. Should `return`/`break` when tenant not found.
18. **Two webhook deliveries race concurrently for the same tenant. Does your idempotency hold?** Not fully — check-then-set on a Mongoose doc isn't atomic across two concurrent handlers; both can read the old `lastInvoiceIdSent` before either saves. Fix: atomic `findOneAndUpdate` with a condition on the id, or a unique index on processed event id.
19. **You verify webhooks with `WEBHOOK_SIGNING_SECRET`. What exactly does `constructEvent` validate and why raw body?** It recomputes an HMAC over the **exact raw bytes** + timestamp from the `Stripe-Signature` header and compares; any body mutation (JSON re-serialization) breaks the signature — hence `express.raw` before `express.json`.
20. **Refresh tokens can't be revoked in your design. Design a revocation scheme with minimal request overhead.** Store a per-user `tokenVersion`/`sessionId`; include it in the refresh token; bump it on logout-all/password-change; verify against a cached value. Or persist refresh tokens (hashed) with rotation + reuse detection.
21. **Password reset model export uses `mongoose.MODEL(...)` (uppercase). What breaks and how would you catch this earlier?** `mongoose.MODEL` isn't a function → runtime crash on import/use of password reset. Catch via a unit test that imports the model, TypeScript, or lint. Know it's `mongoose.model`.
22. **`Tenant` has the soft-delete plugin but no `isDeleted` field. What's the real behavior?** The plugin's filter has nothing to filter on, so tenant soft-delete is effectively a no-op — deactivation is tracked via `subscription.status`/`status` instead. Be honest about this in interview.
23. **Design a safe cache key strategy so a cached list can never leak across tenants.** Always prefix with tenant: `t:{tenantId}:users:...`; run cache middleware after `attachTenant`; on tenant deactivate, `SCAN` + delete `t:{tenantId}:*`. Never cache before identity is established.
24. **`invalidateCache` uses `KEYS pattern`. At 10k+ keys this stalls Redis. Rewrite it.** Use `SCAN` with a cursor and `UNLINK` (non-blocking delete), or maintain a Redis Set of keys per tenant and delete members, or use logical key versioning (`users:v{n}`) and bump the version to invalidate instantly.
25. **Explain the exact ordering guarantees you rely on in `app.js` and one reorder that would introduce a vulnerability.** Webhook-raw must precede `express.json`; `helmet`/`cors` before routes; `errorHandler` last. Reordering `express.json` before the webhook raw parser would consume the body and break signature verification (and could let unverified payloads through).
26. **How would you add distributed idempotency for the webhook that survives multiple API replicas?** Central store (Mongo unique index on `event.id`, or Redis `SET NX event:{id} EX ttl`) so any replica dedupes; the current in-tenant fields are per-document and race-prone across replicas.
27. **The 2FA login step returns only `userId`. Design the secure two-step flow.** Issue a short-lived signed "2FA challenge" JWT (scope: `2fa-pending`, 5 min) instead of a raw userId; the verify endpoint requires that token + TOTP code, then exchanges it for real access/refresh tokens. Prevents an attacker from posting an arbitrary userId to step 2.
28. **bcrypt rounds=10 fixed. How do you plan for hardware getting faster over years?** Make rounds configurable via env; on successful login, if the stored hash's cost < current target, transparently re-hash the password. Consider argon2id for new deployments.
29. **A tenant is deleted/deactivated. Trace everything that must be invalidated/cleaned.** Cache: `users:tenantId:*`, `projects:tenantId:*`, `tenant:${id}`, `tenants:all`, `kpi:tenant:${id}:*`; active JWTs (can't revoke without a version scheme — gap); Stripe subscription cancellation + refund; audit retention. Show you know the blast radius.
30. **Where can a race condition corrupt `failedLoginAttempts`/`lockUntil`?** Concurrent login attempts read-modify-write the same user doc; lost updates can undercount attempts, weakening lockout. Fix: atomic `$inc` with conditional `$set` on `lockUntil`, or a Redis counter.
31. **Your token verification loads full Mongoose docs for user and tenant on every request. Quantify and optimize.** 2 DB reads + hydration per request. Optimize: `.lean()` reads, cache tenant by id (rarely changes), or trust JWT claims for read-only fields and only load on writes.
32. **How does soft delete interact with unique indexes (e.g. a re-created project name)?** A soft-deleted doc still occupies the unique key, so recreating the same name/email fails. Options: partial unique index `{ ...  }` with `partialFilterExpression: { isDeleted: false }`, or include a `deletedAt` in the key.
33. **Explain how `withActivityLog` intercepts the response and the risk of double-send.** It wraps `res.status`/`res.json` to capture status/body for the audit record. Risk: if both the wrapper and controller call `res.json`, or logging throws after headers sent, you get "headers already sent". Must guard with `res.headersSent`.
34. **Design tenant data export/GDPR deletion given no tenant-scoping plugin.** Enumerate every collection with `tenantId`, run tenant-filtered export/delete in a transaction/batch, purge caches and audit per policy, cancel Stripe. The lack of a plugin means you must maintain an explicit registry of tenant-owned collections.
35. **Your metrics KPI cache TTL is 10s with no invalidation. When is that wrong?** For real-time dashboards after a mutating action, users see up to 10s stale KPIs. For heavy analytical queries the 10s cache is a deliberate cost/perf trade-off. Add event-based bust for critical KPIs.
36. **Stripe `currentPeriodEnd` is derived from `invoice.lines.data[0].period.end`. What breaks with multi-line invoices or proration?** Line[0] may not be the subscription line (could be proration/one-off), giving a wrong period end. Should find the subscription line explicitly by price/subscription id.
37. **How would you make the webhook handler resilient to Stripe API version changes in the payload shape?** Pin the Stripe API version, validate expected fields defensively, and read `subscription` id via the documented fallback (`invoice.parent?.subscription_details?.subscription`) — which the code already partially does — and add schema checks.
38. **Explain a TOCTOU issue in `restrictByUserLimit`.** It counts active users then allows creation; two concurrent creates can both pass the count and exceed the cap. Fix: atomic conditional insert or a per-tenant counter with `$inc` guarded by the limit.
39. **Your app sets `trust proxy` false. How does that affect rate limiting and IP logging behind a load balancer?** `req.ip` becomes the proxy's IP, so per-IP limits and audit IPs are wrong behind a proxy/CDN. Set `trust proxy` appropriately to read `X-Forwarded-For`, but only when the proxy is trusted (else IP spoofing).
40. **Compare storing permissions on the Role vs. computing them from a permission matrix. Trade-offs in this codebase.** Current: permission strings arrays per role per tenant (flexible, easy to read, but duplicated across tenants and drift-prone). Matrix/derived: single source of truth, easier global changes, but less per-tenant customization.
41. **How would you implement "log out everywhere" without the current token-string blacklist?** Add per-user `tokenVersion` claim; store current version in DB/Redis; `protect` rejects tokens whose version < current; bump on logout-all. O(1) and covers all outstanding tokens including refresh.
42. **The webhook mount path resolves to `POST /billing/webhook/webhook` (double segment). Why, and does it matter?** `app.use("/billing/webhook", router)` + `router.post("/webhook")`. It works but the effective URL is doubled; matters for the exact URL configured in the Stripe dashboard. Clean up by using `router.post("/")` or mounting at `/billing`.
43. **Explain the consistency risk between MongoDB writes and cache invalidation.** If the DB write succeeds but `invalidateCache` fails (Redis down), the cache serves stale data until TTL. Mitigate with TTL backstops (already present), retry, or write-through/short TTLs; accept eventual consistency.
44. **How do you prevent a soft-deleted user from logging in, and where is that enforced?** Login explicitly bypasses the soft-delete filter (`_skipSoftDelete`) to find the user and checks `user.isDeleted` → 403. If it relied on the default filter, `findOne` would return null and give a misleading "invalid credentials".
45. **Given Express 5, how does async error propagation differ and does this code rely on it?** Express 5 forwards rejected promises from route handlers to error middleware in more cases, but this app still wraps with `asyncHandler`/`withActivityLog` to be explicit and to attach audit logging — safer and version-independent.
46. **Design rate limiting that is correct across multiple API instances.** Current `express-rate-limit` default is in-memory (per-instance). Use a shared store (Redis) so limits are global; key by tenant+route; this also fixes the per-request limiter instantiation bug.
47. **What's the threat model if `JWT_ACCESS_SECRET` leaks, and your containment steps?** Attacker forges any token/tenant/role. Containment: rotate the secret (invalidates all tokens), add `kid`-based key rotation, short token TTL, and move to asymmetric keys so the verify key isn't the sign key.
48. **Explain how you'd add optimistic concurrency to tenant subscription updates in the webhook.** Add a `version`/`__v` check or `findOneAndUpdate({ _id, "subscription.lastInvoiceIdSent": { $ne: invoice.id } }, { $set: {...} })` so the update only applies once atomically — replacing the read-then-save race.
49. **How would you test webhook idempotency deterministically?** Fire the same signed event twice and assert state changes once (amount applied once, one email). The repo's `webhook.test.js` mocks Stripe; extend with duplicate-delivery and out-of-order cases.
50. **If asked "what would you refactor first for production?", give a prioritized list grounded in this code.** (1) Add TTL index / move blacklist to Redis with `jti`; (2) fix multi-tenant safety via a query plugin + compound `{tenantId,email}` unique index; (3) fix the rate-limiter bugs (shared Redis store, correct window); (4) event-ledger idempotency + correct non-2xx webhook retries; (5) cache after auth + tenant-namespaced keys + SCAN-based invalidation; (6) secure the 2FA challenge token; (7) fix `mongoose.MODEL` typo and `strict:false`.

---

## How to practice

- Open the exact file for each answer and read the surrounding lines before speaking.
- For every "gotcha" (blacklist TTL, rate-limiter window, `strict:false`, single-value idempotency), be ready with both **"here's what it does today"** and **"here's how I'd harden it"** — interviewers love that you know your own trade-offs.
- Time yourself: basic ≤ 30s, intermediate ≤ 60s, advanced ≤ 90s.
