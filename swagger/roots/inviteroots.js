// swagger/roots/inviteRoots.js

/**
 * @swagger
 * /inviteRoute/invite:
 *   post:
 *     summary: Send user invitation (owner/admin only)
 *     tags: [Invites]
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
 *             required: [email, role]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "newuser@example.com"
 *               role:
 *                 type: string
 *                 enum: [admin, employee]
 *                 default: "employee"
 *                 example: "employee"
 *     responses:
 *       201:
 *         description: Invite sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invite sent"
 *                 inviteId:
 *                   type: string
 *       400:
 *         description: Invalid email or exceeded user limit
 *       403:
 *         description: Permission denied or user limit reached
 *       404:
 *         description: Tenant not found
 */

/**
 * @swagger
 * /inviteRoute/accept-invite:
 *   post:
 *     summary: Accept invitation and create user account
 *     tags: [Invites]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, name, password]
 *             properties:
 *               token:
 *                 type: string
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: "SecurePass123!"
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Account created successfully"
 *                 user:
 *                   $ref: "#/components/schemas/User"
 *       400:
 *         description: Invalid/expired token or user exists
 */

/**
 * @swagger
 * /inviteRoute/getUsers:
 *   get:
 *     summary: Get all users in tenant
 *     tags: [Users]
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
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: "#/components/schemas/User"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Permission denied
 */

/**
 * @swagger
 * /inviteRoute/{id}:
 *   put:
 *     summary: Update user (role, isActive)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: header
 *         name: x-tenant
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [admin, employee]
 *                 example: "admin"
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User updated"
 *                 user:
 *                   $ref: "#/components/schemas/User"
 *       403:
 *         description: Cannot assign owner role
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /inviteRoute/{id}/deactive:
 *   put:
 *     summary: Deactivate user account
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *       - in: header
 *         name: x-tenant
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deactivated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User deactivated"
 *       404:
 *         description: User not found
 */
