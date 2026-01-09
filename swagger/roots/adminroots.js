// swagger/roots/adminRoots.js

/**
 * @swagger
 * /api/admin/sync-roles:
 *   post:
 *     summary: Sync default roles across ALL tenants (OWNER ONLY)
 *     description: |
 *       **⚠️ DANGER ZONE** - Platform-wide operation.
 *       Creates/updates default roles (tenant:view, tenant:update, etc.)
 *       for **EVERY tenant** in the system.
 *
 *       Only tenant **owners** can execute. Runs `createDefaultRoles()`
 *       utility for each tenant.
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Roles synced successfully across all tenants
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Roles synced successfully"
 *       403:
 *         description: Owner role required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *               example:
 *                 message: "you are not authorized to use this route please ask your owner"
 *       500:
 *         description: Server error during role sync
 *     x-admin-only: true
 *     x-dangerous-operation: true
 */
