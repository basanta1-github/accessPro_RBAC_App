// swagger/roots/authRoots.js

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Register new tenant + owner user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, companyName, domain]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: "SecurePass123!"
 *               companyName:
 *                 type: string
 *                 example: "Mistey Facilities"
 *               domain:
 *                 type: string
 *                 example: "misteyfacilities.com"
 *     responses:
 *       201:
 *         description: Company registered and owner user created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "company registered and owner user created successfully"
 *       400:
 *         description: Missing fields or tenant already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ErrorResponse"
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Login user and return JWT tokens
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, companyName]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *               password:
 *                 type: string
 *                 example: "SecurePass123!"
 *               companyName:
 *                 type: string
 *                 example: "Mistey Facilities"
 *     responses:
 *       200:
 *         description: Login successful - tokens returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Login successful"
 *                 accessToken:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 refreshToken:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 email:
 *                   type: string
 *                   example: "john@example.com"
 *       400:
 *         description: Invalid credentials or 2FA required
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Invalid email or password"
 *                     resetPasswordEndpoint:
 *                       type: string
 *                 - type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "2FA verification required FOR admin /OWNER"
 *                     action:
 *                       type: string
 *                       example: "verify-2fa-login"
 *                     userId:
 *                       type: string
 *       403:
 *         description: Account locked
 */

/**
 * @swagger
 * /logout:
 *   post:
 *     summary: Logout user - blacklist access token
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "logged out successfully"
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /refresh:
 *   post:
 *     summary: Refresh access token using refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: New access token generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 permissions:
 *                   type: array
 *                   items:
 *                     type: string
 *                     example: "user:view"
 *       401:
 *         description: Invalid refresh token
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /password-reset:
 *   post:
 *     summary: Direct password reset (no token needed)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, companyName, newPassword]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *               companyName:
 *                 type: string
 *                 example: "Mistey Facilities"
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 example: "NewSecurePass123!"
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "password reset successful. now you can login with your new password"
 *       400:
 *         description: Validation errors
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /2fa/setup:
 *   post:
 *     summary: Setup 2FA for admin/owner (returns QR code)
 *     tags: [2FA]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 2FA setup data (QR code + secret)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 secret:
 *                   type: string
 *                 qrCode:
 *                   type: string
 *                   format: uri
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /2fa/verify-setup:
 *   post:
 *     summary: Verify 2FA setup with OTP
 *     tags: [2FA]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: 2FA setup verified and enabled
 *       400:
 *         description: Invalid OTP token
 */

/**
 * @swagger
 * /2fa/verify-login:
 *   post:
 *     summary: Complete 2FA login verification
 *     tags: [2FA]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, token]
 *             properties:
 *               userId:
 *                 type: string
 *               token:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: 2FA login successful - tokens returned
 *       400:
 *         description: Invalid OTP
 */
