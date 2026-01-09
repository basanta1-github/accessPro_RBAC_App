# AccessPro RBAC – Multi-Tenant SaaS Backend

Enterprise-grade backend platform for multi-tenant Role-Based Access Control (RBAC), subscriptions, analytics, and notifications. Fully production-ready and designed to demonstrate real-world backend engineering skills.

# Table of Contents

- Project Overview
- Key Features
- Architecture & Tech Stack
- Setup & Installation
- Environment Variables
- API Documentation
- Authentication & Authorization
- Multi-Tenant Design
- Subscription & Billing
- Caching & Performance
- Analytics & Metrics
- Notifications
- Security Enhancements
- Testing & CI/CD
- Deployment
- Contributing
- License

# Project Overview

AccessPro RBAC is a fully-featured enterprise SaaS backend enabling companies to manage users, projects, and resources securely.

# Highlights:

- Multi-tenancy with tenant isolation
- Role-Based Access Control (Admin/Manager/Employee)
- Stripe billing & subscription plans
- Analytics dashboard and audit logs
- Notifications (email, webhook, optional push)
- CI/CD + automated tests
- Redis caching and rate-limiting
- This project demonstrates real-world backend engineering skills required for production - SaaS applications.

# Key Features

- Multi-tenant architecture with tenant-specific subdomains
- Invite-only and api hit create user onboarding
- Role-based permissions (Admin, Manager, Employee)
- Stripe integration for billing & subscription plans (Free / Pro / Enterprise)
- Soft delete & restore functionality
- Redis caching for frequently accessed data
- API rate limiting per tenant
- Audit logs with CSV export
- Analytics dashboards (KPIs, charts)
- Notifications: email & webhooks
- Advanced security: 2FA, password policies, login rate limits
- CI/CD pipeline with automated testing
- Architecture & Tech Stack

# Legend / Notes

- Clients: Frontend apps, Postman, or any API consumer.
- API Gateway: Main Express.js server. Handles requests, routes to services.
- Middleware Layer: Handles all cross-cutting concerns like auth, RBAC, tenant isolation, logging, metrics, rate limits.
- Services Layer: Business logic layer — user, tenant, project, billing, notifications, analytics, caching.
- Databases & Cache: MongoDB for multi-tenant data, Redis for caching high-frequency data.
- External Services: Stripe for payments, SMTP/email service for notifications, webhooks for external integrations.

# Tech Stack:

----- Layer | Technology----

- Backend | Node.js, Express.js
- Database | MongoDB (multi-tenant collections)
- Caching | Redis
- Payment | Stripe API
- Notifications | Nodemailer (email), webhooks, optional push
- Testing | Jest, Supertest
- CI/CD | GitHub Actions
- Documentation | Swagger

Architecture Flow:
Architecture Diagram (Placeholder):

```
Architecture Flow:
Architecture Diagram (Placeholder):
┌──────────────────────┐
│ Client =             │
│ Postman              │
└─────────┬────────────┘
          │
          ▼
┌───────────────────────┐
│ API Gateway /         │
│ Express.js Server     │
└─────────┬─────────────┘
          │
┌─────────┴───────────────────┐
│ Middleware Layer            │
│ ┌─────────────────────────┐ │
│ │ Auth (JWT)              │ │
│ │ Authorization           │ │
│ │ Caching                 │ │
│ │ RBAC Enforcement        │ │
│ │ Tenant Isolation        │ │
│ │ Rate Limiting           │ │
│ │ Audit Logging           │ │
│ │ Metrics Collection      │ │
│ │ Stripe Handling         │ │
│ │ Tenant Subdomain        │ │
│ │ Plan Restriction        │ │
│ └─────────────────────────┘ │
└───────────┬─────────────────┘
            │
┌───────────┴───────────┐
│ Services Layer        │
│ ┌───────────────────┐ │
│ │ User Service      │ │
│ │ Tenant Service    │ │
│ │ Project Service   │ │
│ │ Billing Service   │ │
│ │ 2-FA              │ │
│ │ Analytics         │ │
│ │ Cache Service     │ │
│ │ Invites           │ │
│ │ Deactive          │ │
│ └───────────────────┘ │
└───────────┬───────────┘
            │
┌───────────┴───────────┐
│ Databases & Cache     │
│ ┌─────────┐┌────────┐ │
│ │ MongoDB ││ Redis  │ │
│ └─────────┘└────────┘ │
└───────────┬───────────┘
            │
┌───────────┴───────┐
│ External Services │
│ ┌───────────────┐ │
│ │ Stripe        │ │
│ │ Email Service │ │
│ │ Webhooks      │ │
│ └───────────────┘ │
└───────────────────┘
```

# Setup & Installation

- Clone repository

--git clone https://github.com/basanta1-github/accessPro_RBAC_App.git
--dir
--cd <specific directory for this folder>

- Install dependencies
  --npm install
- Run development server
  --npm run dev

# Environment Variables

PORT=5000
MONGO_URI=<Your MongoDB URI>
JWT_ACCESS_SECRET=<your-jwt-secret>
JWT_ACCESS_EXPIRES=<time-you-want>
REFRESH_TOKEN_SECRET=<refresh-token-secret>
REFRESH_EXPIRES=<time-you-want>
INVITE_TOKEN_SECRET = <invite-token-secret>
TEMP_TOKEN_SECRET=<temp-token-secret>
TEMP_TOKEN_EXPIRES=<time-you-want>
// for invite token
SMTP_HOST=<smtp.gmail.com>
SMTP_PORT=<smtp-port> use 587
SMTP_USER=<your-sending-email>
SMTP_PASS=<your-passowrd>
FRONTEND_URL=<Your Frontend URL>
BACKEND_URL=<Your Backend URL>
BACKEND_DEV_URL = http://localhost:5000
//for email validation
HUNTER_API_KEY = <your-api-key>
STRIPE_SECRET_KEY=<your-stripe-live-key>
WEBHOOK_SIGNING_SECRET=<your-key-obtained-from-webhook>
STRIPE_PRO_PRICE_ID=<your-pro-price-id>
STRIPE_ENTERPRISE_PRICE_ID=<your-enterprise-price-id-obtained-from-stripe-products>
//redis caching
REDIS_HOST=127.0.0.1
REDIS_PORT=<>

# REDIS_PASSWORD=your_redis_password # optional

# API Documentation

Swagger available at /api-docs
Postman collection available in postman/AccessPro_RBAC.postman_collection.json

# Key Endpoints:

Endpoint Method Description

1.  Auth & security

    - POST /register
      Creates a new tenant and owner user using name, email, password, companyName, and domain.
    - POST /login
      Logs in a user for a given companyName and returns a JWT with tenant, role, and permissions.

    - POST /logout
      Logs out the current user by invalidating the active JWT session.

    - POST /password-reset
      Resets a user’s password using email, companyName, and newPassword without needing a logged‑in session.

    - POST /2fa/setup
      Starts two‑factor setup for the logged‑in user, generating a secret and QR for an authenticator app.
    - POST /2fa/verify-setup
      Confirms 2FA setup by verifying an OTP token from the authenticator app.
      ​
    - POST /2fa/verify-login
      Completes login for 2FA‑enabled accounts by verifying the OTP with userId.
      ​

2.  Users (tenant‑scoped)

    - POST /api/users/create
      Creates users (owner, admin, employee) inside the current tenant; requires Authorization and x-tenant.

    - GET /api/users/getUsers
      Lists tenant users, filtered by RBAC permissions of the caller.

    - DELETE /api/users/delete/:userId
      Permanently deletes a user from the tenant; only privileged roles can call this.

    - PUT /api/users/soft-delete/:userId
      Soft deletes a user (mark as inactive) without losing their data.

    - PUT /api/users/restore/:userId
      Restores previously soft‑deleted user back to active state.

3.  Invites (tenant‑scoped)

    - POST /inviteRoute/invite
      Sends an invite email to join the tenant with a specified role (e.g., employee).

    - POST /inviteRoute/accept-invite
      Accepts an invite token, sets user name and password, and links the user to the tenant.

    - GET /inviteRoute/getUsers
      Lists invited users (pending/active) for the tenant for management purposes.

    - PUT /inviteRoute/:inviteId
      Updates an invited user’s role or active flag (e.g., isActive true/false).

    - PUT /inviteRoute/:inviteId/deactive
      Deactivates an invite, preventing it from being used without deleting it.

    ​

4.  Tenants & admin

    - GET /tenants
      Returns all tenants in the system; intended for platform‑level admin usage.

    - GET /tenants/:tenantId
      Reads a single tenant including name, subscriptionPlan, logo, domain, and status.

    - PUT /tenants/:tenantId/update
      Updates tenant profile and subscription metadata (name, plan, logo, domain, status).!

    - PUT /tenants/:tenantId/deactive
      Deactivates a tenant (e.g., for offboarding) while keeping data for audit and potential restore.

    - POST /api/admin/sync-roles
      Synchronizes RBAC roles and permissions into the database (bootstrap or refresh role definitions).

​

5.  Projects (per tenant)

    - GET /projects/getProjects
      Returns all projects visible to the caller within the current tenant, respecting permissions.

    - POST /projects/create
      Creates a new project with name, description, and one or more assignees (assignedTo array).

    - PUT /projects/update/:projectId
      Updates an existing project’s name/description or other editable fields.

    - DELETE /projects/delete/:projectId
      Permanently removes a project from the tenant.
      ​
    - PUT /projects/softDelete/:projectId
      Soft deletes (archives) a project so it no longer appears in active lists.

    - PUT /projects/restore/:projectId
      Restores a previously soft‑deleted project back to active.

    ​

6.  Audit logs

    - GET /audit
      Returns audit log entries for the tenant, including who did what and when.

    - GET /audit/export
      Exports audit logs as CSV for compliance, reporting, or offline analysis

    - GET /audit/?page=1&limit=25
      Get all logs (page 1, 25 items)

    - GET /audit/?from=2026-01-01T00:00:00Z&to=2026-01-09T23:59:59Z&page=2
      Last 30 days, page 2

    - GET /audit/?action=CREATE_PROJECT&action=UPDATE_PROJECT&resource=Project
      Project actions only

    - GET /audit/?userId=64f7b4567890abcdef123456
      Specific user

7.  Metrics

    - GET /api/metrics/tenant
      Returns tenant‑level metrics such as user counts, project counts, and activity indicators.
    - GET /api/metrics/admin
      Returns platform‑wide metrics suitable for system administrators.
    - GET /api/metrics/export
      Exports metrics data (likely CSV) for external dashboards and BI tools.
      ​

8.  Billing & subscriptions

    - GET /api/billing/check-subscription
      Checks current tenant subscription status (plan, active/canceled) using JWT and x-tenant.

    - POST /api/billing/subscribe
      Starts or updates a Stripe‑style subscription for a tenant using plan and paymentMethodId.

    - POST /api/billing/cancel-subscription
      Cancels the tenant’s active subscription based on the owner’s email.

    ​

# Authentication & Authorization

- JWT tokens (access + refresh)
- RBAC roles:

1. Admin – full access
2. Manager – project, tenant , user, and billing
3. Employee – project update and iew

- Middleware enforces tenant isolation, role permissions, rate-limiting, and audit logs.

# Multi-Tenant Design

- Tenant isolation at DB and API level
- Subdomain routing: company-name.accesspro.com
- Middleware injects tenantId in requests
- Soft-delete and restore functionality per tenant

# Subscription & Billing

- Stripe integration with webhooks
- Plans: Free / Pro / Enterprise
- Feature gating by plan
- Notifications for billing events

# Caching & Performance

-Redis caching for high-frequency tenant/user data

- Cache invalidation on updates
- TTL-based cache management
- Tenant-specific API rate limiting

# Analytics & Metrics

- Tracks API usage and activity per tenant
- Admin dashboards show KPIs: active users, API calls, billing stats
- CSV export available for audits

# Notifications

- Email templates (HTML) for invites, billing, subscription updates
- Webhooks for external systems
- Optional push notifications

# Security Enhancements

- Login rate limits and lockouts
- Two-factor authentication for Admin/Owner
- Strong password policies
- Helmet headers and CORS configured
- Audit logs of security events

# Testing & CI/CD

1. Unit tests with Jest
2. Integration tests with Supertest
3. Tests cover:

   - Auth & RBAC
   - Tenant isolation
   - Billing webhooks
   - Soft delete
   - Project, invite, user, tenant routes
   - Passport policy
   - tokens
   - roles creation
   - sending email
   - stripe helpers

4. GitHub Actions CI/CD:

- Runs tests on every push
- Deploys if tests pass
- Runs linting & environment checks

5. Procedure

- npm test
  -- or
- npm test <specificFileName.test.js>

# Deployment

- Deployable to Heroku, Render, or AWS
- .env configuration for secrets
- Redis caching and Stripe integration configured for production

# Contributing

1. Fork repository
2. Create feature branch: git checkout -b feature/<name>
3. Commit changes: git commit -m "feat: description"
4. Push branch: git push origin feature/<name>
5. Open PR for review

# License

MIT License © 2026 Basanta Pokhrel
