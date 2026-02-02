import request from "supertest";
import app from "../index.js";
import { prisma } from "../lib/prisma.js";
import { mockSsoLogin } from "../services/authService.js";

describe("Reservations API", () => {
  let token: string;
  const date = "2025-02-10";
  const timeSlot = "09:00";

  beforeAll(async () => {
    const login = await mockSsoLogin("api-res@test.com", "API Res");
    token = login.token;
  });

  afterAll(async () => {
    await prisma.reservation.deleteMany({ where: { date, timeSlot } });
    await prisma.employee.deleteMany({ where: { email: "api-res@test.com" } });
    await prisma.$disconnect();
  });

  it("POST /api/reservations without auth returns 401", async () => {
    const res = await request(app)
      .post("/api/reservations")
      .send({ date, timeSlot, numberOfPeople: 1 })
      .expect(401);
    expect(res.body.error).toBeDefined();
  });

  it("POST /api/reservations with invalid body returns 400", async () => {
    const res = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${token}`)
      .send({ date: "not-a-date", timeSlot, numberOfPeople: 1 })
      .expect(400);
    expect(res.body.errors).toBeDefined();
  });

  it("POST /api/reservations with valid body creates reservation", async () => {
    const res = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${token}`)
      .send({ date, timeSlot, numberOfPeople: 2 })
      .expect(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.date).toBe(date);
    expect(res.body.timeSlot).toBe(timeSlot);
    expect(Array.isArray(res.body.seatNumbers)).toBe(true);
    expect(res.body.seatNumbers).toHaveLength(2);
  });

  it("POST /api/reservations same date+slot again returns 400", async () => {
    const res = await request(app)
      .post("/api/reservations")
      .set("Authorization", `Bearer ${token}`)
      .send({ date, timeSlot, numberOfPeople: 1 })
      .expect(400);
    expect(res.body.error).toContain("already have a reservation");
  });

  it("GET /api/reservations returns my reservations", async () => {
    const res = await request(app)
      .get("/api/reservations")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    const match = res.body.find(
      (r: { date: string; timeSlot: string }) => r.date === date && r.timeSlot === timeSlot
    );
    expect(match).toBeDefined();
  });

  it("GET /api/reservations?date=&timeSlot= returns filtered", async () => {
    const res = await request(app)
      .get(`/api/reservations?date=${date}&timeSlot=${timeSlot}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeLessThanOrEqual(1);
    if (res.body.length === 1) {
      expect(res.body[0].date).toBe(date);
      expect(res.body[0].timeSlot).toBe(timeSlot);
    }
  });
});
