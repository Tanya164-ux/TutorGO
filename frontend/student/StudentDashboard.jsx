

import { useEffect, useRef, useState } from "react";

import { io } from "socket.io-client";



const API_BASE_URL = "http://localhost:5000";



function StudentDashboard({ profile, onLogout }) {

    const studentId = profile?.student_id;



    // =========================================

    // FORM STATES

    // =========================================



    const [subjectId, setSubjectId] = useState("");

    const [customSubject, setCustomSubject] = useState("");

    const [topic, setTopic] = useState("");

    const [preferredTime, setPreferredTime] = useState("");

    const [budget, setBudget] = useState("");

    const [mode, setMode] = useState("Online");



    // =========================================

    // MATCHING STATES

    // =========================================



    const [result, setResult] = useState(null);

    const [selectedTutor, setSelectedTutor] = useState(null);



    // =========================================

    // REQUEST STATES

    // =========================================



    const [requestId, setRequestId] = useState(null);

    const [requestStatus, setRequestStatus] = useState(null);



    // =========================================

    // BOOKING STATES

    // =========================================



    const [bookingId, setBookingId] = useState(null);

    const [bookingStatus, setBookingStatus] = useState(null);

    const [meetingLink, setMeetingLink] = useState("");



    // =========================================

    // PAYMENT STATES

    // =========================================



    const [showPaymentPopup, setShowPaymentPopup] = useState(false);

    const [selectedBooking, setSelectedBooking] = useState(null);

    const [paymentMethod, setPaymentMethod] = useState("DEMO");

    const [paymentReference, setPaymentReference] = useState("");

    const [paymentLoading, setPaymentLoading] = useState(false);



    // =========================================

    // FEEDBACK STATES

    // =========================================



    const [feedbackRating, setFeedbackRating] = useState("5");

    const [feedbackComments, setFeedbackComments] = useState("");

    const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

    const [feedbackLoading, setFeedbackLoading] = useState(false);



    // =========================================

    // EDIT PROFILE STATES

    // =========================================



    const [isEditingProfile, setIsEditingProfile] = useState(false);

    const [profileForm, setProfileForm] = useState({

        name: "",

        email: "",

        education_level: ""

    });

    const [profileSaving, setProfileSaving] = useState(false);



    // =========================================

    // LOADING AND MESSAGE STATES

    // =========================================



    const [loading, setLoading] = useState(false);

    const [bookingLoading, setBookingLoading] = useState(false);

    const [error, setError] = useState("");

    const [success, setSuccess] = useState("");

    const [connected, setConnected] = useState(false);

    // =========================================
    // SESSION HISTORY STATES
    // =========================================

    const [studentBookings, setStudentBookings] = useState([]);
    const [bookingsLoading, setBookingsLoading] = useState(false);
    const [bookingsError, setBookingsError] = useState("");



    // =========================================

    // REFS

    // Prevent stale Socket.IO state

    // =========================================



    const requestIdRef = useRef(null);

    const bookingIdRef = useRef(null);



    const loadStudentBookings = async () => {
        if (!studentId) {
            setStudentBookings([]);
            return;
        }

        setBookingsLoading(true);
        setBookingsError("");

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/bookings/student/${studentId}`
            );

            const responseText = await response.text();
            let data;

            try {
                data = JSON.parse(responseText);
            } catch {
                throw new Error(
                    "Backend returned an invalid session history response."
                );
            }

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    data.message ||
                    "Failed to load session history."
                );
            }

            setStudentBookings(
                Array.isArray(data.bookings) ? data.bookings : []
            );
        } catch (err) {
            console.error("LOAD STUDENT BOOKINGS ERROR:", err);
            setBookingsError(
                err.message || "Failed to load your session history."
            );
        } finally {
            setBookingsLoading(false);
        }
    };

    useEffect(() => {
        loadStudentBookings();
    }, [studentId]);

    useEffect(() => {

        requestIdRef.current = requestId;

    }, [requestId]);



    useEffect(() => {

        bookingIdRef.current = bookingId;

    }, [bookingId]);



    useEffect(() => {

        if (!profile) {

            return;

        }



        setProfileForm({

            name: profile.name || "",

            email: profile.email || "",

            education_level:

                profile.education_level ||

                profile.class_year ||

                ""

        });

    }, [profile]);



    // =========================================

    // SUBJECT OPTIONS

    // =========================================



    const subjectOptions = [

        { id: "7", name: "Mathematics" },

        { id: "8", name: "Science" },

        { id: "9", name: "English" },

        { id: "10", name: "Physics" },

        { id: "11", name: "Chemistry" },

        { id: "12", name: "Biology" },

        { id: "13", name: "Social Science" },

        { id: "14", name: "Computer Science" },

        { id: "1", name: "DBMS" },

        { id: "2", name: "Operating Systems" },

        { id: "3", name: "Computer Networks" },

        { id: "4", name: "Data Structures" },

        { id: "5", name: "C++" },

        { id: "6", name: "SQL" },

        { id: "15", name: "Java" },

        { id: "16", name: "Python" },

        { id: "17", name: "Web Development" },

        { id: "18", name: "Software Engineering" }

    ];



    // =========================================

    // SOCKET.IO CONNECTION

    // =========================================



    useEffect(() => {

        if (!studentId) {

            return;

        }



        const socket = io(API_BASE_URL, {

            transports: ["websocket", "polling"]

        });



        socket.on("connect", () => {

            console.log("Student socket connected:", socket.id);



            setConnected(true);



            socket.emit("registerStudent", Number(studentId));



            console.log(

                `Student ${studentId} registered with socket`

            );

        });



        socket.on("disconnect", () => {

            console.log("Student socket disconnected");

            setConnected(false);

        });



        // =====================================

        // REQUEST STATUS UPDATED

        // =====================================



        socket.on("requestStatusUpdated", (data) => {

            console.log("REQUEST STATUS UPDATED:", data);



            const currentRequestId = requestIdRef.current;



            if (

                currentRequestId &&

                data.request_id &&

                Number(data.request_id) !== Number(currentRequestId)

            ) {

                return;

            }



            const status = data.status || data.request_status;



            if (status === "ACCEPTED") {

                const receivedBookingId =

                    data.booking_id || data.bookingId;



                setRequestStatus("ACCEPTED");



                if (receivedBookingId) {

                    setBookingId(receivedBookingId);

                    bookingIdRef.current = receivedBookingId;

                }



                setBookingStatus("PAYMENT_PENDING");



                setSelectedBooking({

                    booking_id: receivedBookingId,

                    request_id: data.request_id,

                    student_id: studentId,

                    tutor_id: data.tutor_id,

                    amount:

                        data.amount ||

                        selectedTutor?.price_per_session ||

                        budget

                });



                setShowPaymentPopup(true);



                setSuccess(

                    data.message ||

                    "Your tutor accepted the request. Please complete the demo payment."

                );



                setError("");

                // Refresh the persisted booking as soon as the tutor accepts.
                // A second refresh handles a brief DB commit/event timing race.
                loadStudentBookings();
                window.setTimeout(() => loadStudentBookings(), 800);

            }



            if (status === "REJECTED") {

                setRequestStatus("REJECTED");

                setSelectedTutor(null);

                setShowPaymentPopup(false);



                setSuccess("");



                setError(

                    data.message ||

                    "Your tutor rejected the request."

                );

            }

        });



        // =====================================

        // PAYMENT CONFIRMED

        // =====================================



        socket.on("paymentConfirmed", (data) => {

            console.log("PAYMENT CONFIRMED:", data);



            const currentBookingId = bookingIdRef.current;



            if (

                currentBookingId &&

                data.booking_id &&

                Number(data.booking_id) !== Number(currentBookingId)

            ) {

                return;

            }



            setBookingStatus(

                data.booking_status || "CONFIRMED"

            );



            setBookingId(data.booking_id || currentBookingId);



            setMeetingLink(data.meeting_link || "");



            setShowPaymentPopup(false);



            setSuccess(

                data.message ||

                "Payment successful. Your session is confirmed."

            );



            setError("");

            loadStudentBookings();

        });



        // =====================================

        // SESSION COMPLETED

        // =====================================



        socket.on("sessionCompleted", (data) => {

            console.log("SESSION COMPLETED:", data);



            const currentBookingId = bookingIdRef.current;



            if (

                currentBookingId &&

                data.booking_id &&

                Number(data.booking_id) !== Number(currentBookingId)

            ) {

                return;

            }



            setBookingStatus("COMPLETED");



            setSuccess(

                "Your session has ended. Please submit your feedback."

            );



            setError("");

            loadStudentBookings();

        });



        return () => {

            socket.off("requestStatusUpdated");

            socket.off("paymentConfirmed");

            socket.off("sessionCompleted");

            socket.disconnect();

        };

    }, [studentId]);



    // =========================================

    // RESET REQUEST DATA

    // =========================================



    const resetRequestData = () => {

        setResult(null);

        setSelectedTutor(null);



        setRequestId(null);

        requestIdRef.current = null;



        setRequestStatus(null);



        setBookingId(null);

        bookingIdRef.current = null;



        setBookingStatus(null);

        setMeetingLink("");



        setSelectedBooking(null);

        setShowPaymentPopup(false);



        setPaymentReference("");



        setFeedbackSubmitted(false);

        setFeedbackRating("5");

        setFeedbackComments("");

    };



    // =========================================

    // FIND TUTOR

    // =========================================



    const findTutor = async (event) => {

        event.preventDefault();



        setError("");

        setSuccess("");



        resetRequestData();



        if (!studentId) {

            setError(

                "Student profile not found. Please login again."

            );

            return;

        }



        if (!subjectId) {

            setError("Please select a subject.");

            return;

        }



        if (

            subjectId === "OTHER" &&

            !customSubject.trim()

        ) {

            setError("Please enter your subject.");

            return;

        }



        if (!topic.trim()) {

            setError("Please enter the topic.");

            return;

        }



        if (!preferredTime) {

            setError(

                "Please select your preferred date and time."

            );

            return;

        }



        if (!budget || Number(budget) <= 0) {

            setError("Please enter a valid budget.");

            return;

        }



        const selectedDate = new Date(preferredTime);



        if (Number.isNaN(selectedDate.getTime())) {

            setError("Please select a valid date and time.");

            return;

        }



        if (selectedDate <= new Date()) {

            setError("Please select a future date and time.");

            return;

        }



        setLoading(true);



        try {

            // =====================================

            // CREATE REQUEST

            // =====================================



            const requestBody = {

                student_id: Number(studentId),



                subject_id:

                    subjectId === "OTHER"

                        ? null

                        : Number(subjectId),



                subject_name:

                    subjectId === "OTHER"

                        ? customSubject.trim()

                        : null,



                topic: topic.trim(),



                preferred_time: preferredTime,



                budget: Number(budget),



                mode: mode

            };



            console.log("REQUEST BODY:", requestBody);



            const requestResponse = await fetch(

                `${API_BASE_URL}/api/requests`,

                {

                    method: "POST",



                    headers: {

                        "Content-Type": "application/json"

                    },



                    body: JSON.stringify(requestBody)

                }

            );



            const requestText = await requestResponse.text();



            let requestData;



            try {

                requestData = JSON.parse(requestText);

            } catch {

                throw new Error(

                    "Backend returned an invalid response while creating the request."

                );

            }



            if (!requestResponse.ok) {

                throw new Error(

                    requestData.error ||

                    requestData.message ||

                    "Failed to create coaching request."

                );

            }



            console.log(

                "Coaching request created:",

                requestData

            );



            const newRequestId =

                requestData.request_id ||

                requestData.request?.request_id;



            if (!newRequestId) {

                throw new Error(

                    "Request was created, but request ID was not returned."

                );

            }



            setRequestId(newRequestId);

            requestIdRef.current = newRequestId;



            // =====================================

            // RUN MATCHING

            // =====================================



            const matchingResponse = await fetch(

                `${API_BASE_URL}/api/matching/${newRequestId}`

            );



            const matchingText = await matchingResponse.text();



            let matchingData;



            try {

                matchingData = JSON.parse(matchingText);

            } catch {

                throw new Error(

                    "Backend returned an invalid matching response."

                );

            }



            if (!matchingResponse.ok) {

                throw new Error(

                    matchingData.error ||

                    matchingData.message ||

                    "Tutor matching failed."

                );

            }



            console.log(

                "Matching result:",

                matchingData

            );



            setResult(matchingData);



            setSuccess(

                matchingData.message ||

                "Tutors matched successfully. Select a tutor to continue."

            );

        } catch (err) {

            console.error("FIND TUTOR ERROR:", err);



            setError(

                err.message ||

                "Something went wrong while finding tutors."

            );

        } finally {

            setLoading(false);

        }

    };



    // =========================================

    // SELECT TUTOR

    // =========================================



    const selectTutor = async (tutor) => {

        setError("");

        setSuccess("");



        const currentRequestId =

            result?.request?.request_id ||

            requestId;



        if (!currentRequestId) {

            setError("Request information is missing.");

            return;

        }



        if (!studentId) {

            setError("Student profile not found.");

            return;

        }



        if (!tutor?.tutor_id) {

            setError("Invalid tutor selected.");

            return;

        }



        if (!tutor?.available_slot?.slot_id) {

            setError(

                "Selected tutor does not have a valid availability slot."

            );

            return;

        }



        setSelectedTutor(tutor);

        setBookingLoading(true);



        try {

            const response = await fetch(

                `${API_BASE_URL}/api/tutor-requests/${currentRequestId}/select`,

                {

                    method: "POST",



                    headers: {

                        "Content-Type": "application/json"

                    },



                    body: JSON.stringify({

                        student_id: Number(studentId),



                        tutor_id: Number(tutor.tutor_id),



                        slot_id: Number(

                            tutor.available_slot.slot_id

                        )

                    })

                }

            );



            const responseText = await response.text();



            let data;



            try {

                data = JSON.parse(responseText);

            } catch {

                throw new Error(

                    "Backend returned an invalid response while selecting tutor."

                );

            }



            console.log(

                "Tutor selection response:",

                data

            );



            if (!response.ok) {

                throw new Error(

                    data.error ||

                    data.message ||

                    "Failed to select tutor."

                );

            }



            const newRequestId =

                data.request_id ||

                currentRequestId;



            setRequestId(newRequestId);

            requestIdRef.current = newRequestId;



            setRequestStatus(

                data.status ||

                data.request_status ||

                "PENDING"

            );



            setBookingId(null);

            bookingIdRef.current = null;



            if (data.tutor_online) {

                setSuccess(

                    `${tutor.name} has been notified. Waiting for tutor approval.`

                );

            } else {

                setSuccess(

                    `${tutor.name} was selected. The tutor is currently offline.`

                );

            }



            setError("");

        } catch (err) {

            console.error("SELECT TUTOR ERROR:", err);



            setError(

                err.message ||

                "Failed to select tutor."

            );



            setSelectedTutor(null);

        } finally {

            setBookingLoading(false);

        }

    };



    // =========================================

    // MOCK PAYMENT

    // =========================================



    const handleMockPayment = async (event) => {

        event.preventDefault();



        if (!selectedBooking?.booking_id) {

            setError("Booking information is missing.");

            return;

        }



        if (!studentId) {

            setError("Student information is missing.");

            return;

        }



        if (!paymentMethod) {

            setError("Please select a payment method.");

            return;

        }



        if (

            !paymentReference ||

            paymentReference.trim().length < 3

        ) {

            setError(

                "Please enter a payment reference with at least 3 characters."

            );

            return;

        }



        setPaymentLoading(true);

        setError("");

        setSuccess("");



        try {

            const paymentBody = {

                booking_id: Number(

                    selectedBooking.booking_id

                ),



                student_id: Number(studentId),



                payment_method: paymentMethod,



                payment_reference:

                    paymentReference.trim()

            };



            console.log(

                "PAYMENT REQUEST BODY:",

                paymentBody

            );



            const response = await fetch(

                `${API_BASE_URL}/api/payments/mock`,

                {

                    method: "POST",



                    headers: {

                        "Content-Type": "application/json"

                    },



                    body: JSON.stringify(paymentBody)

                }

            );



            const responseText = await response.text();



            console.log(

                "Payment HTTP status:",

                response.status

            );



            console.log(

                "Payment response:",

                responseText

            );



            let data;



            try {

                data = JSON.parse(responseText);

            } catch {

                throw new Error(

                    "Backend returned an invalid payment response."

                );

            }



            if (!response.ok) {

                throw new Error(

                    data.error ||

                    data.message ||

                    "Mock payment failed."

                );

            }



            const confirmedBookingId =

                data.booking_id ||

                selectedBooking.booking_id;



            const confirmedMeetingLink =

                data.meeting_link ||

                `https://meet.google.com/demo-tutorgo-${confirmedBookingId}`;



            setBookingId(confirmedBookingId);

            bookingIdRef.current = confirmedBookingId;



            setBookingStatus(

                data.booking_status ||

                "CONFIRMED"

            );



            setMeetingLink(confirmedMeetingLink);



            setShowPaymentPopup(false);



            setSuccess(

                data.message ||

                "Payment successful. Your session is confirmed."

            );



            setError("");

            await loadStudentBookings();



            console.log(

                "Meeting link received:",

                confirmedMeetingLink

            );

        } catch (err) {

            console.error("MOCK PAYMENT ERROR:", err);



            setError(

                err.message ||

                "Payment processing failed."

            );

        } finally {

            setPaymentLoading(false);

        }

    };



    // =========================================

    // SUBMIT FEEDBACK

    // =========================================



    const submitFeedback = async (event) => {

        event.preventDefault();



        if (!bookingId) {

            setError("Booking information is missing.");

            return;

        }



        if (!studentId) {

            setError("Student information is missing.");

            return;

        }



        setFeedbackLoading(true);

        setError("");

        setSuccess("");



        try {

            const response = await fetch(

                `${API_BASE_URL}/api/feedback`,

                {

                    method: "POST",



                    headers: {

                        "Content-Type": "application/json"

                    },



                    body: JSON.stringify({

                        booking_id: Number(bookingId),



                        student_id: Number(studentId),



                        rating: Number(feedbackRating),



                        comments: feedbackComments.trim()

                    })

                }

            );



            const responseText = await response.text();



            let data;



            try {

                data = JSON.parse(responseText);

            } catch {

                throw new Error(

                    "Backend returned an invalid feedback response."

                );

            }



            if (!response.ok) {

                throw new Error(

                    data.error ||

                    data.message ||

                    "Feedback submission failed."

                );

            }



            setFeedbackSubmitted(true);

            await loadStudentBookings();



            setSuccess(

                data.message ||

                "Thank you! Your feedback was submitted."

            );



            setError("");

        } catch (err) {

            console.error("FEEDBACK ERROR:", err);



            setError(

                err.message ||

                "Feedback submission failed."

            );

        } finally {

            setFeedbackLoading(false);

        }

    };



    // =========================================

    // FORMAT DATE AND TIME

    // =========================================



    const formatTime = (time) => {

        if (!time) {

            return "Not available";

        }



        const date = new Date(time);



        if (Number.isNaN(date.getTime())) {

            return "Not available";

        }



        return date.toLocaleTimeString([], {

            hour: "2-digit",

            minute: "2-digit"

        });

    };



    const formatDate = (time) => {

        if (!time) {

            return "";

        }



        const date = new Date(time);



        if (Number.isNaN(date.getTime())) {

            return "";

        }



        return date.toLocaleDateString([], {

            day: "2-digit",

            month: "short",

            year: "numeric"

        });

    };



    // =========================================

    // MATCHED TUTORS

    // =========================================



    const matchedTutors =

        result?.matched_tutors?.slice(0, 5) || [];



    // =========================================

    // UPDATE STUDENT PROFILE

    // =========================================



    const updateStudentProfile = async (event) => {

        event.preventDefault();



        if (!studentId) {

            setError("Student information is missing. Please login again.");

            return;

        }



        if (

            !profileForm.name.trim() ||

            !profileForm.email.trim() ||

            !profileForm.education_level.trim()

        ) {

            setError("Name, email and education level are required.");

            return;

        }



        setProfileSaving(true);

        setError("");

        setSuccess("");



        try {

            const response = await fetch(

                `${API_BASE_URL}/api/students/${studentId}`,

                {

                    method: "PUT",

                    headers: {

                        "Content-Type": "application/json"

                    },

                    body: JSON.stringify({

                        name: profileForm.name.trim(),

                        email: profileForm.email.trim(),

                        education_level:

                            profileForm.education_level.trim()

                    })

                }

            );



            const responseText = await response.text();

            let data;



            try {

                data = JSON.parse(responseText);

            } catch {

                throw new Error(

                    "Backend returned an invalid profile response."

                );

            }



            if (!response.ok) {

                throw new Error(

                    data.error ||

                    data.message ||

                    "Failed to update student profile."

                );

            }



            setProfileForm({

                name: data.student?.name || profileForm.name.trim(),

                email: data.student?.email || profileForm.email.trim(),

                education_level:

                    data.student?.education_level ||

                    profileForm.education_level.trim()

            });



            setIsEditingProfile(false);

            setSuccess(

                data.message ||

                "Student profile updated successfully."

            );

            setError("");

        } catch (err) {

            console.error("STUDENT PROFILE UPDATE ERROR:", err);

            setError(

                err.message ||

                "Failed to update student profile."

            );

        } finally {

            setProfileSaving(false);

        }

    };



    // =========================================

    // TOP NAVIGATION HELPERS

    // =========================================

    const scrollToSection = (sectionId) => {
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

        // Fallback if the dashboard is rendered without Home.jsx.
        localStorage.removeItem("tutorgo_role");
        localStorage.removeItem("tutorgo_profile");
        window.location.reload();
    };

    // =========================================

    // RENDER

    // =========================================



    return (

        <div
            className="dashboard-page"
            style={{ paddingTop: "82px", boxSizing: "border-box" }}
        >



            {/* =====================================

                HEADER

            ===================================== */}


{/* =========================================
    STUDENT DASHBOARD HEADER
========================================= */}

<div className="dashboard-header">

    <div>

        <span className="dashboard-label">
            STUDENT DASHBOARD
        </span>

        <h1>
            Welcome,{" "}
            {profile?.name || "Student"} 👋
        </h1>

        <p>
            Find tutors, book sessions and manage
            your learning journey.
        </p>

    </div>

    <div className="profile-badge">

        <span>
            🎓
        </span>

        <div>

            <strong>
                Student
            </strong>

            <small>
                Student ID: {profile?.student_id || "—"}
            </small>

        </div>

    </div>

</div>



            {/* =====================================

                CONNECTION STATUS

            ===================================== */}



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

                    ? "Connected • Ready for updates"

                    : "Disconnected • Reconnecting..."

                }

            </div>



            {/* =====================================

                TOP NAVIGATION

            ===================================== */}

            <div
                className="student-dashboard-nav"
                style={{
                    display: "flex",
                    gap: "12px",
                    alignItems: "center",
                    justifyContent: "center",
                    flexWrap: "wrap",
                    margin: "0",
                    padding: "14px 16px",
                    background: "#ffffff",
                    borderRadius: "0 0 12px 12px",
                    boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
                    position: "fixed",
                    top: "0",
                    left: "0",
                    right: "0",
                    width: "100vw",
                    maxWidth: "100vw",
                    boxSizing: "border-box",
                    zIndex: 1000
                }}
            >
                <button
                    type="button"
                    onClick={() => scrollToSection("student-sessions")}
                    style={{
                        padding: "11px 18px",
                        borderRadius: "10px",
                        border: "1px solid #e4e7ec",
                        background: "#ffffff",
                        color: "#374151",
                        cursor: "pointer",
                        fontWeight: 600
                    }}
                >
                    📚 My Sessions
                </button>

                <button
                    type="button"
                    onClick={() => scrollToSection("student-profile")}
                    style={{
                        padding: "11px 18px",
                        borderRadius: "10px",
                        border: "1px solid #e4e7ec",
                        background: "#ffffff",
                        color: "#374151",
                        cursor: "pointer",
                        fontWeight: 600
                    }}
                >
                    👤 Profile
                </button>

                <button
                    type="button"
                    onClick={() => scrollToSection("book-session")}
                    style={{
                        padding: "11px 18px",
                        borderRadius: "10px",
                        border: "1px solid #e4e7ec",
                        background: "#ffffff",
                        color: "#374151",
                        cursor: "pointer",
                        fontWeight: 600
                    }}
                >
                    📅 Book a Session
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

            {/* =====================================

                PROFILE

            ===================================== */}



            {profile && (

                <div
                    id="student-profile"
                    className="request-card"
                    style={{ scrollMarginTop: "90px" }}
                >

                    <div className="section-heading-row">

                        <h2>Your Profile</h2>



                        <button

                            type="button"

                            className="edit-profile-button"

                            onClick={() => {

                                setIsEditingProfile(!isEditingProfile);

                                setError("");

                                setSuccess("");

                            }}

                        >

                            {isEditingProfile

                                ? "Cancel"

                                : "✏️ Edit Profile"}

                        </button>

                    </div>



                    {!isEditingProfile ? (

                        <div className="profile-grid">

                            <div className="profile-info">

                                <strong>Name</strong>

                                <span>{profileForm.name || profile.name}</span>

                            </div>



                            <div className="profile-info">

                                <strong>Email</strong>

                                <span>{profileForm.email || profile.email}</span>

                            </div>



                            <div className="profile-info">

                                <strong>Student ID</strong>

                                <span>{profile.student_id}</span>

                            </div>



                            <div className="profile-info">

                                <strong>Class / Degree Year</strong>

                                <span>

                                    {profileForm.education_level ||

                                        profile.education_level ||

                                        profile.class_year ||

                                        "Not specified"}

                                </span>

                            </div>

                        </div>

                    ) : (

                        <form

                            className="profile-edit-form"

                            onSubmit={updateStudentProfile}

                        >

                            <label htmlFor="student-profile-name">

                                Name

                            </label>

                            <input

                                id="student-profile-name"

                                type="text"

                                value={profileForm.name}

                                onChange={(event) =>

                                    setProfileForm({

                                        ...profileForm,

                                        name: event.target.value

                                    })

                                }

                                required

                            />



                            <label htmlFor="student-profile-email">

                                Email

                            </label>

                            <input

                                id="student-profile-email"

                                type="email"

                                value={profileForm.email}

                                onChange={(event) =>

                                    setProfileForm({

                                        ...profileForm,

                                        email: event.target.value

                                    })

                                }

                                required

                            />



                            <label htmlFor="student-profile-education">

                                Class / Degree Year

                            </label>

                            <input

                                id="student-profile-education"

                                type="text"

                                placeholder="e.g. BTech CSE 2nd Year"

                                value={profileForm.education_level}

                                onChange={(event) =>

                                    setProfileForm({

                                        ...profileForm,

                                        education_level: event.target.value

                                    })

                                }

                                required

                            />



                            <button

                                type="submit"

                                disabled={profileSaving}

                            >

                                {profileSaving

                                    ? "Saving Profile..."

                                    : "Save Changes"}

                            </button>

                        </form>

                    )}

                </div>

            )}



            {/* =====================================
                SESSION HISTORY
            ===================================== */}

            <div
                id="student-sessions"
                className="request-card"
                style={{ scrollMarginTop: "90px" }}
            >
                <div className="section-heading-row">
                    <div>
                        <h2>My Sessions</h2>
                        <p>All sessions associated with your account.</p>
                    </div>

                    <button
                        type="button"
                        className="edit-profile-button"
                        onClick={loadStudentBookings}
                        disabled={bookingsLoading}
                    >
                        {bookingsLoading ? "Refreshing..." : "↻ Refresh"}
                    </button>
                </div>

                {bookingsError && (
                    <div className="error-message">
                        ❌ {bookingsError}
                    </div>
                )}

                {bookingsLoading && studentBookings.length === 0 ? (
                    <p>Loading your session history...</p>
                ) : studentBookings.length === 0 ? (
                    <p>No sessions found yet.</p>
                ) : (
                    <div
                        className="session-history-list"
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
                            gap: "20px",
                            alignItems: "stretch",
                            marginTop: "22px",
                        }}
                    >
                        {studentBookings.map((booking) => (
                            <div
                                className="session-history-item"
                                key={booking.booking_id}
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "space-between",
                                    gap: "18px",
                                    minWidth: 0,
                                    padding: "22px",
                                    border: "1px solid #e3e8f3",
                                    borderRadius: "18px",
                                    background: "linear-gradient(145deg, #ffffff 0%, #f8faff 100%)",
                                    boxShadow: "0 8px 24px rgba(28, 45, 90, 0.07)",
                                    transition: "transform 160ms ease, box-shadow 160ms ease",
                                }}
                            >
                                <div className="session-history-main">
                                    <h3 style={{
                                        margin: "0 0 16px",
                                        color: "#172b4d",
                                        fontSize: "1.15rem",
                                        lineHeight: 1.35,
                                        overflowWrap: "anywhere",
                                    }}>
                                        {booking.tutor_name || "Tutor not available"}
                                    </h3>

                                    <p style={{ margin: "10px 0", color: "#4b5872", fontSize: "0.96rem", lineHeight: 1.5 }}>
                                        <strong style={{ color: "#243653" }}>Booking ID:</strong>{" "}
                                        {booking.booking_id}
                                    </p>

                                    <p style={{ margin: "10px 0", color: "#4b5872", fontSize: "0.96rem", lineHeight: 1.5 }}>
                                        <strong style={{ color: "#243653" }}>Date:</strong>{" "}
                                        {formatDate(booking.start_time) || "Not available"}
                                    </p>

                                    <p style={{ margin: "10px 0", color: "#4b5872", fontSize: "0.96rem", lineHeight: 1.5 }}>
                                        <strong style={{ color: "#243653" }}>Time:</strong>{" "}
                                        {formatTime(booking.start_time)}
                                        {booking.end_time
                                            ? ` - ${formatTime(booking.end_time)}`
                                            : ""}
                                    </p>

                                    <p style={{ margin: "10px 0", color: "#4b5872", fontSize: "0.96rem", lineHeight: 1.5 }}>
                                        <strong style={{ color: "#243653" }}>Price:</strong>{" "}
                                        {booking.price_per_session != null
                                            ? `₹${booking.price_per_session}`
                                            : "Not available"}
                                    </p>
                                </div>

                                <div className="session-history-status" style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    alignItems: "center",
                                    gap: "8px",
                                    paddingTop: "14px",
                                    borderTop: "1px solid #e8edf6",
                                    color: "#344563",
                                    fontSize: "0.9rem",
                                }}>
                                    <span style={(() => {
                                        const status = String(booking.booking_status || "Not available").toUpperCase();
                                        // Confirmed and completed bookings share the green success styling.
                                        // Pending, cancelled, and other states remain visually distinguishable.
                                        const palette = ["CONFIRMED", "COMPLETED"].includes(status)
                                            ? { background: "#e8f8ef", color: "#18794e" }
                                            : ["PAYMENT_PENDING", "PENDING"].includes(status)
                                                ? { background: "#fff4db", color: "#946200" }
                                                : ["CANCELLED", "REJECTED"].includes(status)
                                                    ? { background: "#fff0f0", color: "#b42318" }
                                                    : { background: "#eef2ff", color: "#4f46a5" };
                                        return {
                                            display: "inline-flex",
                                            alignItems: "center",
                                            padding: "7px 11px",
                                            borderRadius: "999px",
                                            fontWeight: 600,
                                            ...palette,
                                        };
                                    })()}>
                                        <strong>Status:</strong>{" "}
                                        {booking.booking_status || "Not available"}
                                    </span>

                                    {booking.payment_status && (
                                        <span style={{
                                            display: "inline-flex",
                                            alignItems: "center",
                                            padding: "7px 11px",
                                            borderRadius: "999px",
                                            background: String(booking.payment_status).toUpperCase() === "SUCCESS" ? "#e8f8ef" : "#f0f5ff",
                                            color: String(booking.payment_status).toUpperCase() === "SUCCESS" ? "#18794e" : "#3c5a91",
                                            fontWeight: 500,
                                        }}>
                                            <strong style={{ marginRight: "4px" }}>Payment:</strong>{" "}
                                            {booking.payment_status}
                                        </span>
                                    )}
                                </div>

                                {(() => {
                                    const bookingState = String(booking.booking_status || "").toUpperCase();
                                    const paymentState = String(booking.payment_status || "").toUpperCase();
                                    const paymentDue =
                                        ["PAYMENT_PENDING", "PENDING", "ACCEPTED", "TUTOR_ACCEPTED"].includes(bookingState) ||
                                        ["PENDING", "FAILED"].includes(paymentState);

                                    return paymentDue ? (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedBooking({
                                                    ...booking,
                                                    amount: booking.amount ?? booking.price_per_session,
                                                });
                                                setBookingId(booking.booking_id);
                                                bookingIdRef.current = booking.booking_id;
                                                setBookingStatus(booking.booking_status || "PAYMENT_PENDING");
                                                setPaymentReference("");
                                                setPaymentMethod("DEMO");
                                                setError("");
                                                setShowPaymentPopup(true);
                                            }}
                                            style={{
                                                width: "100%",
                                                marginTop: "2px",
                                                padding: "12px 16px",
                                                border: "none",
                                                borderRadius: "11px",
                                                background: "linear-gradient(135deg, #6254c7, #4f46a5)",
                                                color: "#ffffff",
                                                fontWeight: 700,
                                                fontSize: "0.95rem",
                                                cursor: "pointer",
                                            }}
                                        >
                                            Complete Demo Payment
                                        </button>
                                    ) : null;
                                })()}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* =====================================

                FIND A TUTOR

            ===================================== */}



            <div
                id="book-session"
                className="request-card"
                style={{ scrollMarginTop: "90px" }}
            >

                <h2>Book a Session</h2>



                <p>

                    Select a subject and find a suitable tutor.

                </p>



                <form onSubmit={findTutor}>



                    {/* SUBJECT */}



                    <label>

                        Subject

                    </label>



                    <select

                        value={subjectId}

                        onChange={(event) => {

                            const value = event.target.value;



                            setSubjectId(value);



                            if (value !== "OTHER") {

                                setCustomSubject("");

                            }

                        }}

                        required

                    >

                        <option value="">

                            Select Subject

                        </option>



                        {subjectOptions.map((subject) => (

                            <option

                                key={subject.id}

                                value={subject.id}

                            >

                                {subject.name}

                            </option>

                        ))}



                        <option value="OTHER">

                            Other - Enter your subject

                        </option>

                    </select>



                    {/* CUSTOM SUBJECT */}



                    {subjectId === "OTHER" && (

                        <>

                            <label>

                                Enter Your Subject

                            </label>



                            <input

                                type="text"

                                placeholder="e.g. French, Economics, Class 6 Maths"

                                value={customSubject}

                                onChange={(event) =>

                                    setCustomSubject(

                                        event.target.value

                                    )

                                }

                                required

                            />

                        </>

                    )}



                    {/* TOPIC */}



                    <label>

                        Topic

                    </label>



                    <input

                        type="text"

                        placeholder="e.g. Basics, Algebra, Normalization"

                        value={topic}

                        onChange={(event) =>

                            setTopic(event.target.value)

                        }

                        required

                    />



                    {/* PREFERRED TIME */}



                    <label>

                        Preferred Date & Time

                    </label>



                    <input

                        type="datetime-local"

                        value={preferredTime}

                        onChange={(event) =>

                            setPreferredTime(

                                event.target.value

                            )

                        }

                        required

                    />



                    {/* BUDGET */}



                    <label>

                        Maximum Budget (₹)

                    </label>



                    <input

                        type="number"

                        min="1"

                        placeholder="e.g. 500"

                        value={budget}

                        onChange={(event) =>

                            setBudget(event.target.value)

                        }

                        required

                    />



                    {/* MODE */}



                    <label>

                        Mode

                    </label>



                    <select

                        value={mode}

                        onChange={(event) =>

                            setMode(event.target.value)

                        }

                    >

                        <option value="Online">

                            Online

                        </option>



                        <option value="Offline">

                            Offline

                        </option>

                    </select>



                    {/* SUBMIT */}



                    <button

                        type="submit"

                        disabled={loading}

                    >

                        {loading

                            ? "Finding Tutors..."

                            : "Find Tutors"

                        }

                    </button>

                </form>

            </div>



            {/* =====================================

                ERROR MESSAGE

            ===================================== */}



            {error && (

                <div className="error-message">

                    ❌ {error}

                </div>

            )}



            {/* =====================================

                SUCCESS MESSAGE

            ===================================== */}



            {success && (

                <div className="success-message">

                    ✅ {success}

                </div>

            )}



            {/* =====================================

                REQUEST STATUS

            ===================================== */}



            {requestStatus === "PENDING" && (

                <div className="success-message">

                    Waiting for the tutor to approve your request.

                </div>

            )}



            {requestStatus === "ACCEPTED" && (

                <div className="success-message">

                    Tutor accepted your request.



                    {bookingId && (

                        <span>

                            {" "}Booking ID: {bookingId}

                        </span>

                    )}

                </div>

            )}



            {requestStatus === "REJECTED" && (

                <div className="error-message">

                    Tutor rejected your request.

                    Please select another tutor.

                </div>

            )}



            {/* =====================================

                MATCHING RESULTS

            ===================================== */}



            {result && (

                <div className="match-result">



                    <h2>

                        Top Tutor Matches

                    </h2>



                    <p>

                        We found{" "}

                        <strong>

                            {result.total_matches ||

                                matchedTutors.length ||

                                0}

                        </strong>{" "}

                        suitable tutor

                        {matchedTutors.length !== 1

                            ? "s"

                            : ""

                        }.

                    </p>



                    {matchedTutors.length === 0 ? (

                        <div className="request-card">

                            <h3>

                                No suitable tutor found.

                            </h3>



                            <p>

                                Try changing the time,

                                budget, or subject.

                            </p>

                        </div>

                    ) : (

                        <div className="role-cards">



                            {matchedTutors.map((tutor, index) => (

                                <div

                                    className="tutor-card"

                                    key={tutor.tutor_id}

                                >



                                    <div className="saved-badge">

                                        #{index + 1} Match

                                    </div>



                                    <h2>

                                        {tutor.name}

                                    </h2>



                                    <p>

                                        <strong>

                                            Qualification:

                                        </strong>{" "}

                                        {tutor.qualification ||

                                            "Not specified"

                                        }

                                    </p>



                                    <p>

                                        <strong>

                                            Experience:

                                        </strong>{" "}

                                        {tutor.experience || 0}

                                        {" "}years

                                    </p>



                                    <p>

                                        <strong>

                                            Expertise:

                                        </strong>{" "}

                                        {tutor.expertise_level ||

                                            "Intermediate"

                                        }

                                    </p>



                                    <p>

                                        <strong>

                                            Rating:

                                        </strong>{" "}

                                        ⭐{" "}

                                        {tutor.rating || "N/A"}

                                    </p>



                                    <p>

                                        <strong>

                                            Price:

                                        </strong>{" "}

                                        ₹

                                        {tutor.price_per_session ||

                                            "Not specified"

                                        }

                                        {" / session"}

                                    </p>



                                    <p>

                                        <strong>

                                            Location:

                                        </strong>{" "}

                                        {tutor.location ||

                                            "Not specified"

                                        }

                                    </p>



                                    <p>

                                        <strong>

                                            Match Score:

                                        </strong>{" "}

                                        {tutor.match_score || 0}%

                                    </p>



                                    <p>

                                        <strong>

                                            Available:

                                        </strong>



                                        <br />



                                        {formatDate(

                                            tutor.available_slot

                                                ?.start_time

                                        )}



                                        <br />



                                        {formatTime(

                                            tutor.available_slot

                                                ?.start_time

                                        )}



                                        {" - "}



                                        {formatTime(

                                            tutor.available_slot

                                                ?.end_time

                                        )}

                                    </p>



                                    <button

                                        className="accept-button"

                                        disabled={

                                            bookingLoading ||

                                            requestStatus === "PENDING" ||

                                            requestStatus === "ACCEPTED"

                                        }

                                        onClick={() =>

                                            selectTutor(tutor)

                                        }

                                    >

                                        {bookingLoading &&

                                            selectedTutor?.tutor_id ===

                                            tutor.tutor_id

                                            ? "Sending Request..."

                                            : requestStatus === "PENDING"

                                                ? "Waiting for Approval"

                                                : requestStatus === "ACCEPTED"

                                                    ? "Booking Confirmed"

                                                    : requestStatus === "REJECTED"

                                                        ? "Select Tutor Again"

                                                        : "Select Tutor"

                                        }

                                    </button>



                                </div>

                            ))}



                        </div>

                    )}



                </div>

            )}



            {/* =====================================

                PAYMENT POPUP

            ===================================== */}



            {showPaymentPopup && selectedBooking && (

                <div className="payment-modal-overlay">



                    <div className="payment-modal">



                        <h2>

                            🎉 Tutor Approved Your Request

                        </h2>



                        <p>

                            Complete the demo payment to

                            confirm your session.

                        </p>



                        <p>

                            <strong>

                                Booking ID:

                            </strong>{" "}

                            {selectedBooking.booking_id}

                        </p>



                        <p>

                            <strong>

                                Amount:

                            </strong>{" "}

                            ₹

                            {selectedBooking.amount ||

                                budget ||

                                "As discussed"

                            }

                        </p>



                        <form onSubmit={handleMockPayment}>



                            <label>

                                Payment Method

                            </label>



                            <select

                                value={paymentMethod}

                                onChange={(event) =>

                                    setPaymentMethod(

                                        event.target.value

                                    )

                                }

                            >

                                <option value="DEMO">

                                    Demo Payment

                                </option>



                                <option value="UPI">

                                    UPI (Demo)

                                </option>



                                <option value="CARD">

                                    Card (Demo)

                                </option>



                                <option value="CASH">

                                    Cash (Demo)

                                </option>

                            </select>



                            <label>

                                Payment Reference

                            </label>



                            <input

                                type="text"

                                placeholder="e.g. DEMO-PAY-001"

                                value={paymentReference}

                                onChange={(event) =>

                                    setPaymentReference(

                                        event.target.value

                                    )

                                }

                                required

                            />



                            <button

                                type="submit"

                                disabled={paymentLoading}

                            >

                                {paymentLoading

                                    ? "Processing..."

                                    : "Confirm Demo Payment"

                                }

                            </button>



                            <button

                                type="button"

                                onClick={() =>

                                    setShowPaymentPopup(false)

                                }

                                disabled={paymentLoading}

                            >

                                Pay Later

                            </button>



                        </form>



                    </div>



                </div>

            )}



            {/* =====================================

                MEETING LINK

            ===================================== */}



            {bookingStatus === "CONFIRMED" && (

                <div className="success-message">



                    <h3>

                        ✅ Session Confirmed

                    </h3>



                    <p>

                        Your payment was successful.

                        Join the session at the scheduled time.

                    </p>



                    {meetingLink ? (

                        <a

                            href={meetingLink}

                            target="_blank"

                            rel="noreferrer"

                        >

                            Join Meeting

                        </a>

                    ) : (

                        <p>

                            Meeting link is being generated.

                        </p>

                    )}



                </div>

            )}



            {/* =====================================

                FEEDBACK FORM

            ===================================== */}



            {bookingStatus === "COMPLETED" &&

                !feedbackSubmitted && (

                    <div className="request-card">



                        <h2>

                            Session Feedback

                        </h2>



                        <p>

                            Your session has ended.

                            Please rate your tutor.

                        </p>



                        <form onSubmit={submitFeedback}>



                            <label>

                                Rating

                            </label>



                            <select

                                value={feedbackRating}

                                onChange={(event) =>

                                    setFeedbackRating(

                                        event.target.value

                                    )

                                }

                            >

                                <option value="5">

                                    5 - Excellent

                                </option>



                                <option value="4">

                                    4 - Very Good

                                </option>



                                <option value="3">

                                    3 - Good

                                </option>



                                <option value="2">

                                    2 - Needs Improvement

                                </option>



                                <option value="1">

                                    1 - Poor

                                </option>

                            </select>



                            <label>

                                Comments

                            </label>



                            <textarea

                                rows="4"

                                placeholder="Share your experience..."

                                value={feedbackComments}

                                onChange={(event) =>

                                    setFeedbackComments(

                                        event.target.value

                                    )

                                }

                            />



                            <button

                                type="submit"

                                disabled={feedbackLoading}

                            >

                                {feedbackLoading

                                    ? "Submitting..."

                                    : "Submit Feedback"

                                }

                            </button>



                        </form>



                    </div>

                )}



            {feedbackSubmitted && (

                <div className="success-message">

                    ✅ Feedback submitted successfully.

                    Thank you!

                </div>

            )}



        </div>

    );

}



export default StudentDashboard;