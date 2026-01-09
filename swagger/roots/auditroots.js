// swagger/roots/auditRoots.js

/**
 * @swagger
 * /audit:
 *   get:
 *     summary: Get paginated tenant audit logs with filters
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-tenant
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant subdomain
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 25
 *           minimum: 1
 *           maximum: 100
 *         description: Items per page (max 100)
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by action (CREATE_PROJECT, UPDATE_USER, etc.)
 *       - in: query
 *         name: resource
 *         schema:
 *           type: string
 *         description: Filter by resource (Project, User, Tenant, etc.)
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date (ISO format)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date (ISO format)
 *     responses:
 *       200:
 *         description: Paginated audit logs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: number
 *                   example: 125
 *                 page:
 *                   type: number
 *                   example: 1
 *                 limit:
 *                   type: number
 *                   example: 25
 *                 pages:
 *                   type: number
 *                   example: 5
 *                 logs:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/ActivityMetric"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Audit view permission required
 */

/**
 * @swagger
 * /audit/export:
 *   get:
 *     summary: Export filtered audit logs as CSV (Pro/Enterprise only)
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-tenant
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant subdomain
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: Filter by action
 *       - in: query
 *         name: resource
 *         schema:
 *           type: string
 *         description: Filter by resource
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date
 *     responses:
 *       200:
 *         description: CSV file download
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *             example: |-
 *               tenantId,userId,role,action,resource,method,path,statusCode,success,ip,createdAt,metadata
 *               64f7b123...,64f7b456...,admin,CREATE_PROJECT,Project,POST,/projects/create,201,true,192.168.1.1,2026-01-09T02:00:00.000Z,"{}"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Pro/Enterprise plan + audit:view permission required
 */
