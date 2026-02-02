import { useState, useEffect } from "react";
import {
  getTimeSlots,
  getAvailability,
  createReservation,
  getMyReservations,
  cancelReservation,
  type ReservationItem,
} from "../api/client";
import SeatMap from "../components/SeatMap";

function formatDate(d: string) {
  try {
    return new Date(d + "Z").toLocaleDateString("en-IN", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return d;
  }
}

type Step = 1 | 2 | 3;

export default function Dashboard() {
  const [step, setStep] = useState<Step>(1);
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [timeSlot, setTimeSlot] = useState("");
  const [numberOfPeople, setNumberOfPeople] = useState(1);
  const [availability, setAvailability] = useState<{
    date: string;
    timeSlot: string;
    totalSeats: number;
    taken: number;
    available: number;
    takenSeatNumbers: number[];
  } | null>(null);
  
  const [confirmedReservation, setConfirmedReservation] = useState<ReservationItem | null>(null);
  const [myReservations, setMyReservations] = useState<ReservationItem[]>([]);
  const [selectedSeatNumbers, setSelectedSeatNumbers] = useState<number[]>([]);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(false);

  useEffect(() => {
    getTimeSlots().then((res) => {
      if (res.data && res.data.length) {
        setTimeSlots(res.data);
        if (!timeSlot) setTimeSlot(res.data[0]);
      }
    });
  }, []);

  useEffect(() => {
    if (!timeSlot) return;
    getAvailability(date, timeSlot).then((res) => {
      if (res.data) setAvailability(res.data);
      else setAvailability(null);
    });
  }, [date, timeSlot]);

  const fetchMyReservations = async () => {
    setLoadingList(true);
    const res = await getMyReservations();
    setLoadingList(false);
    if (res.data) setMyReservations(res.data);
  };

  useEffect(() => {
    fetchMyReservations();
  }, []);

  const handleStep1Next = () => {
    setMessage(null);
    setSelectedSeatNumbers([]);
    if (availability && availability.available >= numberOfPeople) setStep(2);
    else setMessage({ type: "error", text: "Not enough seats for this slot. Pick another date or time." });
  };

  const handleToggleSeat = (seatNumber: number) => {
    setSelectedSeatNumbers((prev) =>
      prev.includes(seatNumber) ? prev.filter((n) => n !== seatNumber) : [...prev, seatNumber]
    );
  };

  const handleConfirmBooking = async () => {
    setMessage(null);
    setLoading(true);
    const res = await createReservation(
      date,
      timeSlot,
      numberOfPeople,
      selectedSeatNumbers.length === numberOfPeople ? selectedSeatNumbers : undefined
    );
    setLoading(false);
    
    if (res.error) {
      setMessage({ type: "error", text: res.error });
      return;
    }

    // FIX 1: Access res.data.reservation because of the new backend wrapper
    const responseData = res.data as any;
    if (responseData && responseData.reservation) {
      setConfirmedReservation(responseData.reservation);
      
      // Optional: Show manager charge message if it exists
      if (responseData.managerCharge) {
        setMessage({ 
          type: "success", 
          text: `Success! Charged: ${responseData.managerCharge.amount} Blu Dollars via ${responseData.managerCharge.managerName}` 
        });
      }

      setStep(3);
      fetchMyReservations();
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this reservation?")) return;
    const res = await cancelReservation(id);
    // Note: status 200 or 204 depending on your backend version
    if (res.status === 200 || res.status === 204) {
      setMessage({ type: "success", text: "Reservation cancelled." });
      if (confirmedReservation?.id === id) setConfirmedReservation(null);
      fetchMyReservations();
      if (date && timeSlot) getAvailability(date, timeSlot).then((r) => r.data && setAvailability(r.data));
    } else {
      setMessage({ type: "error", text: res.error ?? "Failed to cancel" });
    }
  };

  const startNewBooking = () => {
    setStep(1);
    setConfirmedReservation(null);
    setMessage(null);
  };

  const hasEnoughSeats = availability && availability.available >= numberOfPeople;
  const alreadyBookedThisSlot = myReservations.some((r) => r.date === date && r.timeSlot === timeSlot);

  return (
    <div className="container">
      <h1>Reserve a seat</h1>
      <p style={{ color: "var(--muted)", marginBottom: "1.5rem" }}>
        Choose date, time slot (1 hour), and number of people.
      </p>

      {message && (
        <div className={`alert alert-${message.type}`}>{message.text}</div>
      )}

      {step === 1 && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Select date, time & party size</h2>
          <div className="form-group">
            <label htmlFor="date">Date</label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={new Date().toISOString().slice(0, 10)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="timeSlot">Time slot (1 hour)</label>
            <select
              id="timeSlot"
              value={timeSlot}
              onChange={(e) => setTimeSlot(e.target.value)}
              className="select-input"
            >
              {timeSlots.map((s) => (
                <option key={s} value={s}>{s} – {String(Number(s.slice(0, 2)) + 1).padStart(2, "0")}:00</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="numberOfPeople">Number of people</label>
            <input
              id="numberOfPeople"
              type="number"
              min={1}
              max={100}
              value={numberOfPeople}
              onChange={(e) => setNumberOfPeople(Number(e.target.value) || 1)}
            />
          </div>
          {availability && (
            <p style={{ marginBottom: "1rem", color: "var(--muted)" }}>
              {availability.available} seats available for this slot.
            </p>
          )}
          {alreadyBookedThisSlot ? (
            <p style={{ color: "var(--warning)" }}>You already have a reservation for this slot.</p>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleStep1Next}
              disabled={!availability || !hasEnoughSeats}
            >
              Next – Choose seats
            </button>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Choose your seats</h2>
          <p><strong>{date}</strong>, <strong>{timeSlot}</strong> · Select <strong>{numberOfPeople}</strong> seat(s)</p>
          {availability && (
            <>
              <SeatMap
                takenSeatNumbers={availability.takenSeatNumbers}
                selectedSeatNumbers={selectedSeatNumbers}
                onToggleSeat={handleToggleSeat}
                maxSelection={numberOfPeople}
              />
              {selectedSeatNumbers.length > 0 && (
                <p style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
                  {/* FIX 2: Added safety check before sort/join */}
                  Selected: #{[...selectedSeatNumbers].sort((a, b) => a - b).join(", #")}
                </p>
              )}
            </>
          )}
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
            <button type="button" className="btn" onClick={() => { setStep(1); setSelectedSeatNumbers([]); }}>Back</button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleConfirmBooking}
              disabled={loading || selectedSeatNumbers.length !== numberOfPeople}
            >
              {loading ? "Booking…" : "Confirm booking"}
            </button>
          </div>
        </div>
      )}

      {step === 3 && confirmedReservation && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Booking confirmed</h2>
          <p style={{ color: "var(--success)" }}>Your reservation has been confirmed.</p>
          <ul style={{ listStyle: "none", padding: 0, margin: "1rem 0" }}>
            <li><strong>Date:</strong> {formatDate(confirmedReservation.date)}</li>
            <li><strong>Time slot:</strong> {confirmedReservation.timeSlot}</li>
            {/* FIX 3: Added safety check for .join() */}
            <li><strong>Seats:</strong> #{confirmedReservation.seatNumbers?.join(", #") || "Auto-assigned"}</li>
          </ul>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="button" className="btn btn-danger" onClick={() => handleCancel(confirmedReservation.id)}>Delete</button>
            <button type="button" className="btn btn-primary" onClick={startNewBooking}>Make another</button>
          </div>
        </div>
      )}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>My reservations</h2>
        {loadingList ? (
          <p style={{ color: "var(--muted)" }}>Loading…</p>
        ) : myReservations.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>No reservations yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {myReservations.map((r) => (
              <li key={r.id} className="reservation-item">
                <span>
                  {formatDate(r.date)} · {r.timeSlot} · 
                  {/* FIX 4: Safety check for the list mapping */}
                  Seat(s) #{r.seatNumbers?.join(", #") || "N/A"}
                </span>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => handleCancel(r.id)}>Cancel</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
