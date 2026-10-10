
import React, { useEffect, useState, useCallback } from "react";
import { io } from "socket.io-client";

const API_URL = "http://localhost:5000";

function TutorDashboard({ profile, onLogout }) {
    // =====================================================
    // BASIC STATE
    // =====================================================

    const tutorId = profile?.tutor_id;

    const [currentProfile, setCurrentProfile] = useState(profile || {});
    const [showProfileEditor, setShowProfileEditor] = useState(false);
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileMessage, setProfileMessage] = useState("");

    const [editName, setEditName] = useState("");
    const [editEmail, setEditEmail] = useState("");
    const [editQualification, setEditQualification] = useState("");
    const [editExperience, setEditExperience] = useState("");
    const [editPrice, setEditPrice] = useState("");
    const [editLocation, setEditLocation] = useState("");

    const [requests, setRequests] = useState([]);
    const [bookings, setBookings] = useState([]);

    const [message, setMessage] = useState("");
    const [connected, setConnected] = useState(false);
    const [processingRequest, setProcessingRequest] = useState(null);
    const [loadingBookings, setLoadingBookings] = useState(false);

    // =====================================================
    // DASHBOARD NAVIGATION
    // =====================================================

    const [activeSection, setActiveSection] = useState("profile");

    // =====================================================
    // VIDEO STATE
    // =====================================================

    const [showVideoPopup, setShowVideoPopup] = useState(false);

    const [youtubeChannel, setYoutubeChannel] = useState(
        profile?.youtube_channel_url || ""
    );

    const [demoVideo1, setDemoVideo1] = useState(
        profile?.demo_video_1 || ""
    );

    const [demoVideo2, setDemoVideo2] = useState(
        profile?.demo_video_2 || ""
    );

    const [videoLoading, setVideoLoading] = useState(false);
    const [videoMessage, setVideoMessage] = useState("");

    // =====================================================
    // AVAILABILITY STATE
    // =====================================================

    const [availabilitySlots, setAvailabilitySlots] = useState([]);

    const [availabilityDate, setAvailabilityDate] = useState("");
    const [availabilityStart, setAvailabilityStart] = useState("");
    const [availabilityEnd, setAvailabilityEnd] = useState("");

    const [availabilityLoading, setAvailabilityLoading] = useState(false);
    const [availabilityMessage, setAvailabilityMessage] = useState("");

    // =====================================================
    // PROFILE DATA
    // =====================================================

    const subjects = Array.isArray(profile?.subjects)
        ? currentProfile.subjects
        : [];

    const expertise =
        profile?.expertise &&
        typeof currentProfile.expertise === "object"
            ? currentProfile.expertise
            : {};

    // Keep local profile data synchronized with the parent profile
    useEffect(() => {
        setCurrentProfile(profile || {});
    }, [profile]);

    const openProfileEditor = () => {
        setEditName(currentProfile?.name || "");
        setEditEmail(currentProfile?.email || "");
        setEditQualification(currentProfile?.qualification || "");
        setEditExperience(currentProfile?.experience ?? "");
        setEditPrice(currentProfile?.price_per_session ?? "");
        setEditLocation(currentProfile?.location || "");
        setProfileMessage("");
        setShowProfileEditor(true);
    };

    const closeProfileEditor = () => {
        if (!profileSaving) {
            setShowProfileEditor(false);
            setProfileMessage("");
        }
    };

    const saveProfile = async (event) => {
        event.preventDefault();

        if (!tutorId) {
            setProfileMessage("❌ Tutor profile not found.");
            return;
        }

        if (
            !editName.trim() ||
            !editEmail.trim() ||
            !editQualification.trim() ||
            editExperience === "" ||
            editPrice === "" ||
            !editLocation.trim()
        ) {
            setProfileMessage("❌ Please fill in all profile fields.");
            return;
        }

        if (Number(editExperience) < 0 || !Number.isFinite(Number(editExperience))) {
            setProfileMessage("❌ Experience must be a valid non-negative number.");
            return;
        }

        if (Number(editPrice) < 0 || !Number.isFinite(Number(editPrice))) {
            setProfileMessage("❌ Price must be a valid non-negative number.");
            return;
        }

        setProfileSaving(true);
        setProfileMessage("");

        try {
            const response = await fetch(
                `${API_URL}/api/tutors/${tutorId}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        name: editName.trim(),
                        email: editEmail.trim(),
                        qualification: editQualification.trim(),
                        experience: Number(editExperience),
                        price_per_session: Number(editPrice),
                        location: editLocation.trim()
                    })
                }
            );

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    getErrorMessage(data, "Failed to update profile")
                );
            }

            const updatedTutor = data.tutor || {
                ...currentProfile,
                name: editName.trim(),
                email: editEmail.trim(),
                qualification: editQualification.trim(),
                experience: Number(editExperience),
                price_per_session: Number(editPrice),
                location: editLocation.trim()
            };

            setCurrentProfile((previousProfile) => ({
                ...previousProfile,
                ...updatedTutor,
                tutor_id: tutorId
            }));

            setProfileMessage("✓ Profile updated successfully.");
            setShowProfileEditor(false);

        } catch (error) {
            console.error("UPDATE TUTOR PROFILE ERROR:", error);
            setProfileMessage(`❌ ${error.message}`);
        } finally {
            setProfileSaving(false);
        }
    };

    // Update video fields when profile changes
    useEffect(() => {
        setYoutubeChannel(profile?.youtube_channel_url || "");
        setDemoVideo1(profile?.demo_video_1 || "");
        setDemoVideo2(profile?.demo_video_2 || "");
    }, [
        profile?.youtube_channel_url,
        profile?.demo_video_1,
        profile?.demo_video_2
    ]);

    // =====================================================
    // HELPER FUNCTIONS
    // =====================================================

    const getErrorMessage = (data, fallback) => {
        return (
            data?.error ||
            data?.message ||
            fallback
        );
    };

    const formatTime = (date) => {
        if (!date) {
            return "—";
        }

        const parsedDate = new Date(date);

        if (Number.isNaN(parsedDate.getTime())) {
            return String(date);
        }

        return parsedDate.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const formatDate = (date) => {
        if (!date) {
            return "—";
        }

        const parsedDate = new Date(date);

        if (Number.isNaN(parsedDate.getTime())) {
            return String(date);
        }

        return parsedDate.toLocaleDateString([], {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    };

    const formatDateTime = (date) => {
        if (!date) {
            return "—";
        }

        const parsedDate = new Date(date);

        if (Number.isNaN(parsedDate.getTime())) {
            return String(date);
        }

        return parsedDate.toLocaleString([], {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const getStatusClass = (status) => {
        const normalizedStatus = String(status || "")
            .toUpperCase();

        if (
            normalizedStatus === "AVAILABLE" ||
            normalizedStatus === "CONFIRMED" ||
            normalizedStatus === "COMPLETED"
        ) {
            return "available-badge";
        }

        if (
            normalizedStatus === "BOOKED" ||
            normalizedStatus === "PAYMENT_PENDING" ||
            normalizedStatus === "IN_PROGRESS"
        ) {
            return "booked-badge";
        }

        return "request-count";
    };

    // =====================================================
    // TOP NAVIGATION
    // =====================================================

    const navigateToSection = (sectionId) => {
        setActiveSection(sectionId);

        const section = document.getElementById(sectionId);

        if (section) {
            section.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }
    };

    const handleLogout = () => {
        if (typeof onLogout === "function") {
            onLogout();
            return;
        }

        // Fallback if Home.jsx has not yet passed onLogout.
        localStorage.removeItem("tutorgo_role");
        localStorage.removeItem("tutorgo_profile");
        window.location.reload();
    };

    // =====================================================
    // LOAD AVAILABILITY
    // =====================================================

    const loadAvailability = useCallback(async () => {
        if (!tutorId) {
            return;
        }

        try {
            const response = await fetch(
                `${API_URL}/api/availability/tutor/${tutorId}`
            );

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    getErrorMessage(
                        data,
                        "Failed to load availability"
                    )
                );
            }

            setAvailabilitySlots(data.slots || []);

        } catch (error) {
            console.error(
                "LOAD AVAILABILITY ERROR:",
                error
            );

            setAvailabilityMessage(
                `❌ ${error.message}`
            );
        }
    }, [tutorId]);

    // =====================================================
    // LOAD REQUESTS
    // =====================================================

    const loadRequests = useCallback(async () => {
        if (!tutorId) {
            return;
        }

        try {
            const response = await fetch(
                `${API_URL}/api/tutor-requests/tutor/${tutorId}`
            );

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    getErrorMessage(
                        data,
                        "Failed to load requests"
                    )
                );
            }

            const incomingRequests =
                data.requests ||
                data.data ||
                (Array.isArray(data) ? data : []);

            setRequests(
                Array.isArray(incomingRequests)
                    ? incomingRequests
                    : []
            );

        } catch (error) {
            console.error(
                "LOAD REQUESTS ERROR:",
                error
            );

            setMessage(`❌ ${error.message}`);
        }
    }, [tutorId]);

    // =====================================================
    // LOAD BOOKINGS
    // =====================================================

    const loadBookings = useCallback(async () => {
        if (!tutorId) {
            return;
        }

        setLoadingBookings(true);

        try {
            const response = await fetch(
                `${API_URL}/api/bookings/tutor/${tutorId}`
            );

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    getErrorMessage(
                        data,
                        "Failed to load bookings"
                    )
                );
            }

            setBookings(
                Array.isArray(data.bookings)
                    ? data.bookings
                    : []
            );

        } catch (error) {
            console.error(
                "LOAD BOOKINGS ERROR:",
                error
            );

            setMessage(`❌ ${error.message}`);

        } finally {
            setLoadingBookings(false);
        }
    }, [tutorId]);

    // =====================================================
    // INITIAL DATA LOADING
    // =====================================================

    useEffect(() => {
        if (!tutorId) {
            return;
        }

        loadAvailability();
        loadRequests();
        loadBookings();

    }, [
        tutorId,
        loadAvailability,
        loadRequests,
        loadBookings
    ]);

    // =====================================================
    // SOCKET.IO CONNECTION
    // =====================================================

    useEffect(() => {
        if (!tutorId) {
            return undefined;
        }

        const socket = io(API_URL);

        socket.on("connect", () => {
            console.log(
                "Tutor connected:",
                socket.id
            );

            setConnected(true);

            socket.emit(
                "registerTutor",
                Number(tutorId)
            );

            // Refresh data after reconnecting
            loadRequests();
            loadBookings();
            loadAvailability();
        });

        socket.on("disconnect", () => {
            console.log(
                "Tutor disconnected"
            );

            setConnected(false);
        });

        // New student request
        socket.on(
            "newCoachingRequest",
            (request) => {
                console.log(
                    "New coaching request:",
                    request
                );

                setRequests((previousRequests) => {
                    const alreadyExists =
                        previousRequests.some(
                            (item) =>
                                Number(item.request_id) ===
                                Number(request.request_id)
                        );

                    if (alreadyExists) {
                        return previousRequests;
                    }

                    return [
                        request,
                        ...previousRequests
                    ];
                });
            }
        );

        // Booking created or updated
        socket.on(
            "bookingCreated",
            (booking) => {
                console.log(
                    "Booking notification:",
                    booking
                );

                setMessage(
                    booking.message ||
                    "A booking has been created."
                );

                loadBookings();
                loadAvailability();
            }
        );

        // Request status update
        socket.on(
            "requestStatusUpdated",
            (updatedRequest) => {
                console.log(
                    "Request status updated:",
                    updatedRequest
                );

                loadRequests();
                loadBookings();
                loadAvailability();
            }
        );

        return () => {
            socket.disconnect();
        };

    }, [
        tutorId,
        loadRequests,
        loadBookings,
        loadAvailability
    ]);

    // =====================================================
    // ADD AVAILABILITY SLOT
    // =====================================================

    const addAvailability = async (event) => {
        event.preventDefault();

        setAvailabilityMessage("");

        if (
            !availabilityDate ||
            !availabilityStart ||
            !availabilityEnd
        ) {
            setAvailabilityMessage(
                "Please select date, start time and end time."
            );

            return;
        }

        if (
            availabilityEnd <= availabilityStart
        ) {
            setAvailabilityMessage(
                "End time must be after start time."
            );

            return;
        }

        const startTime =
            `${availabilityDate}T${availabilityStart}`;

        const endTime =
            `${availabilityDate}T${availabilityEnd}`;

        const selectedStart = new Date(startTime);

        if (
            selectedStart.getTime() < Date.now()
        ) {
            setAvailabilityMessage(
                "Please select a future time."
            );

            return;
        }

        setAvailabilityLoading(true);

        try {
            const response = await fetch(
                `${API_URL}/api/availability`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        tutor_id: Number(tutorId),
                        start_time: startTime,
                        end_time: endTime
                    })
                }
            );

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    getErrorMessage(
                        data,
                        "Failed to add availability"
                    )
                );
            }

            setAvailabilityMessage(
                "✓ Availability added successfully."
            );

            setAvailabilityDate("");
            setAvailabilityStart("");
            setAvailabilityEnd("");

            await loadAvailability();

        } catch (error) {
            console.error(
                "ADD AVAILABILITY ERROR:",
                error
            );

            setAvailabilityMessage(
                `❌ ${error.message}`
            );

        } finally {
            setAvailabilityLoading(false);
        }
    };

    // =====================================================
    // DELETE AVAILABILITY SLOT
    // =====================================================

    const deleteAvailability = async (slotId) => {
        const confirmed = window.confirm(
            "Are you sure you want to remove this slot?"
        );

        if (!confirmed) {
            return;
        }

        try {
            setAvailabilityMessage("");

            const response = await fetch(
                `${API_URL}/api/availability/${slotId}?tutor_id=${tutorId}`,
                {
                    method: "DELETE"
                }
            );

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    getErrorMessage(
                        data,
                        "Failed to delete slot"
                    )
                );
            }

            setAvailabilityMessage(
                "Availability slot removed."
            );

            await loadAvailability();

        } catch (error) {
            console.error(
                "DELETE AVAILABILITY ERROR:",
                error
            );

            setAvailabilityMessage(
                `❌ ${error.message}`
            );
        }
    };

    // =====================================================
    // ACCEPT REQUEST
    // =====================================================

    const handleAccept = async (request) => {
        const requestId = request.request_id;

        setProcessingRequest(requestId);
        setMessage("");

        try {
            const response = await fetch(
                `${API_URL}/api/tutor-requests/${requestId}/accept`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        tutor_id: Number(tutorId),
                        slot_id: request.slot_id
                    })
                }
            );

            const data = await response.json().catch(() => ({}));

            if (
                !response.ok ||
                data.success === false
            ) {
                throw new Error(
                    getErrorMessage(
                        data,
                        "Failed to accept request"
                    )
                );
            }

            setMessage(
                `✓ Request ${requestId} accepted successfully.`
            );

            setRequests((previousRequests) =>
                previousRequests.filter(
                    (item) =>
                        Number(item.request_id) !==
                        Number(requestId)
                )
            );

            await loadAvailability();
            await loadRequests();
            await loadBookings();

        } catch (error) {
            console.error(
                "ACCEPT REQUEST ERROR:",
                error
            );

            setMessage(
                `❌ ${error.message}`
            );

        } finally {
            setProcessingRequest(null);
        }
    };

    // =====================================================
    // REJECT REQUEST
    // =====================================================

    const handleReject = async (request) => {
        const requestId = request.request_id;

        setProcessingRequest(requestId);
        setMessage("");

        try {
            const response = await fetch(
                `${API_URL}/api/tutor-requests/${requestId}/reject`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        tutor_id: Number(tutorId)
                    })
                }
            );

            const data = await response.json().catch(() => ({}));

            if (
                !response.ok ||
                data.success === false
            ) {
                throw new Error(
                    getErrorMessage(
                        data,
                        "Failed to reject request"
                    )
                );
            }

            setMessage(
                `Request ${requestId} rejected.`
            );

            setRequests((previousRequests) =>
                previousRequests.filter(
                    (item) =>
                        Number(item.request_id) !==
                        Number(requestId)
                )
            );

            await loadRequests();

        } catch (error) {
            console.error(
                "REJECT REQUEST ERROR:",
                error
            );

            setMessage(
                `❌ ${error.message}`
            );

        } finally {
            setProcessingRequest(null);
        }
    };

    // =====================================================
    // SAVE VIDEO LINKS
    // =====================================================

    const saveVideoLinks = async () => {
        if (!tutorId) {
            setVideoMessage(
                "Tutor profile not found."
            );

            return;
        }

        setVideoLoading(true);
        setVideoMessage("");

        try {
            const response = await fetch(
                `${API_URL}/api/tutors/${tutorId}/videos`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        youtube_channel_url:
                            youtubeChannel.trim() || null,

                        demo_video_1:
                            demoVideo1.trim() || null,

                        demo_video_2:
                            demoVideo2.trim() || null
                    })
                }
            );

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    getErrorMessage(
                        data,
                        "Failed to save video links"
                    )
                );
            }

            setVideoMessage(
                "✓ Video links saved successfully."
            );

            setShowVideoPopup(false);

        } catch (error) {
            console.error(
                "SAVE VIDEO LINKS ERROR:",
                error
            );

            setVideoMessage(
                `❌ ${error.message}`
            );

        } finally {
            setVideoLoading(false);
        }
    };

    const skipVideoLinks = () => {
        setVideoMessage("");
        setShowVideoPopup(false);
    };

    // =====================================================
    // NO PROFILE
    // =====================================================

    if (!profile) {
        return (
            <div className="dashboard-page">
                <div className="dashboard-section">
                    <div className="empty-state">
                        <div className="empty-icon">
                            👨‍🏫
                        </div>

                        <h2>
                            Tutor Profile Not Found
                        </h2>

                        <p>
                            Please login or register first.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // =====================================================
    // DASHBOARD UI
    // =====================================================

    return (
        <div className="dashboard-page">

            {/* =========================================
                HEADER
            ========================================= */}

            <div className="dashboard-header">
                <div>
                    <span className="dashboard-label">
                        TUTOR DASHBOARD
                    </span>

                    <h1>
                        Welcome,{" "}
                        {currentProfile.name || "Tutor"} 👋
                    </h1>

                    <p>
                        Manage your profile, availability
                        and student requests.
                    </p>
                </div>

                <div className="profile-badge">
                    <span>🎓</span>

                    <div>
                        <strong>
                            {currentProfile.name || "Tutor"}
                        </strong>

                        <small>
                            Tutor ID: {currentProfile.tutor_id}
                        </small>
                    </div>
                </div>
            </div>

            {/* =========================================
                TOP NAVIGATION
            ========================================= */}

            <div
                className="dashboard-nav"
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    width: "100vw",
                    maxWidth: "100vw",
                    boxSizing: "border-box",
                    zIndex: 1000,
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "12px",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: 0,
                    padding: "14px 16px",
                    background: "#ffffff",
                    borderRadius: "0 0 12px 12px",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.08)"
                }}
            >
                <button
                    type="button"
                    onClick={() => navigateToSection("bookings-section")}
                    style={{
                        padding: "11px 18px",
                        borderRadius: "10px",
                        border: "1px solid #e4e7ec",
                        background:
                            activeSection === "bookings-section"
                                ? "#111827"
                                : "#ffffff",
                        color:
                            activeSection === "bookings-section"
                                ? "#ffffff"
                                : "#374151",
                        cursor: "pointer",
                        fontWeight: 600
                    }}
                >
                    📚 My Sessions
                </button>

                <button
                    type="button"
                    onClick={() => navigateToSection("profile-section")}
                    style={{
                        padding: "11px 18px",
                        borderRadius: "10px",
                        border: "1px solid #e4e7ec",
                        background:
                            activeSection === "profile-section"
                                ? "#111827"
                                : "#ffffff",
                        color:
                            activeSection === "profile-section"
                                ? "#ffffff"
                                : "#374151",
                        cursor: "pointer",
                        fontWeight: 600
                    }}
                >
                    👤 Profile
                </button>

                <button
                    type="button"
                    onClick={() => navigateToSection("availability-section")}
                    style={{
                        padding: "11px 18px",
                        borderRadius: "10px",
                        border: "1px solid #e4e7ec",
                        background:
                            activeSection === "availability-section"
                                ? "#111827"
                                : "#ffffff",
                        color:
                            activeSection === "availability-section"
                                ? "#ffffff"
                                : "#374151",
                        cursor: "pointer",
                        fontWeight: 600
                    }}
                >
                    🕐 Availability
                </button>

                <button
                    type="button"
                    onClick={() => navigateToSection("requests-section")}
                    style={{
                        padding: "11px 18px",
                        borderRadius: "10px",
                        border: "1px solid #e4e7ec",
                        background:
                            activeSection === "requests-section"
                                ? "#111827"
                                : "#ffffff",
                        color:
                            activeSection === "requests-section"
                                ? "#ffffff"
                                : "#374151",
                        cursor: "pointer",
                        fontWeight: 600
                    }}
                >
                    📩 Student Requests
                </button>

                <button
                    type="button"
                    onClick={handleLogout}
                    style={{
                        padding: "11px 18px",
                        borderRadius: "10px",
                        border: "1px solid #ef4444",
                        background: "#fff5f5",
                        color: "#dc2626",
                        cursor: "pointer",
                        fontWeight: 700
                    }}
                >
                    🚪 Logout
                </button>
            </div>

            {/* =========================================
                CONNECTION STATUS
            ========================================= */}

            <div
                className={
                    connected
                        ? "connection-status connected"
                        : "connection-status disconnected"
                }
            >
                <span className="status-dot">
                    ●
                </span>

                {connected
                    ? "Connected • Ready for requests"
                    : "Disconnected • Reconnecting..."
                }
            </div>

            {/* =========================================
                MESSAGE
            ========================================= */}

            {message && (
                <div className="dashboard-message">
                    {message}
                </div>
            )}

            {/* =========================================
                01 — PROFILE
            ========================================= */}

            <div
                id="profile-section"
                className="dashboard-section"
                style={{ scrollMarginTop: "90px" }}
            >
                <div className="section-title">
                    <div>
                        <span>01</span>
                        <h2>Your Profile</h2>
                    </div>

                    <span className="saved-badge">
                        ✓ Saved
                    </span>
                </div>

                <button
                    type="button"
                    className="add-slot-button"
                    onClick={openProfileEditor}
                    style={{ marginBottom: "20px" }}
                >
                    ✏️ Edit Profile
                </button>

                {profileMessage && (
                    <div className="availability-message" style={{ marginBottom: "18px" }}>
                        {profileMessage}
                    </div>
                )}

                <div className="profile-grid">

                    <div className="profile-info">
                        <span>FULL NAME</span>
                        <strong>
                            {currentProfile.name || "—"}
                        </strong>
                    </div>

                    <div className="profile-info">
                        <span>EMAIL</span>
                        <strong>
                            {currentProfile.email || "—"}
                        </strong>
                    </div>

                    <div className="profile-info">
                        <span>QUALIFICATION</span>
                        <strong>
                            {currentProfile.qualification || "—"}
                        </strong>
                    </div>

                    <div className="profile-info">
                        <span>EXPERIENCE</span>
                        <strong>
                            {currentProfile.experience ?? "—"} years
                        </strong>
                    </div>

                    <div className="profile-info">
                        <span>PRICE / SESSION</span>
                        <strong>
                            ₹{currentProfile.price_per_session || "—"}
                        </strong>
                    </div>

                    <div className="profile-info">
                        <span>LOCATION</span>
                        <strong>
                            {currentProfile.location || "—"}
                        </strong>
                    </div>

                    <div className="profile-info">
                        <span>RATING</span>
                        <strong>
                            ⭐ {currentProfile.rating || "New"}
                        </strong>
                    </div>

                    <div className="profile-info">
                        <span>RESUME</span>
                        <strong>
                            {currentProfile.resume_path
                                ? "📄 Uploaded"
                                : "Not uploaded"}
                        </strong>
                    </div>

                </div>
            </div>

            {/* =========================================
                02 — EXPERTISE
            ========================================= */}

            {(subjects.length > 0 ||
                Object.keys(expertise).length > 0) && (
                <div className="dashboard-section">

                    <div className="section-title">
                        <div>
                            <span>02</span>
                            <h2>Expertise</h2>
                        </div>

                        <span className="saved-badge">
                            {subjects.length} Subjects
                        </span>
                    </div>

                    <div className="expertise-list">
                        {subjects.map((subject) => (
                            <div
                                className="expertise-item"
                                key={subject}
                            >
                                <div>
                                    <strong>
                                        {subject}
                                    </strong>

                                    <small>
                                        Teaching expertise
                                    </small>
                                </div>

                                <span>
                                    {expertise[subject] ||
                                        "Intermediate"}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* =========================================
                03 — TEACHING VIDEOS
            ========================================= */}

            <div className="dashboard-section">

                <div className="section-title">
                    <div>
                        <span>03</span>
                        <h2>Teaching Videos</h2>
                    </div>

                    <span className="saved-badge">
                        Optional
                    </span>
                </div>

                <p
                    style={{
                        marginTop: "-8px",
                        marginBottom: "16px",
                        color: "#737b8c",
                        fontSize: "13px"
                    }}
                >
                    Add your YouTube channel or demo
                    videos to show your teaching style.
                </p>

                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        marginBottom: "18px"
                    }}
                >
                    {currentProfile.youtube_channel_url && (
                        <a
                            href={currentProfile.youtube_channel_url}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            ▶ YouTube Channel
                        </a>
                    )}

                    {currentProfile.demo_video_1 && (
                        <a
                            href={currentProfile.demo_video_1}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            ▶ Demo Video 1
                        </a>
                    )}

                    {currentProfile.demo_video_2 && (
                        <a
                            href={currentProfile.demo_video_2}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            ▶ Demo Video 2
                        </a>
                    )}

                    {!currentProfile.youtube_channel_url &&
                        !currentProfile.demo_video_1 &&
                        !currentProfile.demo_video_2 && (
                            <span
                                style={{
                                    color: "#737b8c",
                                    fontSize: "13px"
                                }}
                            >
                                No teaching videos added yet.
                            </span>
                        )}
                </div>

                <button
                    type="button"
                    className="add-slot-button"
                    onClick={() => {
                        setVideoMessage("");
                        setShowVideoPopup(true);
                    }}
                >
                    ✏️ Add / Edit Video Links
                </button>

                {videoMessage && (
                    <div className="availability-message">
                        {videoMessage}
                    </div>
                )}
            </div>

            {/* =========================================
                04 — AVAILABILITY
            ========================================= */}

            <div
                id="availability-section"
                className="dashboard-section"
                style={{ scrollMarginTop: "90px" }}
            >

                <div className="section-title">
                    <div>
                        <span>04</span>
                        <h2>My Availability</h2>
                    </div>

                    <span className="saved-badge">
                        {availabilitySlots.length}{" "}
                        {availabilitySlots.length === 1
                            ? "Slot"
                            : "Slots"}
                    </span>
                </div>

                <p
                    style={{
                        marginTop: "-8px",
                        marginBottom: "20px",
                        color: "#737b8c",
                        fontSize: "13px"
                    }}
                >
                    Add the time periods when you are
                    available to teach students.
                </p>

                <form
                    onSubmit={addAvailability}
                    className="availability-form"
                >
                    <div>
                        <label>DATE</label>

                        <input
                            type="date"
                            value={availabilityDate}
                            onChange={(event) =>
                                setAvailabilityDate(
                                    event.target.value
                                )
                            }
                            min={
                                new Date()
                                    .toISOString()
                                    .split("T")[0]
                            }
                            required
                        />
                    </div>

                    <div>
                        <label>START TIME</label>

                        <input
                            type="time"
                            value={availabilityStart}
                            onChange={(event) =>
                                setAvailabilityStart(
                                    event.target.value
                                )
                            }
                            required
                        />
                    </div>

                    <div>
                        <label>END TIME</label>

                        <input
                            type="time"
                            value={availabilityEnd}
                            onChange={(event) =>
                                setAvailabilityEnd(
                                    event.target.value
                                )
                            }
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="add-slot-button"
                        disabled={availabilityLoading}
                    >
                        {availabilityLoading
                            ? "Adding..."
                            : "+ Add Availability"}
                    </button>
                </form>

                {availabilityMessage && (
                    <div className="availability-message">
                        {availabilityMessage}
                    </div>
                )}

                {availabilitySlots.length === 0 ? (
                    <div className="availability-empty">
                        <span>🗓️</span>

                        <p>
                            No availability slots added yet.
                        </p>

                        <small>
                            Add your available teaching
                            times above.
                        </small>
                    </div>
                ) : (
                    <div className="availability-list">

                        {availabilitySlots.map((slot) => (
                            <div
                                className="availability-item"
                                key={slot.slot_id}
                            >
                                <div>
                                    <strong>
                                        {formatDate(
                                            slot.start_time
                                        )}
                                    </strong>

                                    <span>
                                        {formatTime(
                                            slot.start_time
                                        )}
                                        {" – "}
                                        {formatTime(
                                            slot.end_time
                                        )}
                                    </span>
                                </div>

                                <div className="availability-actions">

                                    <span
                                        className={getStatusClass(
                                            slot.status
                                        )}
                                    >
                                        {slot.status}
                                    </span>

                                    {String(slot.status)
                                        .toUpperCase() ===
                                        "AVAILABLE" && (
                                        <button
                                            type="button"
                                            className="delete-slot-button"
                                            onClick={() =>
                                                deleteAvailability(
                                                    slot.slot_id
                                                )
                                            }
                                        >
                                            Remove
                                        </button>
                                    )}

                                </div>
                            </div>
                        ))}

                    </div>
                )}
            </div>

            {/* =========================================
                05 — STUDENT REQUESTS
            ========================================= */}

            <div
                id="requests-section"
                className="dashboard-section"
                style={{ scrollMarginTop: "90px" }}
            >

                <div className="section-title">
                    <div>
                        <span>05</span>
                        <h2>Student Requests</h2>
                    </div>

                    <span className="request-count">
                        {requests.length}{" "}
                        {requests.length === 1
                            ? "Request"
                            : "Requests"}
                    </span>
                </div>

                {requests.length === 0 ? (
                    <div className="empty-state">

                        <div className="empty-icon">
                            📬
                        </div>

                        <h3>
                            No new requests
                        </h3>

                        <p>
                            Student tutoring requests
                            will appear here in real time.
                        </p>

                        <span className="empty-status">
                            ● Listening for new requests
                        </span>

                    </div>
                ) : (
                    <div className="request-list">

                        {requests.map((request) => (
                            <div
                                className="request-card"
                                key={request.request_id}
                            >

                                <div className="request-top">
                                    <div>
                                        <span className="request-id">
                                            REQUEST #
                                            {request.request_id}
                                        </span>

                                        <h3>
                                            {request.subject_name ||
                                                request.subject ||
                                                "Subject"}
                                        </h3>
                                    </div>

                                    <span className="live-badge">
                                        ● LIVE
                                    </span>
                                </div>

                                <div className="request-details">

                                    <div>
                                        <span>TOPIC</span>

                                        <strong>
                                            {request.topic || "—"}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>BUDGET</span>

                                        <strong>
                                            ₹{request.budget || "—"}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>MODE</span>

                                        <strong>
                                            {request.mode || "—"}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>PREFERRED TIME</span>

                                        <strong>
                                            {formatDateTime(
                                                request.preferred_time
                                            )}
                                        </strong>
                                    </div>

                                </div>

                                {request.slot_id && (
                                    <div className="slot-info">

                                        <div>
                                            <span>
                                                AVAILABLE SLOT
                                            </span>

                                            <strong>
                                                Slot #
                                                {request.slot_id}
                                            </strong>
                                        </div>

                                        <small>
                                            {formatTime(
                                                request.start_time
                                            )}
                                            {" – "}
                                            {formatTime(
                                                request.end_time
                                            )}
                                        </small>

                                    </div>
                                )}

                                <div className="request-actions">

                                    <button
                                        className="accept-button"
                                        onClick={() =>
                                            handleAccept(request)
                                        }
                                        disabled={
                                            processingRequest ===
                                            request.request_id
                                        }
                                    >
                                        {processingRequest ===
                                        request.request_id
                                            ? "Processing..."
                                            : "✓ Accept"}
                                    </button>

                                    <button
                                        className="reject-button"
                                        onClick={() =>
                                            handleReject(request)
                                        }
                                        disabled={
                                            processingRequest ===
                                            request.request_id
                                        }
                                    >
                                        {processingRequest ===
                                        request.request_id
                                            ? "Please wait..."
                                            : "✕ Reject"}
                                    </button>

                                </div>

                            </div>
                        ))}

                    </div>
                )}
            </div>

            {/* =========================================
                06 — BOOKINGS
            ========================================= */}

            <div
                id="bookings-section"
                className="dashboard-section"
                style={{ scrollMarginTop: "90px" }}
            >

                <div className="section-title">
                    <div>
                        <span>06</span>
                        <h2>My Sessions</h2>
                    </div>

                    <span className="saved-badge">
                        {bookings.length} {bookings.length === 1 ? "Session" : "Sessions"}
                    </span>
                </div>

                {loadingBookings ? (
                    <div className="empty-state">
                        Loading bookings...
                    </div>
                ) : bookings.length === 0 ? (
                    <div className="empty-state">

                        <div className="empty-icon">
                            📅
                        </div>

                        <h3>
                            No bookings yet
                        </h3>

                        <p>
                            Accepted student bookings
                            will appear here.
                        </p>

                    </div>
                ) : (
                    <div className="request-list">

                        {bookings.map((booking) => (
                            <div
                                className="request-card"
                                key={booking.booking_id}
                            >

                                <div className="request-top">
                                    <div>
                                        <span className="request-id">
                                            BOOKING #
                                            {booking.booking_id}
                                        </span>

                                        <h3>
                                            {booking.student_name ||
                                                `Student #${booking.student_id}`}
                                        </h3>
                                    </div>

                                    <span
                                        className={getStatusClass(
                                            booking.booking_status
                                        )}
                                    >
                                        {booking.booking_status}
                                    </span>
                                </div>

                                <div className="request-details">

                                    <div>
                                        <span>REQUEST ID</span>

                                        <strong>
                                            {booking.request_id || "—"}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>STUDENT ID</span>

                                        <strong>
                                            {booking.student_id || "—"}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>PRICE</span>

                                        <strong>
                                            ₹
                                            {booking.price_per_session ||
                                                currentProfile.price_per_session ||
                                                "—"}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>START TIME</span>

                                        <strong>
                                            {formatDateTime(
                                                booking.start_time
                                            )}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>END TIME</span>

                                        <strong>
                                            {formatDateTime(
                                                booking.end_time
                                            )}
                                        </strong>
                                    </div>

                                </div>

                                {booking.meeting_link && (
                                    <div className="slot-info">

                                        <div>
                                            <span>
                                                MEETING LINK
                                            </span>

                                            <a
                                                href={
                                                    booking.meeting_link
                                                }
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                Join Session
                                            </a>
                                        </div>

                                    </div>
                                )}

                            </div>
                        ))}

                    </div>
                )}
            </div>

            {/* =========================================
                SYSTEM STATUS
            ========================================= */}

            <div className="system-status">

                <span className="status-dot">
                    ●
                </span>

                <span>
                    TutorGo matching system is active
                </span>

            </div>

            {/* =========================================
                EDIT PROFILE POPUP
            ========================================= */}

            {showProfileEditor && (
                <div
                    className="video-popup-overlay"
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,.55)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "20px",
                        zIndex: 1000,
                        overflowY: "auto"
                    }}
                >
                    <div
                        className="video-popup"
                        style={{
                            width: "100%",
                            maxWidth: "560px",
                            background: "#fff",
                            borderRadius: "18px",
                            padding: "28px",
                            boxShadow: "0 20px 60px rgba(0,0,0,.2)"
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: "12px"
                            }}
                        >
                            <h2>✏️ Edit Tutor Profile</h2>
                            <button type="button" onClick={closeProfileEditor}>✕</button>
                        </div>

                        <form onSubmit={saveProfile}>
                            <div className="profile-info">
                                <label htmlFor="edit-tutor-name">Full Name</label>
                                <input id="edit-tutor-name" type="text" value={editName} onChange={(event) => setEditName(event.target.value)} required />
                            </div>

                            <div className="profile-info">
                                <label htmlFor="edit-tutor-email">Email</label>
                                <input id="edit-tutor-email" type="email" value={editEmail} onChange={(event) => setEditEmail(event.target.value)} required />
                            </div>

                            <div className="profile-info">
                                <label htmlFor="edit-tutor-qualification">Qualification</label>
                                <input id="edit-tutor-qualification" type="text" value={editQualification} onChange={(event) => setEditQualification(event.target.value)} required />
                            </div>

                            <div className="profile-info">
                                <label htmlFor="edit-tutor-experience">Experience (years)</label>
                                <input id="edit-tutor-experience" type="number" min="0" step="0.5" value={editExperience} onChange={(event) => setEditExperience(event.target.value)} required />
                            </div>

                            <div className="profile-info">
                                <label htmlFor="edit-tutor-price">Price per session (₹)</label>
                                <input id="edit-tutor-price" type="number" min="0" step="0.01" value={editPrice} onChange={(event) => setEditPrice(event.target.value)} required />
                            </div>

                            <div className="profile-info">
                                <label htmlFor="edit-tutor-location">Location</label>
                                <input id="edit-tutor-location" type="text" value={editLocation} onChange={(event) => setEditLocation(event.target.value)} required />
                            </div>

                            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "22px" }}>
                                <button type="button" className="reject-button" onClick={closeProfileEditor} disabled={profileSaving}>Cancel</button>
                                <button type="submit" className="accept-button" disabled={profileSaving}>
                                    {profileSaving ? "Saving..." : "Save Profile"}
                                </button>
                            </div>
                        </form>

                        {profileMessage && (
                            <div className="dashboard-message" style={{ marginTop: "16px" }}>
                                {profileMessage}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* =========================================
                VIDEO POPUP
            ========================================= */}

            {showVideoPopup && (
                <div
                    className="video-popup-overlay"
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,.55)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "20px",
                        zIndex: 1000
                    }}
                >

                    <div
                        className="video-popup"
                        style={{
                            width: "100%",
                            maxWidth: "520px",
                            background: "#fff",
                            borderRadius: "18px",
                            padding: "28px",
                            boxShadow:
                                "0 20px 60px rgba(0,0,0,.2)"
                        }}
                    >

                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center"
                            }}
                        >
                            <h2>
                                🎥 Showcase Your Teaching
                            </h2>

                            <button
                                type="button"
                                onClick={skipVideoLinks}
                            >
                                ✕
                            </button>
                        </div>

                        <p
                            style={{
                                color: "#737b8c",
                                fontSize: "14px",
                                lineHeight: 1.6
                            }}
                        >
                            Add your YouTube channel or
                            demo videos. All fields are optional.
                        </p>

                        <div className="profile-info">
                            <label htmlFor="youtube-channel-url">
                                YouTube Channel URL
                            </label>

                            <input
                                id="youtube-channel-url"
                                type="url"
                                placeholder="https://youtube.com/@yourchannel"
                                value={youtubeChannel}
                                onChange={(event) =>
                                    setYoutubeChannel(
                                        event.target.value
                                    )
                                }
                            />
                        </div>

                        <div className="profile-info">
                            <label htmlFor="demo-video-1">
                                Demo Video 1 URL
                            </label>

                            <input
                                id="demo-video-1"
                                type="url"
                                placeholder="https://youtube.com/watch?v=..."
                                value={demoVideo1}
                                onChange={(event) =>
                                    setDemoVideo1(
                                        event.target.value
                                    )
                                }
                            />
                        </div>

                        <div className="profile-info">
                            <label htmlFor="demo-video-2">
                                Demo Video 2 URL
                            </label>

                            <input
                                id="demo-video-2"
                                type="url"
                                placeholder="https://youtube.com/watch?v=..."
                                value={demoVideo2}
                                onChange={(event) =>
                                    setDemoVideo2(
                                        event.target.value
                                    )
                                }
                            />
                        </div>

                        <div
                            style={{
                                display: "flex",
                                gap: "12px",
                                justifyContent: "flex-end",
                                marginTop: "22px"
                            }}
                        >

                            <button
                                type="button"
                                className="reject-button"
                                onClick={skipVideoLinks}
                                disabled={videoLoading}
                            >
                                Skip for now
                            </button>

                            <button
                                type="button"
                                className="accept-button"
                                onClick={saveVideoLinks}
                                disabled={videoLoading}
                            >
                                {videoLoading
                                    ? "Saving..."
                                    : "Save & Continue"}
                            </button>

                        </div>

                        {videoMessage && (
                            <div
                                className="dashboard-message"
                                style={{
                                    marginTop: "16px"
                                }}
                            >
                                {videoMessage}
                            </div>
                        )}

                    </div>

                </div>
            )}

        </div>
    );
}

export default TutorDashboard;