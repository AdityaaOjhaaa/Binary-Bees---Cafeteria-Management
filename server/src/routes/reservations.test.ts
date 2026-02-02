import {
  getTakenSeatsForDateAndSlot,
  hasEmployeeReservationForDateAndSlot,
  findNextAvailableSeats,
  createReservation,
  getEmployeeReservationForDateAndSlot,
  getReservationsByEmployee,
  cancelReservation,
} from "./reservationService.js";
import { prisma } from "../lib/prisma.js";

const testDate = "2025-02-01";
const testDate2 = "2025-02-02";
const testSlot = "09:00";
const testSlot2 = "10:00";

describe("reservationService", () => {
  let employeeId1: string;
  let employeeId2: string;

  beforeAll(async () => {
    const e1 = await prisma.employee.create({
      data: { w3Id: "w3-test-1", email: "a@test.com", name: "Alice", location: "Bangalore" },
    });
    const e2 = await prisma.employee.create({
      data: { w3Id: "w3-test-2", email: "b@test.com", name: "Bob", location: "Bangalore" },
    });
    employeeId1 = e1.id;
    employeeId2 = e2.id;
  });

  afterAll(async () => {
    await prisma.reservation.deleteMany({});
    await prisma.employee.deleteMany({ where: { w3Id: { startsWith: "w3-test-" } } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.reservation.deleteMany({
      where: { date: { in: [testDate, testDate2] } },
    });
  });

  describe("getTakenSeatsForDateAndSlot", () => {
    it("returns empty array when no reservations", async () => {
      const taken = await getTakenSeatsForDateAndSlot(testDate, testSlot);
      expect(taken).toEqual([]);
    });
    it("returns taken seat numbers for date+slot", async () => {
      await prisma.reservation.create({
        data: { employeeId: employeeId1, date: testDate, timeSlot: testSlot, seatNumbers: [5, 6] },
      });
      await prisma.reservation.create({
        data: { employeeId: employeeId2, date: testDate2, timeSlot: testSlot, seatNumbers: [10] },
      });
      const taken = await getTakenSeatsForDateAndSlot(testDate, testSlot);
      expect(taken).toContain(5);
      expect(taken).toContain(6);
      expect(taken).not.toContain(10);
    });
  });

  describe("hasEmployeeReservationForDateAndSlot", () => {
    it("returns false when no reservation", async () => {
      const has = await hasEmployeeReservationForDateAndSlot(employeeId1, testDate, testSlot);
      expect(has).toBe(false);
    });
    it("returns true when employee has reservation", async () => {
      await prisma.reservation.create({
        data: { employeeId: employeeId1, date: testDate, timeSlot: testSlot, seatNumbers: [1] },
      });
      const has = await hasEmployeeReservationForDateAndSlot(employeeId1, testDate, testSlot);
      expect(has).toBe(true);
    });
  });

  describe("findNextAvailableSeats", () => {
    it("returns [1,2,3] when no reservations and count 3", async () => {
      const seats = await findNextAvailableSeats(testDate, testSlot, 3);
      expect(seats).toEqual([1, 2, 3]);
    });
    it("returns next available when some taken", async () => {
      await prisma.reservation.create({
        data: { employeeId: employeeId1, date: testDate, timeSlot: testSlot, seatNumbers: [1, 2] },
      });
      const seats = await findNextAvailableSeats(testDate, testSlot, 2);
      expect(seats).toEqual([3, 4]);
    });
  });

  describe("createReservation", () => {
    it("creates reservation when rules pass", async () => {
      const result = await createReservation(employeeId1, testDate, testSlot, 2);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.reservation.date).toBe(testDate);
        expect(result.reservation.timeSlot).toBe(testSlot);
        expect(result.reservation.seatNumbers).toHaveLength(2);
        expect(result.reservation.seatNumbers).toContain(1);
        expect(result.reservation.seatNumbers).toContain(2);
      }
    });
    it("rejects second reservation same employee same date+slot", async () => {
      await createReservation(employeeId1, testDate, testSlot, 1);
      const result = await createReservation(employeeId1, testDate, testSlot, 1);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error).toContain("already have a reservation");
    });
    it("allows same employee different slot same day", async () => {
      const r1 = await createReservation(employeeId1, testDate, testSlot, 1);
      const r2 = await createReservation(employeeId1, testDate, testSlot2, 1);
      expect(r1.success).toBe(true);
      expect(r2.success).toBe(true);
    });
  });

  describe("getEmployeeReservationForDateAndSlot", () => {
    it("returns null when no reservation", async () => {
      const r = await getEmployeeReservationForDateAndSlot(employeeId1, testDate, testSlot);
      expect(r).toBeNull();
    });
    it("returns reservation when exists", async () => {
      await createReservation(employeeId1, testDate, testSlot, 1);
      const r = await getEmployeeReservationForDateAndSlot(employeeId1, testDate, testSlot);
      expect(r).not.toBeNull();
      expect(r?.date).toBe(testDate);
      expect(r?.timeSlot).toBe(testSlot);
    });
  });

  describe("getReservationsByEmployee", () => {
    it("returns all reservations for employee", async () => {
      await createReservation(employeeId1, testDate, testSlot, 1);
      await createReservation(employeeId1, testDate, testSlot2, 1);
      const list = await getReservationsByEmployee(employeeId1);
      expect(list.length).toBe(2);
    });
  });

  describe("cancelReservation", () => {
    it("deletes own reservation and returns true", async () => {
      const created = await createReservation(employeeId1, testDate, testSlot, 1);
      if (!created.success) throw new Error("create failed");
      const res = await prisma.reservation.findFirst({
        where: { employeeId: employeeId1, date: testDate, timeSlot: testSlot },
      });
      expect(res).not.toBeNull();
      const cancelled = await cancelReservation(employeeId1, res!.id);
      expect(cancelled).toBe(true);
      const after = await getEmployeeReservationForDateAndSlot(employeeId1, testDate, testSlot);
      expect(after).toBeNull();
    });
    it("returns false when reservation belongs to another employee", async () => {
      const created = await createReservation(employeeId1, testDate, testSlot, 1);
      if (!created.success) throw new Error("create failed");
      const res = await prisma.reservation.findFirst({
        where: { employeeId: employeeId1, date: testDate, timeSlot: testSlot },
      });
      expect(res).not.toBeNull();
      const cancelled = await cancelReservation(employeeId2, res!.id);
      expect(cancelled).toBe(false);
    });
  });
});
