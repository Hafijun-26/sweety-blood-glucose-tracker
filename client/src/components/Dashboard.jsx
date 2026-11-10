
import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import "./Dashboard.css";

function getToday() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// Convert PostgreSQL date response into a local date string.
// PostgreSQL DATE values may arrive as UTC timestamps.
function formatDatabaseDate(value) {
    if (!value) return "";

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
    }

    const date = new Date(value);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function Dashboard({ user, onLogout }) {
    const [selectedDate, setSelectedDate] = useState(getToday());

    const [readings, setReadings] = useState([]);
    const [dailyReport, setDailyReport] = useState(null);
    const [monthReport, setMonthReport] = useState(null);
    const [previousMonthReport, setPreviousMonthReport] = useState(null);

    const [form, setForm] = useState({
        reading_date: getToday(),
        slot: "Morning fasting",
        glucose_value: ""
    });

    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const loadDashboard = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const [
                readingsData,
                dailyData,
                monthData,
                previousMonthData
            ] = await Promise.all([
                apiRequest("/glucose"),
                apiRequest(`/reports/daily?date=${selectedDate}`),
                apiRequest(`/reports/month-to-date?date=${selectedDate}`),
                apiRequest("/reports/monthly")
            ]);

            setReadings(readingsData.readings || []);
            setDailyReport(dailyData);
            setMonthReport(monthData);
            setPreviousMonthReport(previousMonthData);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [selectedDate]);

    useEffect(() => {
        loadDashboard();
    }, [loadDashboard]);

    function handleFormChange(event) {
        setForm({
            ...form,
            [event.target.name]: event.target.value
        });
    }

    async function handleSubmit(event) {
        event.preventDefault();

        setSaving(true);
        setError("");
        setMessage("");

        try {
            const payload = {
                reading_date: form.reading_date,
                slot: form.slot,
                glucose_value: Number(form.glucose_value)
            };

            if (editingId) {
                await apiRequest(`/glucose/${editingId}`, {
                    method: "PUT",
                    body: JSON.stringify(payload)
                });

                setMessage("Reading updated successfully!");
            } else {
                await apiRequest("/glucose", {
                    method: "POST",
                    body: JSON.stringify(payload)
                });

                setMessage("Reading added successfully!");
            }

            setEditingId(null);

            setForm({
                reading_date: selectedDate,
                slot: "Morning fasting",
                glucose_value: ""
            });

            await loadDashboard();

        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    function handleEdit(reading) {
        setEditingId(reading.id);

        setForm({
            reading_date: formatDatabaseDate(reading.reading_date),
            slot: reading.slot,
            glucose_value: String(reading.glucose_value)
        });

        setMessage("");
        setError("");

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }

    async function handleDelete(id) {
        const confirmed = window.confirm(
            "Are you sure you want to delete this reading?"
        );

        if (!confirmed) return;

        setError("");
        setMessage("");

        try {
            await apiRequest(`/glucose/${id}`, {
                method: "DELETE"
            });

            setMessage("Reading deleted successfully!");
            await loadDashboard();

        } catch (err) {
            setError(err.message);
        }
    }

    function cancelEdit() {
        setEditingId(null);

        setForm({
            reading_date: selectedDate,
            slot: "Morning fasting",
            glucose_value: ""
        });

        setError("");
        setMessage("");
    }

    function displayValue(value) {
        if (value === null || value === undefined) {
            return "--";
        }

        return Number(value).toFixed(1);
    }

    return (
        <div className="dashboard-page">

            <header className="dashboard-header">
                <div className="dashboard-brand">
                    <div className="dashboard-logo">♥</div>
                    <span>Sweety</span>
                </div>

                <div className="header-user">
                    <div>
                        <strong>{user.name}</strong>
                        <span>{user.email}</span>
                    </div>

                    <button onClick={onLogout}>
                        Logout
                    </button>
                </div>
            </header>

            <main className="dashboard-container">

                <section className="welcome-section">
                    <div>
                        <h1>Hello, {user.name}!</h1>
                        <p>
                            Welcome to your blood glucose dashboard.
                        </p>
                    </div>

                    <div className="date-filter">
                        <label htmlFor="reportDate">
                            Report date
                        </label>

                        <input
                            id="reportDate"
                            type="date"
                            value={selectedDate}
                            max={getToday()}
                            onChange={(event) => {
                                setSelectedDate(event.target.value);
                            }}
                        />
                    </div>
                </section>

                {error && (
                    <div className="dashboard-alert error">
                        {error}
                    </div>
                )}

                {message && (
                    <div className="dashboard-alert success">
                        {message}
                    </div>
                )}

                <section className="summary-grid">

                    <div className="summary-card">
                        <span>Total Readings</span>
                        <h2>
                            {dailyReport?.summary?.count ?? "--"}
                        </h2>
                        <p>Selected day</p>
                    </div>

                    <div className="summary-card">
                        <span>Highest Reading</span>
                        <h2>
                            {displayValue(
                                dailyReport?.summary?.highest
                            )}
                        </h2>
                        <p>mg/dL</p>
                    </div>

                    <div className="summary-card">
                        <span>Lowest Reading</span>
                        <h2>
                            {displayValue(
                                dailyReport?.summary?.lowest
                            )}
                        </h2>
                        <p>mg/dL</p>
                    </div>

                    <div className="summary-card">
                        <span>Average Reading</span>
                        <h2>
                            {displayValue(
                                dailyReport?.summary?.average
                            )}
                        </h2>
                        <p>mg/dL</p>
                    </div>

                </section>

                <section className="dashboard-section">
                    <div className="section-heading">
                        <div>
                            <h2>
                                {editingId
                                    ? "Update Reading"
                                    : "Add Glucose Reading"}
                            </h2>

                            <p>
                                Record your glucose measurement.
                            </p>
                        </div>
                    </div>

                    <form
                        className="reading-form"
                        onSubmit={handleSubmit}
                    >
                        <div className="form-field">
                            <label>Reading Date</label>

                            <input
                                type="date"
                                name="reading_date"
                                value={form.reading_date}
                                max={getToday()}
                                onChange={handleFormChange}
                                required
                            />
                        </div>

                        <div className="form-field">
                            <label>Reading Slot</label>

                            <select
                                name="slot"
                                value={form.slot}
                                onChange={handleFormChange}
                                required
                            >
                                <option>Morning fasting</option>
                                <option>After breakfast</option>
                                <option>After lunch</option>
                                <option>After dinner</option>
                            </select>
                        </div>

                        <div className="form-field">
                            <label>Glucose Value (mg/dL)</label>

                            <input
                                type="number"
                                name="glucose_value"
                                placeholder="Enter value"
                                min="40"
                                max="600"
                                step="1"
                                value={form.glucose_value}
                                onChange={handleFormChange}
                                required
                            />
                        </div>

                        <div className="form-actions">
                            <button
                                type="submit"
                                disabled={saving}
                            >
                                {saving
                                    ? "Please wait..."
                                    : editingId
                                        ? "Update Reading"
                                        : "Add Reading"}
                            </button>

                            {editingId && (
                                <button
                                    type="button"
                                    className="cancel-button"
                                    onClick={cancelEdit}
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </section>

                <section className="dashboard-section">
                    <div className="section-heading">
                        <div>
                            <h2>Daily Readings</h2>
                            <p>
                                Your readings for {selectedDate}.
                            </p>
                        </div>
                    </div>

                    {loading ? (
                        <p className="empty-message">
                            Loading readings...
                        </p>
                    ) : dailyReport?.readings?.length > 0 ? (

                        <div className="table-wrapper">
                            <table className="readings-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Slot</th>
                                        <th>Value</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {dailyReport.readings.map((reading) => (
                                        <tr key={reading.id}>
                                            <td>
                                                {formatDatabaseDate(
                                                    reading.reading_date
                                                )}
                                            </td>

                                            <td>{reading.slot}</td>

                                            <td>
                                                <strong>
                                                    {reading.glucose_value}
                                                    {" "}mg/dL
                                                </strong>
                                            </td>

                                            <td className="table-actions">
                                                <button
                                                    className="edit-button"
                                                    onClick={() =>
                                                        handleEdit(reading)
                                                    }
                                                >
                                                    Edit
                                                </button>

                                                <button
                                                    className="delete-button"
                                                    onClick={() =>
                                                        handleDelete(reading.id)
                                                    }
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                    ) : (
                        <p className="empty-message">
                            No readings found for this date.
                            Add your first reading above.
                        </p>
                    )}
                </section>

                <section className="reports-section">
                    <div className="section-heading">
                        <div>
                            <h2>Reports Overview</h2>
                            <p>
                                Summary for your selected reporting periods.
                            </p>
                        </div>
                    </div>

                    <div className="report-grid">

                        <div className="report-card">
                            <h3>Month to Date</h3>

                            <p>
                                {monthReport?.startDate} to{" "}
                                {monthReport?.endDate}
                            </p>

                            <strong>
                                {monthReport?.summary?.count ?? "--"}
                            </strong>

                            <span>Total readings</span>

                            <div>
                                Average:{" "}
                                {displayValue(
                                    monthReport?.summary?.average
                                )} mg/dL
                            </div>
                        </div>

                        <div className="report-card">
                            <h3>Previous Month</h3>

                            <p>
                                {previousMonthReport?.startDate} to{" "}
                                {previousMonthReport?.endDate}
                            </p>

                            <strong>
                                {previousMonthReport?.summary?.count ?? "--"}
                            </strong>

                            <span>Total readings</span>

                            <div>
                                Average:{" "}
                                {displayValue(
                                    previousMonthReport?.summary?.average
                                )} mg/dL
                            </div>
                        </div>

                    </div>
                </section>

                <footer className="dashboard-footer">
                    Sweety Blood Glucose Tracker
                </footer>

            </main>
        </div>
    );
}

export default Dashboard;
