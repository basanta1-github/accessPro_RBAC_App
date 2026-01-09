// swagger/roots/metricsRoots.js

/**
 * @swagger
 * /api/metrics/tenant:
 *   get:
 *     summary: Get tenant-specific metrics and KPIs
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-tenant
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant subdomain
 *     responses:
 *       200:
 *         description: Tenant metrics with KPIs and charts data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tenantId:
 *                   type: string
 *                   example: "64f7b1234567890abcdef123"
 *                 kpis:
 *                   type: object
 *                   properties:
 *                     totalRequests:
 *                       type: number
 *                       example: 1250
 *                     activeUsers:
 *                       type: number
 *                       example: 12
 *                 charts:
 *                   type: object
 *                   properties:
 *                     requestsPerday:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                           count:
 *                             type: number
 *                       example:
 *                         - date: "2026-01-07"
 *                           count: 45
 *                         - date: "2026-01-08"
 *                           count: 62
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Audit view permission required
 */

/**
 * @swagger
 * /api/metrics/admin:
 *   get:
 *     summary: Get platform-wide admin metrics (platform admin only)
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System-wide KPIs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 systemKPIs:
 *                   type: object
 *                   properties:
 *                     totalRequests:
 *                       type: number
 *                       example: 54210
 *                     totalUsers:
 *                       type: number
 *                       example: 847
 *                     totalTenants:
 *                       type: number
 *                       example: 23
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Platform admin + audit view permission required
 */

/**
 * @swagger
 * /api/metrics/export:
 *   get:
 *     summary: Export audit logs as CSV
 *     tags: [Metrics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-tenant
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant subdomain
 *     responses:
 *       200:
 *         description: CSV file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Audit view permission required
 */
