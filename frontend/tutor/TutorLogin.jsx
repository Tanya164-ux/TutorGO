import React, { useState } from "react";

function TutorLogin({
    onRegister,
    onLogin,
    onBack
}) {

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");


    // =========================================
    // LOGIN
    // =========================================

    const handleSubmit = async (e) => {

        e.preventDefault();

        setError("");


        // -----------------------------------------
        // VALIDATE EMAIL
        // -----------------------------------------

        if (!email.trim()) {

            setError(
                "Please enter your registered email."
            );

            return;

        }


        // -----------------------------------------
        // VALIDATE PASSWORD
        // -----------------------------------------

        if (!password) {

            setError(
                "Please enter your password."
            );

            return;

        }


        setLoading(true);


        try {

            // -----------------------------------------
            // SEND EMAIL + PASSWORD TO BACKEND
            // -----------------------------------------

            const response = await fetch(
                "http://localhost:5000/api/tutors/login",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        email:
                            email.trim(),

                        password:
                            password

                    })

                }
            );


            const responseText =
                await response.text();


            let data;


            try {

                data =
                    JSON.parse(responseText);

            } catch {

                throw new Error(
                    "Backend returned an invalid login response."
                );

            }


            // -----------------------------------------
            // LOGIN FAILED
            // -----------------------------------------

            if (!response.ok) {

                throw new Error(
                    data.error ||
                    data.message ||
                    "Invalid email or password."
                );

            }


            // -----------------------------------------
            // LOGIN SUCCESSFUL
            // -----------------------------------------

            console.log(
                "Tutor login successful:",
                data.tutor
            );


            if (!data.tutor) {

                throw new Error(
                    "Tutor login succeeded but no tutor profile was returned."
                );

            }


            // Send authenticated tutor
            // profile to Home.jsx

            onLogin(data.tutor);


        } catch (error) {

            console.error(
                "TUTOR LOGIN ERROR:",
                error
            );


            setError(
                error.message ||
                "Unable to login. Please try again."
            );

        } finally {

            setLoading(false);

        }

    };


    return (

        <div className="auth-page">

            <div className="auth-card tutor-login-card">


                {/* =====================================
                    BACK
                ===================================== */}

                <button
                    type="button"
                    className="auth-back-button"
                    onClick={onBack}
                >
                    ← Back
                </button>


                {/* =====================================
                    BRAND
                ===================================== */}

                <div className="auth-logo">
                    TutorGo
                </div>


                <div className="auth-icon">
                    🎓
                </div>


                {/* =====================================
                    HEADING
                ===================================== */}

                <h1>
                    Welcome Back, Tutor
                </h1>

                <p>
                    Login to access your TutorGo account.
                </p>


                {/* =====================================
                    ERROR
                ===================================== */}

                {error && (

                    <div className="auth-error">

                        <span>
                            ✕
                        </span>

                        {error}

                    </div>

                )}


                {/* =====================================
                    FORM
                ===================================== */}

                <form
                    onSubmit={handleSubmit}
                >


                    {/* EMAIL */}

                    <label htmlFor="tutor-email">
                        Email Address
                    </label>

                    <input
                        id="tutor-email"
                        type="email"
                        placeholder="Enter your registered email"
                        value={email}
                        onChange={(e) =>
                            setEmail(
                                e.target.value
                            )
                        }
                        disabled={loading}
                        autoComplete="email"
                        required
                    />


                    {/* PASSWORD */}

                    <label htmlFor="tutor-password">
                        Password
                    </label>

                    <input
                        id="tutor-password"
                        type="password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) =>
                            setPassword(
                                e.target.value
                            )
                        }
                        disabled={loading}
                        autoComplete="current-password"
                        required
                    />


                    {/* LOGIN */}

                    <button
                        type="submit"
                        className="primary-auth-button"
                        disabled={loading}
                    >

                        {loading
                            ? "Logging in..."
                            : "Login →"
                        }

                    </button>

                </form>


                {/* =====================================
                    REGISTER
                ===================================== */}

                <div className="auth-switch">

                    <span>
                        Don't have a TutorGo profile?
                    </span>

                    <button
                        type="button"
                        className="auth-secondary-button"
                        onClick={onRegister}
                        disabled={loading}
                    >
                        Register
                    </button>

                </div>


                {/* =====================================
                    INFORMATION
                ===================================== */}

                <div className="login-info">

                    <span>
                        🔐
                    </span>

                    <p>
                        Use the email and password
                        registered with TutorGo.
                    </p>

                </div>


            </div>

        </div>

    );

}

export default TutorLogin;