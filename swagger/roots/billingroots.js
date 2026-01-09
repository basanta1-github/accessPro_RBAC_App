// swagger/roots/billingRoots.js

/**
 * @swagger
 * /api/billing/subscribe:
 *   post:
 *     summary: Subscribe to plan (Free/Pro/Enterprise) - 2-Step Flow
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-tenant
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant subdomain
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               plan:
 *                 type: string
 *                 enum: [Free, Pro, Enterprise]
 *                 example: "Pro"
 *               paymentMethodId:
 *                 type: string
 *                 description: "Stripe PM ID (Step 2). Omit for Step 1 checkout."
 *                 example: "pm_1ABC123def456"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "billing@company.com"
 *             example:
 *               plan: "Pro"
 *     responses:
 *       200:
 *         description: Step 1 (checkout URL) or Step 2 (subscription created)
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Open the frontend URL to enter card..."
 *                     checkoutUrl:
 *                       type: string
 *                       example: "https://checkout.stripe.com/..."
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Pro subscription created, waiting for payment"
 *                     subscriptionId:
 *                       type: string
 *                       example: "sub_1ABC123..."
 *       400:
 *         description: Invalid plan, email required, or active subscription
 */

/**
 * @swagger
 * /api/billing/stripe-success:
 *   get:
 *     summary: Stripe checkout success callback
 *     tags: [Billing]
 *     parameters:
 *       - in: query
 *         name: session_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Stripe checkout session ID
 *     responses:
 *       200:
 *         description: Payment/setup confirmed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Pro subscription successful and activated."
 *                 paymentMethodId:
 *                   type: string
 *                   example: "pm_1ABC123..."
 *                 subscriptionId:
 *                   type: string
 *                   example: "sub_1ABC123..."
 *       400:
 *         description: Missing session_id
 *       404:
 *         description: Tenant not found
 */

/**
 * @swagger
 * /api/billing/cancel-subscription:
 *   post:
 *     summary: Cancel subscription (Pro=recurring, Enterprise=refund)
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-tenant
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cancellation initiated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Pro subscription cancel request sent..."
 *       400:
 *         description: No active subscription
 *       404:
 *         description: Tenant/subscription not found
 */

/**
 * @swagger
 * /api/billing/check-subscription:
 *   get:
 *     summary: Verify subscription status (DB + Stripe sync)
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-tenant
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Subscription status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 dbExists:
 *                   type: boolean
 *                   example: true
 *                 stripeExists:
 *                   type: boolean
 *                   example: true
 *                 plan:
 *                   type: string
 *                   example: "Pro"
 *                 dbStatus:
 *                   type: string
 *                   example: "active"
 *                 stripeStatus:
 *                   type: string
 *                   example: "active"
 *                 currentPeriodEnd:
 *                   type: string
 *                   format: date-time
 *                 stripeSubscriptionId:
 *                   type: string
 *                   example: "sub_1ABC123..."
 *                 reason:
 *                   type: string
 *                   example: "SUBSCRIPTION_INACTIVE"
 */
