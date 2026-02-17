import "dotenv/config";
import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.js";
import { w3AuthRouter } from "./routes/w3Auth.js";
import { reservationRouter } from "./routes/reservations.js";
import { availabilityRouter } from "./routes/availabilityt.js";
import { employeeRouter } from "./routes/employeess.js";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swaggers.js";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/auth", authRouter);
app.use("/api/auth/w3", w3AuthRouter);
app.use("/api/reservations", reservationRouter);
app.use("/api/availability", availabilityRouter);
app.use("/api/employees", employeeRouter);

app.get("/", (_req, res) => {
  res.json({
    service: "Cafeteria Seat Reservation API",
    docs: "/api-docs",
    health: "/health",
    api: {
      auth: "/api/auth",
      reservations: "/api/reservations",
      availability: "/api/availability",
      "availability/time-slots": "/api/availability/time-slots",
      employees: "/api/employees",
    },
  });
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "cafeteria-seat-reservation" });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Swagger UI: http://localhost:${PORT}/api-docs`);
  });
}

export default app;
