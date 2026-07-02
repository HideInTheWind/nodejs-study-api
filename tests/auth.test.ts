import request from "supertest";
import app from "../index.ts";
import prisma from "../src/lib/prisma.ts";

const testEmail = `todo-test-${Date.now()}@example.com`;
const password = "123456";
const name = "Todo测试用户";

let token: string;

const otherEmail = `todo-other-${Date.now()}@example.com`;
let otherToken: string;
let createdTodoId: number;

describe("Todo API", () => {
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

    await request(app).post("/api/auth/register").send({
      email: otherEmail,
      password,
      name: "其他用户",
    });

    const otherLogin = await request(app).post("/api/auth/login").send({
      email: otherEmail,
      password,
    });
    otherToken = otherLogin.body.token;
  });

  afterAll(async () => {
    await prisma.todo.deleteMany({
      where: { user: { email: testEmail } },
    });
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });

    await prisma.todo.deleteMany({
      where: { user: { email: otherEmail } },
    });
    await prisma.user.deleteMany({
      where: { email: otherEmail },
    });
    await prisma.$disconnect();
  });

  it("GET /api/todos without token returns 401", async () => {
    const res = await request(app).get("/api/todos");
    expect(res.status).toBe(401);
  });

  it("POST /api/todos creates todo", async () => {
    const res = await request(app)
      .post("/api/todos")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Jest 测试待办" });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe("Jest 测试待办");
    expect(res.body.done).toBe(false);

    createdTodoId = res.body.id;
  });

  it("GET /api/todos/:id returns 403 for other user", async () => {
    const res = await request(app)
      .get(`/api/todos/${createdTodoId}`)
      .set("Authorization", `Bearer ${otherToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Forbidden");
  });

  it("GET /api/todos returns only own todos", async () => {
    const res = await request(app)
      .get("/api/todos")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(
      res.body.some((t: { title: string }) => t.title === "Jest 测试待办"),
    ).toBe(true);
  });
});
