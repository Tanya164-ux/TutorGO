import { useState } from "react";

function StudentRegister({ onBack, onComplete }) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [educationLevel, setEducationLevel] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");

        if (!name.trim() || !email.trim() || !password.trim() || !educationLevel.trim()) {
            setError("Please fill in all fields.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(
                "http://localhost:5000/api/students",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        name: name.trim(),
                        email: email.trim(),
                        password,
                        education_level: educationLevel.trim()
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Failed to create student profile"
                );
            }

            onComplete({
                student_id: data.student_id,
                name: data.name || name.trim(),
                email: data.email || email.trim(),
                education_level:
                    data.education_level || educationLevel.trim()
            });
        } catch (err) {
            console.error("STUDENT REGISTRATION ERROR:", err);
            setError(err.message || "Registration failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-logo">✦ TutorGo</div>

                <div className="auth-icon">👩‍🎓</div>

                <h1>Create your profile</h1>

                <p className="auth-subtitle">
                    Tell us a little about yourself.
                </p>

                <form onSubmit={handleSubmit}>
                    <label>Full Name</label>
                    <input
                        type="text"
                        placeholder="Enter your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />

                    <label>Email</label>
                    <input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    <label>Password</label>
                    <input
                        type="password"
                        placeholder="Create a password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                    />

                    <label>Class / Degree / Year</label>
                    <input
                        type="text"
                        placeholder="e.g. Class 5, Class 12, B.Tech CSE 2nd Year"
                        value={educationLevel}
                        onChange={(e) => setEducationLevel(e.target.value)}
                        required
                    />

                    <small>
                        You can enter any class, course, degree, or year.
                    </small>

                    {error && (
                        <div className="error-message">
                            ❌ {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="primary-auth-button"
                        disabled={loading}
                    >
                        {loading
                            ? "Creating Profile..."
                            : "Create Student Profile"}
                    </button>
                </form>

                <button
                    onClick={onBack}
                    className="back-link"
                    type="button"
                >
                    ← Back to Login
                </button>
            </div>
        </div>
    );
}

export default StudentRegister;
