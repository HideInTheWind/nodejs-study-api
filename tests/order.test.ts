import request from "supertest";
import app from "../index.ts";
import prisma from "../src/lib/prisma.ts";

const testEmail = `order-test-${Date.now()}@example.com`;
const password = "123456";
const name = "Order测试用户";

let token: string;
let productId: number;
let initialStock: number;

describe("Order API", () => {
  beforeAll(async () => {
    await request(app).post("/api/auth/register").send({
      email: testEmail,
      password,
      name,
    });

    const loginRes = await request(app).post("/api/auth/login").send({
      email: testEmail,
      password,
    });
    token = loginRes.body.token;

    const product = await prisma.product.create({
      data: {
        name: `jest-product-${Date.now()}`,
        price: 19.99,
        stock: 5,
      },
    });
    productId = product.id;
    initialStock = product.stock;
  });

  afterAll(async () => {
    await prisma.orderItem.deleteMany({
      where: { order: { user: { email: testEmail } } },
    });
    await prisma.order.deleteMany({
      where: { user: { email: testEmail } },
    });
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });
    await prisma.product.delete({
      where: { id: productId },
    });
    await prisma.$disconnect();
  });

  it("POST /api/orders without token returns 401", async () => {
    const res = await request(app)
      .post("/api/orders")
      .send({ items: [{ productId, quantity: 1 }] });

    expect(res.status).toBe(401);
  });

  it("POST /api/orders creates order and decrements stock", async () => {
    const res = await request(app)
      .post("/api/orders")
      .set("Authorization", `Bearer ${token}`)
      .send({ items: [{ productId, quantity: 1 }] });

    expect(res.status).toBe(201);
    expect(res.body.userId).toBeDefined();
    expect(res.body.orderItems).toHaveLength(1);
    expect(res.body.orderItems[0].productId).toBe(productId);

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    expect(product!.stock).toBe(initialStock - 1);
  });

  it("GET /api/orders returns own orders", async () => {
    const res = await request(app)
      .get("/api/orders")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });
});
