import React, { useState } from "react";

function TutorRegister({
    onBack,
    onLogin,
    onComplete
}) {

    // =========================================
    // FORM STATE
    // =========================================

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [qualification, setQualification] = useState("");
    const [experience, setExperience] = useState("");
    const [price, setPrice] = useState("");
    const [location, setLocation] = useState("");

    const [resume, setResume] = useState(null);


    // =========================================
    // UI STATE
    // =========================================

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");


    // =========================================
    // HANDLE RESUME
    // =========================================

    const handleResumeChange = (event) => {

        const file = event.target.files[0];

        if (!file) {

            setResume(null);
            return;

        }


        // -----------------------------------------
        // ONLY PDF ALLOWED
        // -----------------------------------------

        if (file.type !== "application/pdf") {

            setError(
                "Please select a PDF resume."
            );

            setResume(null);
            return;

        }


        setError("");
        setResume(file);

    };


    // =========================================
    // SUBMIT
    // =========================================

    const handleSubmit = async (event) => {

        event.preventDefault();

        setError("");
        setSuccess("");


        // =========================================
        // VALIDATION
        // =========================================

        if (
            !name.trim() ||
            !email.trim() ||
            !password ||
            !qualification.trim() ||
            experience === "" ||
            price === "" ||
            !location.trim()
        ) {

            setError(
                "Please fill all tutor details."
            );

            return;

        }


        // -----------------------------------------
        // PASSWORD VALIDATION
        // -----------------------------------------

        if (password.length < 6) {

            setError(
                "Password must be at least 6 characters long."
            );

            return;

        }


        // -----------------------------------------
        // EXPERIENCE VALIDATION
        // -----------------------------------------

        if (
            !Number.isFinite(Number(experience)) ||
            Number(experience) < 0
        ) {

            setError(
                "Experience must be a valid non-negative number."
            );

            return;

        }


        // -----------------------------------------
        // PRICE VALIDATION
        // -----------------------------------------

        if (
            !Number.isFinite(Number(price)) ||
            Number(price) < 0
        ) {

            setError(
                "Price must be a valid non-negative number."
            );

            return;

        }


        // -----------------------------------------
        // RESUME VALIDATION
        // -----------------------------------------

        if (!resume) {

            setError(
                "Please upload your PDF resume."
            );

            return;

        }


        setLoading(true);


        try {

            // =====================================
            // STEP 1
            // CREATE TUTOR
            // =====================================

            const tutorResponse = await fetch(
                "http://localhost:5000/api/tutors",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        name:
                            name.trim(),

                        email:
                            email.trim(),

                        // ---------------------------------
                        // PASSWORD ADDED
                        // ---------------------------------

                        password:
                            password,

                        qualification:
                            qualification.trim(),

                        experience:
                            Number(experience),

                        price_per_session:
                            Number(price),

                        location:
                            location.trim()

                    })
                }
            );


            const tutorData =
                await tutorResponse.json();


            // -----------------------------------------
            // CHECK CREATE TUTOR RESPONSE
            // -----------------------------------------

            if (!tutorResponse.ok) {

                throw new Error(
                    tutorData.error ||
                    "Failed to create tutor profile"
                );

            }


            const tutorId =
                tutorData.tutor_id;


            console.log(
                "Tutor created:",
                tutorId
            );


            // =====================================
            // STEP 2
            // UPLOAD RESUME
            // =====================================

            const formData =
                new FormData();


            formData.append(
                "resume",
                resume
            );


            formData.append(
                "tutor_id",
                tutorId
            );


            const resumeResponse =
                await fetch(
                    "http://localhost:5000/api/resume",
                    {
                        method: "POST",
                        body: formData
                    }
                );


            const resumeData =
                await resumeResponse.json();


            // -----------------------------------------
            // CHECK RESUME RESPONSE
            // -----------------------------------------

            if (!resumeResponse.ok) {

                throw new Error(
                    resumeData.error ||
                    "Resume upload failed"
                );

            }


            console.log(
                "Resume parsed:",
                resumeData.parsed_data
            );


            // =====================================
            // STEP 3
            // FETCH UPDATED PROFILE FROM SQL
            // =====================================

            const profileResponse =
                await fetch(
                    `http://localhost:5000/api/tutors/profile?email=${encodeURIComponent(
                        email.trim()
                    )}`
                );


            const profileData =
                await profileResponse.json();


            // -----------------------------------------
            // CHECK PROFILE RESPONSE
            // -----------------------------------------

            if (!profileResponse.ok) {

                throw new Error(
                    profileData.error ||
                    "Failed to load updated tutor profile"
                );

            }


            console.log(
                "Updated tutor profile:",
                profileData.tutor
            );


            // =====================================
            // STEP 4
            // SEND UPDATED SQL PROFILE
            // TO DASHBOARD
            // =====================================

            setSuccess(
                "Tutor profile and resume saved successfully!"
            );


            /*
                Password is NOT included in the
                tutor profile returned to the frontend.

                The password is stored securely on
                the backend using bcrypt.
            */


            onComplete(
                profileData.tutor
            );

        }


        catch (error) {

            console.error(
                "TUTOR REGISTRATION ERROR:",
                error
            );


            setError(
                error.message ||
                "Registration failed. Please try again."
            );

        }


        finally {

            setLoading(false);

        }

    };


    // =========================================
    // UI
    // =========================================

    return (

        <div className="auth-page">

            <div className="auth-card">


                {/* =================================
                    LOGO
                ================================= */}

                <div className="auth-logo">
                    TutorGo
                </div>


                <div className="auth-icon">
                    🧑‍🏫
                </div>


                <h1>
                    Become a Tutor
                </h1>


                <p>
                    Create your tutor profile and
                    upload your resume.
                </p>


                {/* =================================
                    ERROR
                ================================= */}

                {error && (

                    <div className="error-message">

                        ❌ {error}

                    </div>

                )}


                {/* =================================
                    SUCCESS
                ================================= */}

                {success && (

                    <div className="success-message">

                        ✓ {success}

                    </div>

                )}


                {/* =================================
                    FORM
                ================================= */}

                <form
                    onSubmit={handleSubmit}
                >


                    {/* =================================
                        NAME
                    ================================= */}

                    <label>
                        Full Name
                    </label>

                    <input
                        type="text"
                        placeholder="Enter your full name"
                        value={name}
                        onChange={(e) =>
                            setName(e.target.value)
                        }
                        disabled={loading}
                        required
                    />


                    {/* =================================
                        EMAIL
                    ================================= */}

                    <label>
                        Email
                    </label>

                    <input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) =>
                            setEmail(e.target.value)
                        }
                        disabled={loading}
                        autoComplete="email"
                        required
                    />


                    {/* =================================
                        PASSWORD
                    ================================= */}

                    <label>
                        Password
                    </label>

                    <input
                        type="password"
                        placeholder="Create a password"
                        value={password}
                        onChange={(e) =>
                            setPassword(e.target.value)
                        }
                        disabled={loading}
                        autoComplete="new-password"
                        minLength={6}
                        required
                    />

                    <small
                        style={{
                            display: "block",
                            marginTop: "5px",
                            marginBottom: "12px",
                            color: "#777",
                            fontSize: "12px"
                        }}
                    >
                        Password must be at least 6 characters.
                    </small>


                    {/* =================================
                        QUALIFICATION
                    ================================= */}

                    <label>
                        Qualification
                    </label>

                    <input
                        type="text"
                        placeholder="e.g. M.Tech Computer Science"
                        value={qualification}
                        onChange={(e) =>
                            setQualification(
                                e.target.value
                            )
                        }
                        disabled={loading}
                        required
                    />


                    {/* =================================
                        EXPERIENCE
                    ================================= */}

                    <label>
                        Teaching Experience (Years)
                    </label>

                    <input
                        type="number"
                        min="0"
                        placeholder="e.g. 5"
                        value={experience}
                        onChange={(e) =>
                            setExperience(
                                e.target.value
                            )
                        }
                        disabled={loading}
                        required
                    />


                    {/* =================================
                        PRICE
                    ================================= */}

                    <label>
                        Price Per Session (₹)
                    </label>

                    <input
                        type="number"
                        min="0"
                        placeholder="e.g. 500"
                        value={price}
                        onChange={(e) =>
                            setPrice(
                                e.target.value
                            )
                        }
                        disabled={loading}
                        required
                    />


                    {/* =================================
                        LOCATION
                    ================================= */}

                    <label>
                        Location
                    </label>

                    <input
                        type="text"
                        placeholder="e.g. Chandigarh"
                        value={location}
                        onChange={(e) =>
                            setLocation(
                                e.target.value
                            )
                        }
                        disabled={loading}
                        required
                    />


                    {/* =================================
                        RESUME
                    ================================= */}

                    <label>
                        Resume (PDF)
                    </label>

                    <input
                        type="file"
                        accept=".pdf,application/pdf"
                        onChange={
                            handleResumeChange
                        }
                        disabled={loading}
                        required
                    />


                    {/* =================================
                        SELECTED FILE
                    ================================= */}

                    {resume && (

                        <div
                            style={{
                                marginTop: "5px",
                                padding: "10px",
                                borderRadius: "9px",
                                background: "#f5f6ff",
                                color: "#4f46e5",
                                fontSize: "13px"
                            }}
                        >

                            📄 Selected:{" "}
                            {resume.name}

                        </div>

                    )}


                    {/* =================================
                        SUBMIT
                    ================================= */}

                    <button
                        type="submit"
                        className="primary-auth-button"
                        disabled={loading}
                    >

                        {loading
                            ? "Creating Profile..."
                            : "Create Tutor Profile →"
                        }

                    </button>


                </form>


                {/* =================================
                    LOGIN
                ================================= */}

                <div className="back-link">

                    Already have an account?

                    {" "}

                    <button
                        type="button"
                        className="link-button"
                        onClick={onLogin}
                        disabled={loading}
                    >
                        Login
                    </button>

                </div>


                {/* =================================
                    BACK
                ================================= */}

                <div
                    className="back-link"
                    onClick={
                        loading
                            ? undefined
                            : onBack
                    }
                    style={{
                        cursor: loading
                            ? "not-allowed"
                            : "pointer"
                    }}
                >

                    ← Back

                </div>


            </div>

        </div>

    );

}


export default TutorRegister;