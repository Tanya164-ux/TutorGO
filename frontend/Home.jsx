
import { useState } from "react";

import StudentDashboard from "./student/StudentDashboard";
import StudentLogin from "./student/StudentLogin";
import StudentRegister from "./student/StudentRegister";

import TutorDashboard from "./tutor/TutorDashboard";
import TutorLogin from "./tutor/TutorLogin";
import TutorRegister from "./tutor/TutorRegister";


// =====================================================
// LOCAL STORAGE HELPERS
// =====================================================

const getSavedProfile = () => {
    try {
        const savedProfile = localStorage.getItem(
            "tutorgo_profile"
        );

        return savedProfile
            ? JSON.parse(savedProfile)
            : null;

    } catch (error) {
        console.error(
            "Failed to load saved profile:",
            error
        );

        return null;
    }
};


const getSavedRole = () => {
    return localStorage.getItem(
        "tutorgo_role"
    );
};


// =====================================================
// HOME COMPONENT
// =====================================================

function Home() {

    // Restore the previous login after refresh
    const savedProfile = getSavedProfile();
    const savedRole = getSavedRole();

    const [role, setRole] = useState(
        savedRole || null
    );

    const [screen, setScreen] = useState(
        savedRole && savedProfile
            ? "dashboard"
            : "login"
    );

    const [profile, setProfile] = useState(
        savedProfile
    );


    // =================================================
    // SAVE LOGIN SESSION
    // =================================================

    const saveSession = (selectedRole, data) => {

        setRole(selectedRole);
        setProfile(data);
        setScreen("dashboard");

        localStorage.setItem(
            "tutorgo_role",
            selectedRole
        );

        localStorage.setItem(
            "tutorgo_profile",
            JSON.stringify(data)
        );
    };


    // =================================================
    // LOGOUT / RETURN TO HOME
    // =================================================

    const goToHome = () => {

        setRole(null);
        setScreen("login");
        setProfile(null);

        localStorage.removeItem(
            "tutorgo_role"
        );

        localStorage.removeItem(
            "tutorgo_profile"
        );
    };


    // =====================================================
    // STUDENT
    // =====================================================

    if (role === "student") {

        // ---------------------------------------------
        // STUDENT DASHBOARD
        // ---------------------------------------------

        if (screen === "dashboard") {

            return (
                <div>

                    <button
                        className="dashboard-home-button"
                        onClick={goToHome}
                    >
                        ← Home
                    </button>

                    <StudentDashboard
                        profile={profile}
                        onLogout={goToHome}
                    />

                </div>
            );
        }


        // ---------------------------------------------
        // STUDENT REGISTER
        // ---------------------------------------------

        if (screen === "register") {

            return (
                <StudentRegister

                    onBack={() => {
                        setScreen("login");
                    }}

                    onComplete={(data) => {

                        saveSession(
                            "student",
                            data
                        );

                    }}
                />
            );
        }


        // ---------------------------------------------
        // STUDENT LOGIN
        // ---------------------------------------------

        return (
            <StudentLogin

                onRegister={() => {
                    setScreen("register");
                }}

                onLogin={(data) => {

                    saveSession(
                        "student",
                        data
                    );

                }}
            />
        );
    }


    // =====================================================
    // TUTOR
    // =====================================================

    if (role === "tutor") {

        // ---------------------------------------------
        // TUTOR DASHBOARD
        // ---------------------------------------------

        if (screen === "dashboard") {

            return (
                <div>

                    <button
                        className="dashboard-home-button"
                        onClick={goToHome}
                    >
                        ← Home
                    </button>

                    <TutorDashboard
                        profile={profile}
                        onLogout={goToHome}
                    />

                </div>
            );
        }


        // ---------------------------------------------
        // TUTOR REGISTER
        // ---------------------------------------------

        if (screen === "register") {

            return (
                <TutorRegister

                    onBack={() => {
                        setScreen("login");
                    }}

                    onLogin={() => {
                        setScreen("login");
                    }}

                    onComplete={(data) => {

                        saveSession(
                            "tutor",
                            data
                        );

                    }}
                />
            );
        }


        // ---------------------------------------------
        // TUTOR LOGIN
        // ---------------------------------------------

        return (
            <TutorLogin

                onRegister={() => {
                    setScreen("register");
                }}

                onBack={() => {

                    setRole(null);
                    setScreen("login");

                }}

                onLogin={(data) => {

                    saveSession(
                        "tutor",
                        data
                    );

                }}
            />
        );
    }


    // =====================================================
    // HOME LANDING PAGE
    // =====================================================

    return (

        <div className="home-page">

            {/* =========================================
                NAVBAR
                ========================================= */}

            <nav className="navbar">

                <div className="logo">
                    TutorGo
                </div>

                <div className="nav-tagline">
                    Intelligent Tutor Matching
                </div>

            </nav>


            {/* =========================================
                HERO
                ========================================= */}

            <section className="hero-section">

                <h1>
                    The right tutor,
                    <br />

                    <span>
                        right when you need one.
                    </span>
                </h1>

                <p>
                    TutorGo connects students with suitable
                    tutors based on subject, expertise,
                    availability, budget, rating and more.
                </p>

            </section>


            {/* =========================================
                ROLE SELECTION
                ========================================= */}

            <section className="role-section">

                <h2>
                    How would you like to continue?
                </h2>

                <div className="role-cards">

                    {/* =================================
                        STUDENT
                        ================================= */}

                    <div
                        className="role-card student-card"

                        onClick={() => {

                            setRole("student");
                            setScreen("login");
                            setProfile(null);

                        }}
                    >

                        <div className="role-icon">
                            🎓
                        </div>

                        <h3>
                            I am a Student
                        </h3>

                        <p>
                            Find a tutor for your subject
                            and topic.
                        </p>

                        <div className="role-arrow">
                            →
                        </div>

                    </div>


                    {/* =================================
                        TUTOR
                        ================================= */}

                    <div
                        className="role-card tutor-card"

                        onClick={() => {

                            setRole("tutor");
                            setScreen("login");
                            setProfile(null);

                        }}
                    >

                        <div className="role-icon">
                            🧑‍🏫
                        </div>

                        <h3>
                            I am a Tutor
                        </h3>

                        <p>
                            Share your expertise and
                            teach students.
                        </p>

                        <div className="role-arrow">
                            →
                        </div>

                    </div>

                </div>

            </section>


            {/* =========================================
                FEATURES
                ========================================= */}

            <div className="feature-strip">

                <div className="feature-item">

                    <div className="feature-icon">
                        ⚡
                    </div>

                    <h3>
                        Quick Matching
                    </h3>

                </div>


                <div className="feature-item">

                    <div className="feature-icon">
                        🎯
                    </div>

                    <h3>
                        Smart Ranking
                    </h3>

                </div>


                <div className="feature-item">

                    <div className="feature-icon">
                        🔒
                    </div>

                    <h3>
                        Secure Booking
                    </h3>

                </div>

            </div>


            {/* =========================================
                FOOTER
                ========================================= */}

            <footer className="home-footer">

                TutorGo
                {" "}•{" "}
                Intelligent Tutor Matching Platform

            </footer>

        </div>
    );
}


export default Home;