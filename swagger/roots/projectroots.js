// swagger/roots/projectRoots.js

/**
 * @swagger
 * /projects/create:
 *   post:
 *     summary: Create new project (owner/admin only)
 *     tags: [Projects]
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
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Website Redesign"
 *               description:
 *                 type: string
 *                 example: "Complete redesign of company website"
 *               assignedTo:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Employee user IDs to assign
 *                 example: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]
 *     responses:
 *       201:
 *         description: Project created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "project created successfully"
 *                 project:
 *                   $ref: "#/components/schemas/Project"
 *       400:
 *         description: Missing name or invalid assignees
 *       403:
 *         description: Owner/admin only
 */

/**
 * @swagger
 * /projects/getProjects:
 *   get:
 *     summary: Get all projects (employee sees assigned only)
 *     tags: [Projects]
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
 *         description: Projects retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "projects fetched successfully"
 *                 total:
 *                   type: number
 *                 projects:
 *                   type: array
 *                   items:
 *                     $ref: "#/components/schemas/Project"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Permission denied
 *       404:
 *         description: No projects found
 */

/**
 * @swagger
 * /projects/update/{id}:
 *   put:
 *     summary: Update project (role-based permissions)
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
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
 *               name:
 *                 type: string
 *                 example: "Website Redesign v2"
 *               description:
 *                 type: string
 *                 example: "Updated requirements"
 *               assignedTo:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["507f1f77bcf86cd799439011"]
 *     responses:
 *       200:
 *         description: Project updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Project updated successfully"
 *                 project:
 *                   $ref: "#/components/schemas/Project"
 *       403:
 *         description: Employee can only update assigned projects
 *       404:
 *         description: Project not found
 */

/**
 * @swagger
 * /projects/delete/{id}:
 *   delete:
 *     summary: Permanently delete project (owner/admin only)
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *       - in: header
 *         name: x-tenant
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "project deleted successfully"
 *       403:
 *         description: Owner/admin only
 *       404:
 *         description: Project not found
 */

/**
 * @swagger
 * /projects/softDelete/{id}:
 *   put:
 *     summary: Soft delete project (archive)
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *       - in: header
 *         name: x-tenant
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project soft deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Project Website Redesign soft deleted"
 *       404:
 *         description: Project not found or already deleted
 */

/**
 * @swagger
 * /projects/restore/{id}:
 *   put:
 *     summary: Restore soft-deleted project
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Project ID
 *       - in: header
 *         name: x-tenant
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project restored successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Project Website Redesign restored"
 *       404:
 *         description: Project not found or not deleted
 */
