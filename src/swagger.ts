import swaggerJsDoc from "swagger-jsdoc";

const options: swaggerJsDoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Node study API",
      version: "1.0.0",
      description: "学习任务写作api",
    },
    servers: [
      {
        url: "http://localhost:8080",
      },
    ],
    paths: {
      "/api/auth/register": {
        post: {
          summary: "注册用户",
          tags: ["Auth"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password", "name"],
                  properties: {
                    email: {
                      type: "string",
                      example: "test@example.com",
                    },
                    password: {
                      type: "string",
                      minLength: 6,
                      example: "123456",
                    },
                    name: { type: "string", example: "张三" },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "用户注册成功",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      id: { type: "integer" },
                      email: { type: "string" },
                      name: { type: "string" },
                    },
                  },
                },
              },
            },
            "400": {
              description: "请求参数错误或为空",
            },
            "409": { description: "邮箱已注册" },
          },
        },
      },
      "/api/auth/login": {
        post: {
          summary: "登录",
          tags: ["Auth"],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: {
                      type: "string",
                      example: "test@example.com",
                    },
                    password: {
                      type: "string",
                      example: "123456",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "登录成功",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      token: { type: "string" },
                      user: {
                        type: "object",
                        properties: {
                          id: { type: "integer" },
                          email: { type: "string" },
                          name: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
            "400": {
              description: "请求参数错误或为空",
            },
            "401": {
              description: "邮箱或密码错误",
            },
          },
        },
      },
      "/api/todos": {
        get: {
          summary: "获取当前用户的待办列表",
          tags: ["Todo"],
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "成功",
            },
            "401": {
              description: "未授权或token无效",
            },
          },
        },
        post: {
          summary: "创建一个新的待办事项",
          tags: ["Todo"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["title"],
                  properties: {
                    title: {
                      type: "string",
                      example: "学习 Swagger",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "创建成功" },
            "400": { description: "请求参数错误或为空" },
            "401": { description: "未授权或token无效" },
          },
        },
      },
      "/api/todos/{id}": {
        get: {
          summary: "获取单个待办事项",
          tags: ["Todo"],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: {
            "200": {
              description: "成功",
            },
            "404": {
              description: "不存在",
            },
            "403": {
              description: "非本人",
            },
            "401": {
              description: "未登录",
            },
          },
        },
        put: {
          summary: "更新一个待办事项",
          tags: ["Todo"],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    title: {
                      type: "string",
                      example: "学习 Swagger",
                    },
                    done: {
                      type: "boolean",
                      example: false,
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "成功" },
            "400": { description: "请求参数错误或为空" },
            "401": { description: "未登录" },
            "403": { description: "非本人" },
            "404": { description: "不存在" },
          },
        },
        delete: {
          summary: "删除一个待办事项",
          tags: ["Todo"],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: {
            "204": { description: "删除成功" },
            "401": { description: "未登录" },
            "403": { description: "非本人" },
            "404": { description: "不存在" },
          },
        },
      },
      "/api/products": {
        get: {
          summary: "获取所有商品",
          tags: ["Product"],
          responses: {
            "200": { description: "成功" },
          },
        },
      },
      "/api/products/{id}": {
        get: {
          summary: "获取单个商品",
          tags: ["Product"],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: {
            "200": { description: "成功" },
            "404": { description: "不存在" },
          },
        },
      },
      "/api/orders": {
        get: {
          summary: "获取当前用户的订单",
          tags: ["Order"],
          security: [{ bearerAuth: [] }],
          responses: {
            "200": { description: "成功" },
            "401": { description: "未登录" },
          },
        },
        post: {
          summary: "创建一个订单",
          tags: ["Order"],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["items"],
                  properties: {
                    items: {
                      type: "array",
                      required: ["productId", "quantity"],
                      properties: {
                        productId: {
                          type: "integer",
                          example: 1,
                        },
                        quantity: {
                          type: "integer",
                          example: 1,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "创建成功" },
            "400": { description: "请求参数错误或为空" },
            "401": { description: "未登录" },
          },
        },
      },
      "/api/orders/{id}": {
        get: {
          summary: "获取单个订单",
          tags: ["Order"],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "integer" },
            },
          ],
          responses: {
            "200": { description: "成功" },
            "404": { description: "不存在" },
            "401": { description: "未登录" },
            "403": { description: "非本人" },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsDoc(options);
