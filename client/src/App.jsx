
import { useState } from "react";
import "./App.css";
import "./PasswordToggle.css";
import { apiRequest } from "./services/api";
import Dashboard from "./components/Dashboard";

function App() {
    const [mode, setMode] = useState("login");
    const [showPassword, setShowPassword] = useState(false);

    const [form, setForm] = useState({
        name: "",
        email: "",
        password: ""
    });

    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem("sweety_user");
        return savedUser ? JSON.parse(savedUser) : null;
    });

    const [notice, setNotice] = useState("");
    const [noticeType, setNoticeType] = useState("success");
    const [loading, setLoading] = useState(false);

    function handleChange(event) {
        setForm({
            ...form,
            [event.target.name]: event.target.value
        });
    }

    async function handleSubmit(event) {
        event.preventDefault();

        setNotice("");
        setLoading(true);

        try {
            if (mode === "register") {
                const result = await apiRequest("/auth/register", {
                    method: "POST",
                    body: JSON.stringify({
                        name: form.name,
                        email: form.email,
                        password: form.password
                    })
                });

                setNoticeType("success");
                setNotice(result.message);
                setMode("login");
                setShowPassword(false);

                setForm({
                    name: "",
                    email: form.email,
                    password: ""
                });

            } else {
                const result = await apiRequest("/auth/login", {
                    method: "POST",
                    body: JSON.stringify({
                        email: form.email,
                        password: form.password
                    })
                });

                localStorage.setItem("sweety_token", result.token);
                localStorage.setItem(
                    "sweety_user",
                    JSON.stringify(result.user)
                );

                setUser(result.user);
            }

        } catch (error) {
            setNoticeType("error");
            setNotice(error.message);
        } finally {
            setLoading(false);
        }
    }

    function handleLogout() {
        localStorage.removeItem("sweety_token");
        localStorage.removeItem("sweety_user");

        setUser(null);
        setShowPassword(false);

        setForm({
            name: "",
            email: "",
            password: ""
        });

        setNotice("");
    }

    if (user) {
        return (
            <Dashboard
                user={user}
                onLogout={handleLogout}
            />
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-card">

                <div className="brand">
                    <div className="brand-icon">♥</div>
                    <span>Sweety</span>
                </div>

                <div className="auth-heading">
                    <h1>
                        {mode === "login"
                            ? "Welcome back!"
                            : "Create your account"}
                    </h1>

                    <p>
                        {mode === "login"
                            ? "Sign in to manage your glucose readings."
                            : "Join Sweety and start tracking your health."}
                    </p>
                </div>

                <div className="tab-buttons">
                    <button
                        className={mode === "login" ? "active" : ""}
                        onClick={() => {
                            setMode("login");
                            setNotice("");
                            setShowPassword(false);
                        }}
                    >
                        Login
                    </button>

                    <button
                        className={mode === "register" ? "active" : ""}
                        onClick={() => {
                            setMode("register");
                            setNotice("");
                            setShowPassword(false);
                        }}
                    >
                        Register
                    </button>
                </div>

                <form onSubmit={handleSubmit}>

                    {mode === "register" && (
                        <div className="form-group">
                            <label>Full Name</label>

                            <input
                                type="text"
                                name="name"
                                placeholder="Enter your name"
                                value={form.name}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label>Email Address</label>

                        <input
                            type="email"
                            name="email"
                            placeholder="Enter your email"
                            value={form.email}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Password</label>

                        <div className="password-input-wrapper">
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                placeholder="Enter your password"
                                value={form.password}
                                onChange={handleChange}
                                required
                            />

                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() =>
                                    setShowPassword(!showPassword)
                                }
                                aria-label={
                                    showPassword
                                        ? "Hide password"
                                        : "Show password"
                                }
                                title={
                                    showPassword
                                        ? "Hide password"
                                        : "Show password"
                                }
                            >
                                {showPassword ? (
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M3 3l18 18" />
                                        <path d="M10.6 10.6a2 2 0 002.8 2.8" />
                                        <path d="M9.9 5.2A10.8 10.8 0 0112 5c5.5 0 9.5 7 9.5 7a16 16 0 01-3 3.8" />
                                        <path d="M6.2 6.2C3.9 7.8 2.5 12 2.5 12s3.5 7 9.5 7c1.2 0 2.3-.3 3.3-.7" />
                                    </svg>
                                ) : (
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    {notice && (
                        <div className={`notice ${noticeType}`}>
                            {notice}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="primary-button"
                        disabled={loading}
                    >
                        {loading
                            ? "Please wait..."
                            : mode === "login"
                                ? "Login"
                                : "Create Account"}
                    </button>

                </form>

                <p className="switch-text">
                    {mode === "login"
                        ? "Don't have an account?"
                        : "Already have an account?"}

                    <button
                        onClick={() => {
                            setMode(
                                mode === "login" ? "register" : "login"
                            );
                            setNotice("");
                            setShowPassword(false);
                        }}
                    >
                        {mode === "login" ? "Register" : "Login"}
                    </button>
                </p>

                <p className="footer-text">
                    Your health journey starts with Sweety.
                </p>

            </div>
        </div>
    );
}

export default App;
