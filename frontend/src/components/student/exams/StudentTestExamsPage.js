// src/components/student/StudentTestExamsPage.js
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../../../styles/StudentExamsPage.css";

function StudentTestExamsPage({ studentUsername }) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [attemptedExams, setAttemptedExams] = useState({}); // Track which exams have been attempted
  const [refreshKey, setRefreshKey] = useState(0); // Trigger re-render for status updates
  const navigate = useNavigate();


  // 🔄 Re-check attempt status khi user quay lại từ trang khác
  useEffect(() => {
    const handleFocus = async () => {
      // ✅ FIX: userId được lưu với key "app_user" chứ không phải "userId"
      let studentId = localStorage.getItem("app_user");

      // ✅ FIX: Parse studentId nếu là JSON
      if (studentId) {
        if (studentId.startsWith("{")) {
          try {
            const obj = JSON.parse(studentId);
            studentId = obj._id || obj.id || studentId;
          } catch (e) {
            console.warn("⚠️ Failed to parse userId as JSON:", e);
            studentId = studentId.replace(/['"]/g, '');
          }
        }
      }

      if (!studentId || exams.length === 0) return;

      const attemptStatus = {};
      for (let exam of exams) {
        try {
          const res = await fetch(
            `https://khoaluantotnghiep-5ff3.onrender.com/api/test-exams/${exam._id}/check-attempt?studentId=${studentId}`
          );
          const data = await res.json();
          attemptStatus[exam._id] = data.hasAttempted;
        } catch (err) {
          console.warn(`Lỗi kiểm tra trạng thái bài: ${exam._id}`, err);
          attemptStatus[exam._id] = false;
        }
      }
      setAttemptedExams(attemptStatus);
    };

    // Khi focus vào tab → re-check attempt status
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [exams]);

  useEffect(() => {
    const fetchTestExams = async () => {
      if (!studentUsername) {
        setLoading(false);
        return;
      }

      try {
        // 1. Lấy tất cả lớp
        const classesRes = await axios.get("https://khoaluantotnghiep-5ff3.onrender.com/api/classes", {
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
          }
        });
        const allClasses = classesRes.data;

        // 2. Lọc lớp của sinh viên
        const myClasses = allClasses.filter(cls =>
          cls.students?.some(s => s.username === studentUsername)
        );

        // 3. Lấy các bài kiểm tra (test exams) cho từng lớp
        const examPromises = myClasses.map(async (cls) => {
          try {
            const res = await axios.get(
              "https://khoaluantotnghiep-5ff3.onrender.com/api/test-exams/student/published",
              {
                params: { studentClassId: cls._id },
                headers: {
                  "Cache-Control": "no-cache, no-store, must-revalidate",
                  "Pragma": "no-cache",
                  "Expires": "0"
                }
              }
            );
            console.log(`✅ Found ${res.data.length} published exams for student in class ${cls._id}`);
            return res.data.map(exam => ({
              ...exam,
              className: cls.className,
              subjectName: cls.subject?.name
            }));
          } catch (err) {
            console.warn(`Lỗi load đề kiểm tra lớp ${cls.className}:`, err);
            return [];
          }
        });

        const examArrays = await Promise.all(examPromises);
        const allTestExams = examArrays.flat();
        console.log(`📊 Total exams loaded: ${allTestExams.length}`, allTestExams);
        setExams(allTestExams);

        // 🔍 Kiểm tra xem sinh viên đã làm từng bài chưa
        // ✅ FIX: userId được lưu với key "app_user" chứ không phải "userId"
        let rawUserId = localStorage.getItem("app_user");

        let studentId = rawUserId;

        // ✅ FIX: Parse studentId nếu là JSON
        if (studentId) {
          if (studentId.startsWith("{")) {
            try {
              const obj = JSON.parse(studentId);
              studentId = obj._id || obj.id || studentId;
            } catch (e) {
              console.warn("⚠️ Failed to parse userId as JSON:", e);
              studentId = studentId.replace(/['"]/g, '');
            }
          }
        }

        console.log("👤 StudentId for check-attempt:", studentId); // ✅ DEBUG
        console.log("👤 StudentId type:", typeof studentId, "Length:", studentId?.length); // ✅ DEBUG

        const attemptStatus = {};
        for (let exam of allTestExams) {
          try {
            const url = `https://khoaluantotnghiep-5ff3.onrender.com/api/test-exams/${exam._id}/check-attempt?studentId=${studentId}`;
            console.log(`🔍 Request URL: ${url}`); // ✅ DEBUG
            const res = await axios.get(url, {
              headers: {
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "Pragma": "no-cache",
                "Expires": "0"
              }
            });
            console.log(`✅ Check attempt for ${exam.title}: ${res.data.hasAttempted}`); // ✅ DEBUG
            attemptStatus[exam._id] = res.data.hasAttempted;
          } catch (err) {
            console.warn(`❌ Lỗi kiểm tra trạng thái bài ${exam._id}:`, err.message, err.response?.data); // ✅ DEBUG
            attemptStatus[exam._id] = false;
          }
        }
        console.log("📊 Attempt status loaded:", attemptStatus); // ✅ DEBUG
        setAttemptedExams(attemptStatus);
      } catch (err) {
        console.error("Lỗi khi tải danh sách đề kiểm tra:", err);
        setExams([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTestExams();
  }, [studentUsername]);

  // ✅ DEBUG: Log attemptedExams khi thay đổi
  useEffect(() => {
    console.log("🔍 Current attemptedExams state:", attemptedExams);
  }, [attemptedExams]);

  // Refresh exam status every 30 seconds to catch when exams open/close
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  const getExamStatus = (exam) => {
    const now = new Date();
    const open = exam.openTime ? new Date(exam.openTime) : null;
    const close = exam.closeTime ? new Date(exam.closeTime) : null;

    if (!open) return { text: "Chưa đặt lịch", color: "#94a3b8", type: "unset" };
    if (now < open) return { text: "Chưa mở", color: "#f59e0b", type: "not-open" };
    if (close && now > close) return { text: "Đã đóng", color: "#dc2626", type: "closed" };
    return { text: "Đang mở", color: "#16a34a", type: "open" };
  };

  const formatDateTime = (str) => {
    if (!str) return "Chưa đặt";
    const date = new Date(str);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const handleStartExam = (exam) => {
    // ✅ FIX: Nếu đã làm rồi → chuyển sang xem lại (dù còn hay hết thời gian)
    if (attemptedExams[exam._id]) {
      navigate(`/review/${exam._id}`);
      return;
    }

    const status = getExamStatus(exam);
    if (status.type === "open") {
      navigate(`/take-test/${exam._id}`);
    } else if (status.type === "closed") {
      // ✅ NEW: Hết thời gian và chưa làm
      alert("Bài thi đã hết hạn nộp, không thể tiếp tục làm bài!");
    } else {
      alert("Đề này chưa mở hoặc chưa đặt lịch!");
    }
  };

  // ✅ FIX: Hiển thị tất cả bài (không filter lại)
  const displayedExams = exams.sort((a, b) => {
    // Sort: Đang mở → Chưa mở → Đã đóng → Chưa đặt
    const typeOrder = { "open": 0, "not-open": 1, "closed": 2, "unset": 3 };
    const statusA = getExamStatus(a).type;
    const statusB = getExamStatus(b).type;
    return (typeOrder[statusA] || 99) - (typeOrder[statusB] || 99);
  });

  return (
    <div className="student-exams-container">
      <div className="student-exams-header">
        <h2>📝 Bài kiểm tra của tôi</h2>
        <p>Danh sách tất cả đề kiểm tra mà bạn được tham gia.</p>
      </div>

      {loading ? (
        <p className="loading-text">⏳ Đang tải danh sách đề...</p>
      ) : exams.length === 0 ? (
        <div className="empty-state">
          <p>Chưa có bài kiểm tra nào được giao.</p>
          <small>Hãy liên hệ giáo viên để được thêm vào lớp học.</small>
        </div>
      ) : (
        <div className="exam-list" key={refreshKey}>
          {displayedExams.map((exam) => {
            // refreshKey triggers recalculation of exam status every 30 seconds
            const status = getExamStatus(exam);
            const isOpen = status.type === "open";
            // ✅ FIX: Kiểm tra explicitly true, không phải truthy
            const hasAttempted = attemptedExams[exam._id] === true;

            // ✅ DEBUG
            console.log(`📝 Exam: ${exam.title}, hasAttempted: ${hasAttempted}, isOpen: ${isOpen}, status: ${status.type}`);

            // ✅ NEW: Xác định trạng thái button
            let buttonClass = "disabled";
            let buttonText = "Chưa thể làm";
            let isDisabled = true;

            if (hasAttempted) {
              // ✅ Trường hợp 1 & 2: Đã làm rồi → Xem lại (luôn enabled, dù còn hay hết thời gian)
              buttonClass = "active";
              buttonText = "📋 Xem lại";
              isDisabled = false;
            } else if (isOpen) {
              // Chưa làm + bài đang mở → Làm bài
              buttonClass = "active";
              buttonText = "Làm bài";
              isDisabled = false;
            } else if (status.type === "closed") {
              // Chưa làm + hết thời gian → Quá hạn
              buttonClass = "expired";
              buttonText = "❌ Quá hạn";
              isDisabled = true;
            }

            return (
              <div key={exam._id} className="exam-item">
                <div className="exam-left">
                  <div className={`status-tag ${status.type}`}>
                    {status.text}
                  </div>
                  <h3>{exam.title}</h3>
                  <p className="exam-meta">
                    <strong>{exam.subjectName}</strong> • {exam.className}
                  </p>
                  <p className="exam-time">
                    ⏱️ {exam.duration} phút | Mở: {formatDateTime(exam.openTime)} | Đóng: {formatDateTime(exam.closeTime)}
                  </p>
                  {exam.description && (
                    <p className="exam-attempts">
                      Ghi chú: <strong>{exam.description}</strong>
                    </p>
                  )}
                </div>

                <div className="exam-right">
                  <button
                    className={`start-btn ${buttonClass}`}
                    disabled={isDisabled}
                    onClick={() => handleStartExam(exam)}
                  >
                    {buttonText}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default StudentTestExamsPage;