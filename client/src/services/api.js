
const API_BASE_URL =
    import.meta.env.VITE_API_URL || "https://sweety-blood-glucose-tracker-8fny.onrender.com/api";

export async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem("sweety_token");

    const headers = {
        "Content-Type": "application/json",
        ...options.headers
    };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || "Something went wrong.");
    }

    return data;
}
