module.exports = {
  securitySchemes: {
    bearerAuth: {
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
    },
  },
  schemas: {
    User: {
      type: "object",
      properties: {
        _id: { type: "string" },
        name: { type: "string" },
        email: { type: "string" },
        password: { type: "string", writeOnly: true },
        role: {
          type: "string",
          enum: ["owner", "admin", "employee"],
          default: "user",
        },
        tenantId: { type: "string" },
        isActive: { type: "boolean", default: true },
        lastLogin: { type: "string", format: "date-time", nullable: true },
        twoFactor: {
          type: "object",
          properties: {
            enabled: { type: "boolean", default: false },
            secret: { type: "string", writeOnly: true },
          },
        },
        failedLoginAttempts: { type: "number", default: 0 },
        lockUntil: { type: "string", format: "date-time", nullable: true },
        isDeleted: { type: "boolean", default: false },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
        __v: { type: "number" },
      },
    },
    LoginResponse: {
      type: "object",
      properties: {
        message: { type: "string" },
        accessToken: { type: "string" },
        refreshToken: { type: "string" },
        email: { type: "string" },
      },
    },
    Tenant: {
      type: "object",
      properties: {
        _id: { type: "string" },
        name: {
          type: "string",
          example: "Mistey Facilities",
        },
        status: {
          type: "string",
          enum: ["active", "inactive"],
          default: "active",
        },
        domain: {
          type: "string",
          example: "misteyfacilities.com",
        },
        email: {
          type: "string",
          format: "email",
          example: "billing@misteyfacilities.com",
        },
        subscription: {
          type: "object",
          properties: {
            plan: {
              type: "string",
              enum: ["Free", "Pro", "Enterprise"],
              default: "Free",
            },
            status: {
              type: "string",
              enum: [
                "active",
                "canceled",
                "trialing",
                "past_due",
                "incomplete",
              ],
              default: "active",
            },
            stripeCustomerId: { type: "string", nullable: true },
            stripeSubscriptionId: { type: "string", nullable: true },
            stripePaymentIntentId: { type: "string", nullable: true },
            checkoutSessionId: { type: "string", nullable: true },
            currentPeriodEnd: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            defaultPaymentMethod: { type: "string", nullable: true },
            amountPaid: {
              type: "number",
              default: 0,
            },
            lastInvoiceIdSent: { type: "string", nullable: true },
            lastPaymentIntentIdSent: { type: "string", nullable: true },
          },
        },
        logo: {
          type: "string",
          default: "",
          example: "https://example.com/logo.png",
        },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
        __v: { type: "number" },
      },
    },
    TenantAuditLog: {
      type: "object",
      properties: {
        _id: { type: "string" },
        tenantId: { type: "string" },
        action: {
          type: "string",
          enum: ["create", "update", "deactive"],
        },
        performedBy: { type: "string" },
        changes: {
          type: "object",
          nullable: true,
          example: {
            name: { from: "Old Name", to: "New Name" },
            domain: { from: "old.com", to: "new.com" },
          },
        },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
      },
    },
    Roles: {
      type: "object",
      properties: {
        name: { type: "string" },
        permissions: {
          type: "array",
          items: { type: "string" },
        },
        tenantId: { type: "string" },
      },
    },
    Project: {
      type: "object",
      properties: {
        _id: { type: "string" },
        name: {
          type: "string",
          example: "Website Redesign",
        },
        description: {
          type: "string",
          example: "Complete website redesign project",
        },
        tenantId: {
          type: "string",
          description: "Tenant ObjectId",
        },
        assignedTo: {
          type: "array",
          items: { type: "string" },
          description: "Array of employee User ObjectIds",
          example: ["507f1f77bcf86cd799439011"],
        },
        createdBy: {
          type: "string",
          description: "Creator User ObjectId",
        },
        isDeleted: {
          type: "boolean",
          default: false,
        },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
        __v: { type: "number" },
      },
    },
    Invite: {
      type: "object",
      properties: {
        _id: { type: "string" },
        email: {
          type: "string",
          format: "email",
          example: "newuser@example.com",
        },
        tenantId: { type: "string" },
        role: {
          type: "string",
          enum: ["admin", "employee"],
          default: "employee",
        },
        token: {
          type: "string",
          description: "JWT invite token",
        },
        expiresAt: {
          type: "string",
          format: "date-time",
        },
        status: {
          type: "string",
          enum: ["Pending", "Accepted", "Expired"],
          default: "Pending",
        },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
      },
    },
    ActivityMetric: {
      type: "object",
      properties: {
        _id: { type: "string" },
        tenantId: {
          type: "string",
          description: "Tenant ObjectId",
        },
        userId: {
          type: "string",
          description: "User ObjectId",
        },
        role: {
          type: "string",
          enum: ["owner", "admin", "employee"],
        },
        action: {
          type: "string",
          example: "CREATE_PROJECT",
        },
        resource: {
          type: "string",
          example: "Project",
        },
        metadata: {
          type: "object",
          default: {},
        },
        method: {
          type: "string",
          example: "POST",
        },
        path: {
          type: "string",
          example: "/projects/create",
        },
        statusCode: {
          type: "number",
          example: 200,
        },
        resourceType: {
          type: "string",
          example: "project",
        },
        resourceId: {
          type: "string",
        },
        ip: {
          type: "string",
          example: "192.168.1.1",
        },
        userAgent: {
          type: "string",
        },
        durationMs: {
          type: "number",
          example: 245,
        },
        success: {
          type: "boolean",
        },
        createdAt: {
          type: "string",
          format: "date-time",
        },
        updatedAt: {
          type: "string",
          format: "date-time",
        },
      },
    },
    PasswordResetToken: {
      type: "object",
      properties: {
        _id: { type: "string" },
        userId: {
          type: "string",
          description: "User ObjectId",
        },
        token: {
          type: "string",
          description: "Password reset JWT token",
        },
        expiresAt: {
          type: "string",
          format: "date-time",
          example: "2026-01-16T03:23:00.000Z",
        },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
      },
    },

    BlackListedTokens: {
      type: "object",
      properties: {
        _id: { type: "string" },
        token: {
          type: "string",
          description: "Blacklisted JWT token (access/refresh)",
        },
        expiresAt: {
          type: "string",
          format: "date-time",
          example: "2026-01-16T03:23:00.000Z",
        },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
      },
    },
    ErrorResponse: {
      type: "object",
      properties: {
        message: { type: "string" },
      },
    },
  },
};
