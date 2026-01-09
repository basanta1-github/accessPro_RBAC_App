// swagger/roots/tenantRoots.js

/**
 * @swagger
 * /tenants:
 *   get:
 *     summary: Get all tenants (platform admin only)
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-tenant
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant subdomain (for audit logging)
 *     responses:
 *       200:
 *         description: All tenants retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tenants:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/Tenant"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       403:
 *         description: Forbidden - platform admin only
 */

/**
 * @swagger
 * /tenants/{id}:
 *   get:
 *     summary: Get specific tenant details
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant ID
 *       - in: header
 *         name: x-tenant
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant subdomain
 *     responses:
 *       200:
 *         description: Tenant retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tenant:
 *                   $ref: "#/components/schemas/Tenant"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - tenant mismatch
 *       404:
 *         description: Tenant not found
 */

/**
 * @swagger
 * /tenants/{id}/update:
 *   put:
 *     summary: Update tenant profile (owner/admin only)
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant ID
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
 *               name:
 *                 type: string
 *                 example: "Mistey Facilities Updated"
 *               subscriptionPlan:
 *                 type: string
 *                 enum: ["Free", "Pro", "Enterprise"]
 *                 example: "Pro"
 *               logo:
 *                 type: string
 *                 example: "https://example.com/logo.png"
 *               domain:
 *                 type: string
 *                 example: "misteyfacilities.com"
 *             example:
 *               name: "Mistey Facilities Updated"
 *               subscriptionPlan: "Pro"
 *               logo: "https://example.com/logo.png"
 *     responses:
 *       200:
 *         description: Tenant updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "tenant updated"
 *                 tenant:
 *                   $ref: "#/components/schemas/Tenant"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Owner/admin only or tenant mismatch
 *       404:
 *         description: Tenant not found
 */

/**
 * @swagger
 * /tenants/{id}/deactive:
 *   put:
 *     summary: Deactivate tenant (owner/admin only)
 *     tags: [Tenants]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant ID
 *       - in: header
 *         name: x-tenant
 *         required: true
 *         schema:
 *           type: string
 *         description: Tenant subdomain
 *     responses:
 *       200:
 *         description: Tenant deactivated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Tenant Deactivated"
 *                 tenant:
 *                   $ref: "#/components/schemas/Tenant"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Permission denied
 *       404:
 *         description: Tenant not found
 */
