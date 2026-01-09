const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const components = require("./components");
const path = require("path");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "AccessPro RBAC API",
      version: "1.0.0",
      description: "Multi-tenant RBAC backend system",
    },
    servers: [
      {
        url: "http://localhost:5000",
        description: "Local server",
      },
    ],
    components,
    security: [{ bearerAuth: [] }],
  },

  apis: [path.join(__dirname, "../roots/*.js")],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = (app) => {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
};
