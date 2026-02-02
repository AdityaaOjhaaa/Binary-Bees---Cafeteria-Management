import { prisma } from "../lib/prisma.js";
import { SEAT_CAPACITY, TIME_SLOTS, RESERVATION_COST } from "../config/constants.js";

const SEAT_NUMBERS = Array.from({ length: SEAT_CAPACITY }, (_, i) => i + 1);

/**
 * Get list of seat numbers already taken for a date + time slot.
 */
export async function getTakenSeatsForDateAndSlot(
  date: string,
  timeSlot: string
): Promise<number[]> {
  const reservations = await prisma.reservation.findMany({
    where: { date, timeSlot },
    select: { seatNumbers: true },
  });
  return reservations.flatMap((r) => r.seatNumbers);
}

/**
 * Check if employee already has a reservation for this date + time slot.
 */
export async function hasEmployeeReservationForDateAndSlot(
  employeeId: string,
  date: string,
  timeSlot: string
): Promise<boolean> {
  const existing = await prisma.reservation.findFirst({
    where: { employeeId, date, timeSlot },
  });
  return !!existing;
}

/**
 * Find next N available seat numbers for date + slot.
 */
export async function findNextAvailableSeats(
  date: string,
  timeSlot: string,
  count: number
): Promise<number[] | null> {
  const taken = await getTakenSeatsForDateAndSlot(date, timeSlot);
  const available: number[] = [];

  for (const n of SEAT_NUMBERS) {
    if (!taken.includes(n)) available.push(n);
    if (available.length >= count) return available;
  }

  return null;
}

/**
 * Create a reservation and deduct Blu Dollars from manager.
 */
export async function createReservation(
  employeeId: string,
  date: string,
  timeSlot: string,
  numberOfPeople: number,
  requestedSeatNumbers?: number[]
): Promise<
  | {
      success: true;
      reservation: {
        id: string;
        date: string;
        timeSlot: string;
        seatNumbers: number[];
      };
      managerCharge: {
        managerName: string;
        amount: number;
        type: "debit";
      };
    }
  | { success: false; error: string }
> {
  // --------------------
  // Validations
  // --------------------
  if (numberOfPeople < 1 || numberOfPeople > SEAT_CAPACITY) {
    return {
      success: false,
      error: `Number of people must be between 1 and ${SEAT_CAPACITY}`,
    };
  }

  if (!(TIME_SLOTS as readonly string[]).includes(timeSlot)) {
    return { success: false, error: "Invalid time slot" };
  }

  const alreadyBooked = await hasEmployeeReservationForDateAndSlot(
    employeeId,
    date,
    timeSlot
  );
  if (alreadyBooked) {
    return {
      success: false,
      error: "You already have a reservation for this date and time slot",
    };
  }

  // --------------------
  // Seat selection
  // --------------------
  let seatNumbers: number[];

  if (requestedSeatNumbers && requestedSeatNumbers.length === numberOfPeople) {
    const taken = await getTakenSeatsForDateAndSlot(date, timeSlot);

    const invalid = requestedSeatNumbers.some(
      (n) => n < 1 || n > SEAT_CAPACITY || taken.includes(n)
    );
    const duplicates =
      new Set(requestedSeatNumbers).size !== requestedSeatNumbers.length;

    if (invalid || duplicates) {
      return {
        success: false,
        error: "One or more selected seats are no longer available",
      };
    }

    seatNumbers = [...requestedSeatNumbers].sort((a, b) => a - b);
  } else {
    const nextSeats = await findNextAvailableSeats(
      date,
      timeSlot,
      numberOfPeople
    );
    if (!nextSeats) {
      return {
        success: false,
        error: "Not enough seats available for this time slot",
      };
    }
    seatNumbers = nextSeats;
  }

  // --------------------
  // Fetch employee & manager
  // --------------------
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { managerId: true },
  });

  const managerId = employee?.managerId;

  // MODIFIED: Check if manager exists before attempting deduction logic
  if (managerId) {
    const manager = await prisma.manager.findUnique({
      where: { id: managerId },
    });

    if (manager) {
      const totalCost = numberOfPeople * RESERVATION_COST;

      if (manager.bluDollars < totalCost) {
        return {
          success: false,
          error: "Manager has insufficient Blu Dollars",
        };
      }

      // Execute with manager deduction
      return await prisma.$transaction(async (tx) => {
        await tx.manager.update({
          where: { id: managerId },
          data: {
            bluDollars: { decrement: totalCost },
          },
        });

        const reservation = await tx.reservation.create({
          data: { employeeId, date, timeSlot, seatNumbers },
        });

        return {
          success: true,
          reservation: {
            id: reservation.id,
            date: reservation.date,
            timeSlot: reservation.timeSlot,
            seatNumbers: reservation.seatNumbers,
          },
          managerCharge: {
            managerName: manager.name,
            amount: totalCost,
            type: "debit",
          },
        };
      });
    }
  }

  // FALLBACK: Create reservation without manager deduction if no manager is assigned
  const reservation = await prisma.reservation.create({
    data: { employeeId, date, timeSlot, seatNumbers },
  });

  return {
    success: true,
    reservation: {
      id: reservation.id,
      date: reservation.date,
      timeSlot: reservation.timeSlot,
      seatNumbers: reservation.seatNumbers,
    },
    managerCharge: {
      managerName: "System (No Manager Assigned)",
      amount: 0,
      type: "debit",
    },
  };
}

/**
 * Get reservation for employee on date + time slot.
 */
export async function getEmployeeReservationForDateAndSlot(
  employeeId: string,
  date: string,
  timeSlot: string
) {
  return prisma.reservation.findFirst({
    where: { employeeId, date, timeSlot },
  });
}

/**
 * Get all reservations for an employee.
 */
export async function getReservationsByEmployee(employeeId: string) {
  return prisma.reservation.findMany({
    where: { employeeId },
    orderBy: [{ date: "asc" }, { timeSlot: "asc" }],
  });
}

/**
 * Cancel reservation and refund Blu Dollars to manager.
 */
export async function cancelReservation(
  employeeId: string,
  reservationId: string
): Promise<
  | {
      managerName: string;
      amount: number;
      type: "credit";
    }
  | null
> {
  const reservation = await prisma.reservation.findFirst({
    where: { id: reservationId, employeeId },
  });

  if (!reservation) return null;

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { managerId: true },
  });

  const managerId = employee?.managerId;
  
  // Refund logic only if manager exists
  if (managerId) {
    const manager = await prisma.manager.findUnique({
      where: { id: managerId },
    });

    if (manager) {
      const refundAmount = reservation.seatNumbers.length * RESERVATION_COST;

      await prisma.$transaction(async (tx) => {
        await tx.reservation.delete({
          where: { id: reservationId },
        });

        await tx.manager.update({
          where: { id: managerId },
          data: {
            bluDollars: { increment: refundAmount },
          },
        });
      });

      return {
        managerName: manager.name,
        amount: refundAmount,
        type: "credit",
      };
    }
  }

  // Fallback for cancellation without manager
  await prisma.reservation.delete({
    where: { id: reservationId },
  });

  return {
    managerName: "System",
    amount: 0,
    type: "credit",
  };
}
