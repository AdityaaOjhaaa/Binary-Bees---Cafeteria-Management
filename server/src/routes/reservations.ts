import { Router, Request, Response } from "express";
import { body, param, query, validationResult } from "express-validator";
import { authMiddleware } from "../middleware/auth.js";
import {
  createReservation,
  getEmployeeReservationForDateAndSlot,
  getReservationsByEmployee,
  cancelReservation,
} from "../services/reservationService.js";
import { TIME_SLOTS } from "../config/constants.js";

export const reservationRouter = Router();
reservationRouter.use(authMiddleware);

/**
 * @openapi
 * /api/reservations:
 *   post:
 *     summary: Reserve seats for a date and time slot
 *     description: One reservation per employee per date per time slot. Party size 1..100.
 *     tags: [Reservations]
 *     security: [bearerAuth: []]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [date, timeSlot, numberOfPeople]
 *             properties:
 *               date: { type: string, format: date }
 *               timeSlot: { type: string, example: "09:00" }
 *               numberOfPeople: { type: integer, minimum: 1, maximum: 100 }
 *     responses:
 *       201:
 *         description: Reservation created (id, date, timeSlot, seatNumbers)
 *       400:
 *         description: Validation or business rule error
 *       401:
 *         description: Unauthorized
 */
reservationRouter.post(
  "/",
  body("date").isDate({ format: "YYYY-MM-DD", strictMode: true }),
  body("timeSlot").isIn([...TIME_SLOTS]),
  body("numberOfPeople").isInt({ min: 1, max: 100 }),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    const employeeId = (req as Request & { user: { employeeId: string } }).user.employeeId;
    const { date, timeSlot, numberOfPeople, seatNumbers } = req.body as {
      date: string;
      timeSlot: string;
      numberOfPeople: number;
      seatNumbers?: number[];
    };
    const result = await createReservation(
      employeeId,
      date,
      timeSlot,
      numberOfPeople,
      seatNumbers
    );
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    // res.status(201).json(result.reservation);
    res.status(201).json(result);

  }
);

/**
 * @openapi
 * /api/reservations:
 *   get:
 *     summary: List my reservations
 *     tags: [Reservations]
 *     security: [bearerAuth: []]
 *     parameters:
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: timeSlot
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of reservations (id, date, timeSlot, seatNumbers)
 *       401:
 *         description: Unauthorized
 */
reservationRouter.get(
  "/",
  query("date").optional().isDate({ format: "YYYY-MM-DD", strictMode: true }),
  query("timeSlot").optional().isIn([...TIME_SLOTS]),
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }
    const employeeId = (req as Request & { user: { employeeId: string } }).user.employeeId;
    const date = req.query.date as string | undefined;
    const timeSlot = req.query.timeSlot as string | undefined;
    if (date && timeSlot) {
      const one = await getEmployeeReservationForDateAndSlot(employeeId, date, timeSlot);
      res.json(one ? [one] : []);
      return;
    }
    const list = await getReservationsByEmployee(employeeId);
    res.json(list);
  }
);

/**
 * @openapi
 * /api/reservations/{id}:
 *   delete:
 *     summary: Cancel my reservation
 *     tags: [Reservations]
 *     security: [bearerAuth: []]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Cancelled
 *       404:
 *         description: Reservation not found or not owned
 *       401:
 *         description: Unauthorized
 */
reservationRouter.delete("/:id", param("id").notEmpty(), async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }
  const employeeId = (req as Request & { user: { employeeId: string } }).user.employeeId;
  const id = req.params.id;
  const cancelled = await cancelReservation(employeeId, id);
  if (!cancelled) {
    res.status(404).json({ error: "Reservation not found or you cannot cancel it" });
    return;
  }
  // res.status(204).send();
  res.status(200).json(cancelled);

});
