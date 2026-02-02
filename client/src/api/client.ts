const getToken = () => localStorage.getItem("cafeteria_auth");

// FORCING the Render URL here to bypass the 404 issue
const API_BASE_URL = "https://cafeteria-api-t06o.onrender.com";

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<{ data?: T; error?: string; status: number }> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  
  if (token) (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;

  // Ensure every request hits Render
  const fullPath = path.startsWith("http") 
    ? path 
    : `${API_BASE_URL}/api${path}`;

  const res = await fetch(fullPath, {
    ...options,
    headers,
  });

  const text = await res.text();
  let data: T | undefined;
  if (text) {
    try {
      data = JSON.parse(text) as T;
    } catch {
      // non-JSON response
    }
  }

  if (!res.ok) {
    const error = (data as { error?: string })?.error ?? res.statusText;
    return { error, status: res.status, data };
  }
  return { data: data ?? (undefined as T), status: res.status };
}

// ----------------------------------
// AUTH
// ----------------------------------
export async function login(email: string, name: string) {
  return request<{ token: string; employee: { id: string; email: string; name: string } }>(
    "/auth/login",
    { method: "POST", body: JSON.stringify({ email, name }) }
  );
}

// ----------------------------------
// AVAILABILITY
// ----------------------------------
export async function getTimeSlots() {
  return request<string[]>("/availability/time-slots");
}

export async function getAvailability(date: string, timeSlot: string) {
  return request<{
    date: string;
    timeSlot: string;
    totalSeats: number;
    taken: number;
    available: number;
    takenSeatNumbers: number[];
  }>(`/availability?date=${encodeURIComponent(date)}&timeSlot=${encodeURIComponent(timeSlot)}`);
}

// ----------------------------------
// RESERVATIONS
// ----------------------------------
export type ReservationItem = {
  id: string;
  date: string;
  timeSlot: string;
  seatNumbers: number[];
};

export async function createReservation(
  date: string,
  timeSlot: string,
  numberOfPeople: number,
  seatNumbers?: number[]
) {
  return request<{ id: string; date: string; timeSlot: string; seatNumbers: number[] }>(
    "/reservations",
    {
      method: "POST",
      body: JSON.stringify(
        seatNumbers?.length ? { date, timeSlot, numberOfPeople, seatNumbers } : { date, timeSlot, numberOfPeople }
      ),
    }
  );
}

export async function getMyReservations(date?: string, timeSlot?: string) {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  if (timeSlot) params.set("timeSlot", timeSlot);
  const q = params.toString() ? `?${params}` : "";
  return request<ReservationItem[]>(`/reservations${q}`);
}

export async function cancelReservation(id: string) {
  return request(`/reservations/${id}`, { method: "DELETE" });
}

// ----------------------------------
// EMPLOYEE
// ----------------------------------
export async function getMe() {
  return request<{ id: string; email: string; name: string; location: string }>("/employees/me");
}
