// src/components/ExamPageTC.js - ✅ UI FIXED: Gọn gàng, buttons nhỏ, layout đẹp
import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { fetchCategories } from "../../../api";
import axios from "axios";
import "../../../styles/ExamPageTC.css";
import { useNavigate } from "react-router-dom";

const API_URL = "https://khoaluantotnghiep-5ff3.onrender.com/api"; // Production
// const API_URL = "http://localhost:5000/api"; // Local testing

function ExamPageTC() {
  const [exams, setExams] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingExamId, setEditingExamId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0); // Trigger re-render for status updates
  const navigate = useNavigate();

  // ✅ NEW: AI Exam Modal states
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiSourceExamId, setAISourceExamId] = useState("");
  const [aiExamName, setAIExamName] = useState("");
  const [aiSelectedClass, setAISelectedClass] = useState("");
  const [aiNewCategoryName, setAINewCategoryName] = useState("");
  const [aiDuration, setAIDuration] = useState(60);
  const [aiBufferTime, setAIBufferTime] = useState(5);
  const [aiOpenTime, setAIOpenTime] = useState("");
  const [aiShowResultImmediately, setAIShowResultImmediately] = useState(true);
  const [aiShowCorrectAnswers, setAIShowCorrectAnswers] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);


  // Form tạo/sửa đề
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  
  // ✅ Lớp: allClasses (tất cả) + classes (của môn được chọn)
  const [allClasses, setAllClasses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");

  const [examName, setExamName] = useState("");
  const [duration, setDuration] = useState(60);
  const [bufferTime, setBufferTime] = useState(5);
  const [openTime, setOpenTime] = useState("");
  const [showResultImmediately, setShowResultImmediately] = useState(true);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);
  
  // ✅ NEW: Track xem có những field nào không thể chỉnh sửa
  const [disabledFields, setDisabledFields] = useState({
    examName: false,
    subject: false,
    categories: false,
    class: false,
    duration: false,
    openTime: false
  });

  const currentUser = JSON.parse(localStorage.getItem("app_user") || "{}");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const calculateCloseTime = (open, dur, buffer) => {
    if (!open || !dur) return null;
    const close = new Date(open);
    // Cộng thời lượng + thời gian dự phòng
    close.setMinutes(close.getMinutes() + parseInt(dur) + parseInt(buffer || 5));
    return close;
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "Chưa đặt";
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  // ✅ FIX: Vẫn cho phép edit mọi lúc (chỉ disable field khi xuất/tới giờ)
  const canEdit = (exam) => {
    // Cho phép edit tất cả trừ bài đã hết hạn
    if (exam.closeTime) {
      const now = new Date();
      const closeTime = new Date(exam.closeTime);
      if (now > closeTime) {
        // Bài đã hết hạn
        return false;
      }
    }
    return true;
  };

  // ✅ Có thể xóa? (draft hoặc published + chưa tới giờ)
  const canDelete = (exam) => {
    if (exam.status === 'draft') return true;
    if (exam.openTime) {
      const now = new Date();
      return now < new Date(exam.openTime);
    }
    return false;
  };

  // ✅ NEW: Kiểm tra field nào không thể chỉnh sửa
  const getDisabledFieldsForExam = (exam) => {
    const isPublished = exam.status === 'published';
    const isTimeStarted = exam.openTime && new Date() >= new Date(exam.openTime);
    
    return {
      examName: isPublished || isTimeStarted,
      subject: isPublished || isTimeStarted,
      categories: isPublished || isTimeStarted,
      class: isPublished || isTimeStarted,
      duration: isPublished || isTimeStarted,
      openTime: isPublished || isTimeStarted
    };
  };

  useEffect(() => {
    loadExams();
  }, []);

  // Refresh exam status every 30 seconds to catch when exams open/close
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadAssignedSubjectsAndClasses = async () => {
      if (!currentUser?._id) return;

      try {
        const res = await fetch(`${API_URL}/teaching-assignments/teacher/${currentUser._id}`);
        if (!res.ok) throw new Error("Lỗi lấy phân công");

        const assigns = await res.json();
        
        const uniqueSubjects = [];
        const seenSubjects = new Set();
        assigns.forEach(a => {
          if (a.subject && a.subject._id && !seenSubjects.has(a.subject._id)) {
            seenSubjects.add(a.subject._id);
            uniqueSubjects.push({ _id: a.subject._id, name: a.subject.name });
          }
        });
        setSubjects(uniqueSubjects);

        const allClassesArray = [];
        const seenClasses = new Set();
        assigns.forEach(a => {
          if (a.class && a.class._id && !seenClasses.has(a.class._id)) {
            seenClasses.add(a.class._id);
            allClassesArray.push(a.class);
          }
        });
        setAllClasses(allClassesArray);

      } catch (err) {
        console.error("❌ Lỗi load môn + lớp:", err);
        setSubjects([]);
        setAllClasses([]);
      }
    };

    loadAssignedSubjectsAndClasses();
  }, [currentUser?._id]);

  useEffect(() => {
    const loadCategoriesAndClasses = async () => {
      if (!selectedSubject) {
        setCategories([]);
        setSelectedCategories([]);
        setClasses([]);
        setSelectedClass("");
        return;
      }

      try {
        const catData = await fetchCategories(selectedSubject, currentUser._id);
        const sorted = [...catData].sort((a, b) => {
          const numA = parseInt(a.name.match(/\d+/)?.[0]) || 0;
          const numB = parseInt(b.name.match(/\d+/)?.[0]) || 0;
          return numA - numB;
        });
        setCategories(sorted);
      } catch (err) {
        console.error("❌ Lỗi load categories:", err);
        setCategories([]);
      }

      try {
        const res = await fetch(`${API_URL}/teaching-assignments/teacher/${currentUser._id}`);
        if (!res.ok) throw new Error("Lỗi lấy phân công");

        const assigns = await res.json();
        const matched = assigns
          .filter(a => 
            a.subject && 
            String(a.subject._id) === String(selectedSubject) && 
            a.class && 
            a.class._id
          )
          .map(a => a.class);

        const unique = [];
        const seen = new Set();
        matched.forEach(cls => {
          if (!seen.has(cls._id)) {
            seen.add(cls._id);
            unique.push(cls);
          }
        });

        setClasses(unique);
        setSelectedClass(unique[0]?._id || "");
      } catch (err) {
        console.error("❌ Lỗi load lớp:", err);
        setClasses([]);
      }
    };

    loadCategoriesAndClasses();
  }, [selectedSubject, currentUser?._id]);

const loadExams = async () => {
  if (!currentUser?._id) {
    setExams([]);
    return;
  }

  try {
    const res = await fetch(`${API_URL}/test-exams?teacherId=${currentUser._id}`, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0"
      }
    });
    if (!res.ok) throw new Error("Lỗi tải đề");
    const data = await res.json();
    setExams(data);
  } catch (err) {
    console.error("❌ Lỗi load exams:", err);
    setExams([]);
  }
};

  const resetForm = () => {
    setExamName("");
    setSelectedSubject("");
    setSelectedCategories([]);
    setSelectedClass("");
    setDuration(60);
    setBufferTime(5);
    setOpenTime("");
    setShowResultImmediately(true);
    setShowCorrectAnswers(false);
    setIsEditMode(false);
    setEditingExamId(null);
    // ✅ Reset disabled fields
    setDisabledFields({
      examName: false,
      subject: false,
      categories: false,
      class: false,
      duration: false,
      openTime: false
    });
  };

  const getExamStatus = (exam) => {
    if (exam.status === 'draft') {
      return { status: "Bản nháp", className: "status-draft" };
    }
    const now = new Date();
    const openTimeDate = exam.openTime ? new Date(exam.openTime) : null;
    const closeTimeDate = exam.closeTime ? new Date(exam.closeTime) : null;

    if (!openTimeDate) {
      return { status: "Chưa đặt lịch", className: "status-pending" };
    }
    if (now < openTimeDate) {
      return { status: "Chưa mở", className: "status-upcoming" };
    }
    if (closeTimeDate && now > closeTimeDate) {
      return { status: "Đã đóng", className: "status-closed" };
    }
    return { status: "Đang thi", className: "status-active" };
  };

  const handleSaveExam = async () => {
    if (!examName.trim() || !selectedSubject || selectedCategories.length === 0) {
      Swal.fire("Lỗi!", "Vui lòng điền đầy đủ thông tin", "error");
      return;
    }

    if (!isEditMode && !selectedClass) {
      Swal.fire("Lỗi!", "Vui lòng chọn lớp học", "error");
      return;
    }

    // ✅ Kiểm tra ngày mở đề không được nhỏ hơn ngày hiện tại
    if (openTime) {
      const selectedDateTime = new Date(openTime);
      const now = new Date();
      if (selectedDateTime < now) {
        Swal.fire("Lỗi!", "Thời gian mở đề không được nhỏ hơn thời gian hiện tại", "error");
        return;
      }
    }

    const examData = {
      title: examName,
      subject: selectedSubject,
      categories: selectedCategories,
      class: selectedClass,
      duration,
      bufferTime,
      openTime: openTime || null, // Gửi giá trị datetime-local thô
      showResultImmediately,
      showCorrectAnswers,
      passingScore: 50,
      createdBy: currentUser._id // ✅ THÊM: Gửi ID giáo viên tạo đề
    };

    console.log("📤 Sending exam data to backend:");
    console.log("   openTime value:", openTime);
    console.log("   openTime type:", typeof openTime);
    console.log("   Full examData:", examData);

    setLoading(true);
    try {
      if (isEditMode) {
        await axios.put(`${API_URL}/test-exams/${editingExamId}`, examData);
        Swal.fire("Thành công!", "Đề thi đã được cập nhật", "success");
      } else {
        await axios.post(`${API_URL}/test-exams`, examData);
        Swal.fire("Thành công!", "Đề thi đã được tạo", "success");
      }
      setIsModalOpen(false);
      resetForm();
      loadExams();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      Swal.fire("Lỗi!", err.response?.data?.error || err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePublishExam = async (examId) => {
    const result = await Swal.fire({
      title: "Xuất đề?",
      text: "Bạn có chắc chắn muốn xuất đề này cho sinh viên không?",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#28a745",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Xuất",
      cancelButtonText: "Hủy",
    });

    if (result.isConfirmed) {
      try {
        await axios.patch(`${API_URL}/test-exams/${examId}/publish`);
        loadExams();
        Swal.fire("Thành công!", "Đề thi đã được xuất cho sinh viên.", "success");
      } catch (err) {
        Swal.fire("Lỗi!", err.message, "error");
      }
    }
  };

  // ==================== 🤖 AI EXAM FUNCTIONS ====================

  const openAIModal = async (sourceExam) => {
    setAISourceExamId(sourceExam._id);
    setAIExamName(`${sourceExam.title} - AI Generated`);
    setAINewCategoryName(`AI - ${sourceExam.title}`);
    setAIDuration(sourceExam.duration || 60);
    setAIBufferTime(sourceExam.bufferTime || 5);
    setAIShowResultImmediately(sourceExam.showResultImmediately);
    setAIShowCorrectAnswers(sourceExam.showCorrectAnswers);

    // Lọc lớp chỉ lấy lớp của cùng môn với đề gốc
    try {
      const res = await fetch(`${API_URL}/teaching-assignments/teacher/${currentUser._id}`);
      if (res.ok) {
        const assigns = await res.json();
        const classesOfSameSubject = assigns
          .filter(a =>
            a.subject &&
            String(a.subject._id) === String(sourceExam.subject._id) &&
            a.class &&
            a.class._id
          )
          .map(a => a.class);

        // Remove duplicates
        const uniqueClasses = [];
        const seenIds = new Set();
        classesOfSameSubject.forEach(cls => {
          if (!seenIds.has(cls._id)) {
            seenIds.add(cls._id);
            uniqueClasses.push(cls);
          }
        });

        setClasses(uniqueClasses);
        console.log(`📚 Filtered classes for subject ${sourceExam.subject.name}:`, uniqueClasses.length);
      }
    } catch (err) {
      console.error('Error loading classes for AI modal:', err);
    }

    setIsAIModalOpen(true);
  };

  const resetAIForm = () => {
    setAISourceExamId("");
    setAIExamName("");
    setAISelectedClass("");
    setAINewCategoryName("");
    setAIDuration(60);
    setAIBufferTime(5);
    setAIOpenTime("");
    setAIShowResultImmediately(true);
    setAIShowCorrectAnswers(false);
  };

  const handleGenerateAIExam = async () => {
    if (!aiSourceExamId || !aiExamName || !aiSelectedClass || !aiNewCategoryName) {
      Swal.fire("Lỗi!", "Vui lòng điền đầy đủ thông tin", "error");
      return;
    }

    if (!aiOpenTime) {
      Swal.fire("Lỗi!", "Vui lòng chọn thời gian mở đề", "error");
      return;
    }

    // Lấy thông tin đề mẫu để lấy subject
    const sourceExam = exams.find(e => e._id === aiSourceExamId);
    if (!sourceExam) {
      Swal.fire("Lỗi!", "Không tìm thấy đề thi mẫu", "error");
      return;
    }

    const aiExamData = {
      sourceExamId: aiSourceExamId,
      title: aiExamName,
      class: aiSelectedClass,
      subject: sourceExam.subject._id,
      duration: aiDuration,
      bufferTime: aiBufferTime,
      openTime: aiOpenTime,
      // passingScore và description sẽ được lấy từ đề mẫu ở backend
      createdBy: currentUser._id,
      newCategoryName: aiNewCategoryName,
      showResultImmediately: aiShowResultImmediately,
      showCorrectAnswers: aiShowCorrectAnswers,
    };

    console.log('📤 Sending AI exam data:', aiExamData);

    setIsGeneratingAI(true);
    try {
      Swal.fire({
        title: "Đang tạo đề AI...",
        html: "Vui lòng đợi, Claude AI đang tạo câu hỏi mới cho bạn.<br>Quá trình này có thể mất vài phút.",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const response = await axios.post(`${API_URL}/test-exams/generate-ai-exam`, aiExamData);

      await loadExams();
      setIsAIModalOpen(false);
      resetAIForm();

      const skippedImages = response.data.sourceQuestionsWithImages || 0;
      const imageWarning = skippedImages > 0
        ? `<p style="color: #f39c12; font-size: 14px;">⚠️ Đã bỏ qua ${skippedImages} câu hỏi có ảnh từ đề mẫu</p>`
        : '';

      Swal.fire({
        icon: "success",
        title: "Tạo đề AI thành công!",
        html: `
          <p><strong>Đề thi:</strong> ${response.data.exam.title}</p>
          <p><strong>Số câu hỏi AI:</strong> ${response.data.questionsGenerated}</p>
          <p><strong>Danh mục mới:</strong> ${response.data.newCategory.name}</p>
          ${imageWarning}
        `,
        confirmButtonText: "Xem chi tiết",
      }).then((result) => {
        if (result.isConfirmed) {
          navigate(`/test-exam-detail/${response.data.exam._id}`);
        }
      });
    } catch (err) {
      console.error("Error generating AI exam:", err);
      console.error("Error response:", err.response?.data);
      console.error("Error status:", err.response?.status);
      Swal.fire({
        icon: "error",
        title: "Lỗi tạo đề AI",
        html: `
          <p>${err.response?.data?.error || err.response?.data?.message || err.message}</p>
          <small style="color: #666; font-size: 12px;">
            ${err.response?.data?.details ? JSON.stringify(err.response.data.details) : ''}
          </small>
        `,
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleDeleteExam = async (examId) => {
    const exam = exams.find(e => e._id === examId);
    if (!canDelete(exam)) {
      Swal.fire("Lỗi!", "Không thể xóa đề thi này", "error");
      return;
    }

    const result = await Swal.fire({
      title: "Xóa đề thi?",
      text: "Bạn có chắc chắn muốn xóa đề thi này không?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Xóa",
      cancelButtonText: "Hủy",
    });

    if (result.isConfirmed) {
      try {
        await axios.delete(`${API_URL}/test-exams/${examId}`);
        loadExams();
        Swal.fire("Đã xóa!", "Đề thi đã được xóa.", "success");
      } catch (err) {
        Swal.fire("Lỗi!", err.message, "error");
      }
    }
  };

  const handleEditExam = async (exam) => {
    // ✅ FIX: Kiểm tra canEdit - nếu false thì không vào modal
    if (!canEdit(exam)) {
      Swal.fire("Lỗi!", "Không thể chỉnh sửa đề thi này (bài đã hết hạn)", "error");
      return;
    }

    const getLocalDateTime = (dateString) => {
      if (!dateString) return "";
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    try {
      // Fetch chi tiết exam để đảm bảo dữ liệu đúng (giống như PracticeExamPage)
      const res = await fetch(`${API_URL}/test-exams/${exam._id}`, {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        }
      });
      if (!res.ok) throw new Error("Không thể tải đề");
      const data = await res.json();

      console.log("📋 Exam data from server:", data);
      console.log("⏰ openTime from server:", data.openTime);
      console.log("📝 getLocalDateTime result:", getLocalDateTime(data.openTime));

      setExamName(data.title);
      setSelectedSubject(data.subject._id);
      setSelectedCategories(data.categories.map(c => c._id));
      setSelectedClass(data.class?._id || "");
      setDuration(data.duration);
      setBufferTime(data.bufferTime || 5);
      setOpenTime(getLocalDateTime(data.openTime));
      setShowResultImmediately(data.showResultImmediately);
      setShowCorrectAnswers(data.showCorrectAnswers);

      // ✅ Set disabled fields dựa trên exam status
      setDisabledFields(getDisabledFieldsForExam(data));

      setIsEditMode(true);
      setEditingExamId(data._id);
      setIsModalOpen(true);
    } catch (error) {
      Swal.fire("Lỗi", "Không thể chỉnh sửa đề thi này", "error");
    }
  };

  const getClassName = (classId) => {
    const cls = allClasses.find(c => c._id === classId);
    return cls?.className || "Không xác định";
  };

  return (
    <div className="exam-page">
      <div className="header">
        <h3 className="title">Danh sách đề kiểm tra</h3>
        <button className="action-btn" onClick={() => { setIsModalOpen(true); resetForm(); }}>
          + Tạo đề kiểm tra
        </button>
      </div>

      <div className="exam-list" key={refreshKey}>
        {exams.length > 0 ? (
          exams.map(exam => {
            // refreshKey triggers recalculation of exam status every 30 seconds
            const { status, className } = getExamStatus(exam);
            const isEditable = canEdit(exam);
            const isDeletable = canDelete(exam);
            const isDraft = exam.status === 'draft';
            return (
              <div key={exam._id} className="exam-card">
                <div className="exam-header">
                  <div className="exam-title-row">
                    <h4 className="exam-title">{exam.title}</h4>
                    {/* ✅ Icon xuất đề cạnh bản nháp */}
                    {isDraft && (
                      <button 
                        onClick={() => handlePublishExam(exam._id)}
                        className="btn-publish-icon"
                        title="Xuất đề cho sinh viên"
                      >
                        📤
                      </button>
                    )}
                  </div>
                  <span className={`status-badge ${className}`}>{status}</span>
                </div>

                <div className="exam-info">
                  <span className="info-text">📚 Môn: {exam.subject?.name}</span>
                  <span className="info-text">🏫 Lớp: {getClassName(exam.class?._id)}</span>
                  <span className="info-text">⏱️ Thời lượng: {exam.duration} phút (+ {exam.bufferTime || 5} phút dự phòng)</span>
                  {/* ✅ Thời gian mở/đóng nằm dưới */}
                  {exam.openTime && (
                    <div className="exam-time-info">
                      <span className="time-item">🕐 Mở: {formatDateTime(exam.openTime)}</span>
                      <span className="time-item">🔒 Đóng: {formatDateTime(exam.closeTime)}</span>
                    </div>
                  )}
                  {!isEditable && exam.openTime && (
                    <p style={{ fontSize: "0.85em", color: "#dc3545", marginTop: "5px", fontWeight: "bold" }}>
                      ⛔ Đã khóa - Không thể chỉnh sửa
                    </p>
                  )}
                </div>

                {/* ✅ Actions: Compact buttons */}
                <div className="exam-actions">
                  {isDraft && (
                    <button
                      onClick={() => navigate(`/test-exam-detail/${exam._id}`)}
                      className="btn-small btn-blue"
                      title="Thêm câu hỏi"
                    >
                      ➕
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/test-exam-detail/${exam._id}`)}
                    className="btn-small btn-blue"
                    title="Chi tiết"
                  >
                    📋
                  </button>
                  {/* ✅ NEW: Tạo đề AI từ đề này */}
                  <button
                    onClick={() => openAIModal(exam)}
                    className="btn-small btn-purple"
                    title="Tạo đề AI dựa trên đề này"
                  >
                    🤖
                  </button>
                  {/* ✅ Sửa: Button nhỏ */}
                  <button
                    onClick={() => handleEditExam(exam)}
                    className="btn-small btn-green"
                    disabled={!isEditable}
                    title={isEditable ? "Sửa thông tin" : "Bài đã hết hạn - Không thể sửa"}
                  >
                    ✏️
                  </button>
                  {/* ✅ Xóa: Button nhỏ */}
                  <button
                    onClick={() => handleDeleteExam(exam._id)}
                    className="btn-small btn-red"
                    disabled={!isDeletable}
                    title={isDeletable ? "Xóa" : "Không thể xóa"}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <p className="no-exams-message">
            Chưa có đề thi nào. Tạo đề thi mới bằng nút "Tạo đề kiểm tra"
          </p>
        )}
      </div>

      {/* Modal tạo/sửa đề thi */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{isEditMode ? "✏️ Sửa đề thi" : "➕ Tạo đề kiểm tra"}</h3>
              <button
                className="modal-close-btn"
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              {error && <div className="error-message">❌ {error}</div>}

              {/* ✅ NEW: Hiển thị thông báo nếu có field không thể chỉnh sửa */}
              {isEditMode && Object.values(disabledFields).some(v => v) && (
                <div style={{
                  backgroundColor: "#fff3cd",
                  border: "1px solid #ffc107",
                  borderRadius: "4px",
                  padding: "12px",
                  marginBottom: "20px",
                  color: "#856404",
                  fontSize: "14px"
                }}>
                  ⚠️ <strong>Lưu ý:</strong> Một số trường không thể chỉnh sửa vì đề thi đã được xuất hoặc tới thời gian làm bài.
                </div>
              )}

              <div className="form-section">
                <h4 className="section-title">📄 Thông tin đề thi</h4>
                
                <div className="form-group">
                  <label>Tên đề thi *</label>
                  <input
                    type="text"
                    value={examName}
                    onChange={(e) => setExamName(e.target.value)}
                    placeholder="Nhập tên đề kiểm tra"
                    className="form-input"
                    disabled={disabledFields.examName}
                    style={{
                      backgroundColor: disabledFields.examName ? "#e9ecef" : "#fff",
                      cursor: disabledFields.examName ? "not-allowed" : "text",
                      opacity: disabledFields.examName ? 0.7 : 1
                    }}
                  />
                </div>

                <div className="form-group">
                  <label>Môn học *</label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="form-input"
                    disabled={disabledFields.subject}
                    style={{
                      backgroundColor: disabledFields.subject ? "#e9ecef" : "#fff",
                      cursor: disabledFields.subject ? "not-allowed" : "pointer",
                      opacity: disabledFields.subject ? 0.7 : 1
                    }}
                  >
                    <option value="">-- Chọn môn học --</option>
                    {subjects.map(subject => (
                      <option key={subject._id} value={subject._id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>

                {!isEditMode && (
                  <div className="form-group">
                    <label>Lớp học *</label>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="form-input"
                    >
                      <option value="">-- Chọn lớp học --</option>
                      {classes.length > 0 ? (
                        classes.map(cls => (
                          <option key={cls._id} value={cls._id}>
                            {cls.className}
                          </option>
                        ))
                      ) : (
                        <option disabled>
                          {selectedSubject 
                            ? "❌ Không có lớp nào cho môn này"
                            : "⏳ Vui lòng chọn môn học trước"}
                        </option>
                      )}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label>Danh mục câu hỏi *</label>
                  <div className="checkbox-list">
                    {categories.length > 0 ? (
                      categories.map(category => (
                        <label key={category._id} className="checkbox-item">
                          <input
                            type="checkbox"
                            value={category._id}
                            checked={selectedCategories.includes(category._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCategories([...selectedCategories, category._id]);
                              } else {
                                setSelectedCategories(selectedCategories.filter(id => id !== category._id));
                              }
                            }}
                            disabled={disabledFields.categories}
                          />
                          <span style={{
                            opacity: disabledFields.categories ? 0.7 : 1
                          }}>{category.name}</span>
                        </label>
                      ))
                    ) : (
                      <p className="helper-text">
                        {selectedSubject 
                          ? "❌ Môn học này không có danh mục câu hỏi"
                          : "⏳ Vui lòng chọn môn học trước"}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h4 className="section-title">⏱️ Thời gian thi</h4>
                
                <div className="form-group">
                  <label>Thời lượng (phút)</label>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value))}
                    min="1"
                    className="form-input"
                    disabled={disabledFields.duration}
                    style={{
                      backgroundColor: disabledFields.duration ? "#e9ecef" : "#fff",
                      cursor: disabledFields.duration ? "not-allowed" : "text",
                      opacity: disabledFields.duration ? 0.7 : 1
                    }}
                  />
                </div>

                <div className="form-group">
                  <label>Thời gian dự phòng (phút)</label>
                  <input
                    type="number"
                    value={bufferTime}
                    onChange={(e) => setBufferTime(parseInt(e.target.value))}
                    min="0"
                    className="form-input"
                    disabled={disabledFields.duration}
                    style={{
                      backgroundColor: disabledFields.duration ? "#e9ecef" : "#fff",
                      cursor: disabledFields.duration ? "not-allowed" : "text",
                      opacity: disabledFields.duration ? 0.7 : 1
                    }}
                  />
                  <small style={{ color: "#666", marginTop: "5px", display: "block" }}>
                    💡 Thời gian bổ sung cho sinh viên chuẩn bị (sẽ cộng vào thời lượng thi)
                  </small>
                </div>

                <div className="form-group">
                  <label>Thời gian mở đề</label>
                  <input
                    type="datetime-local"
                    value={openTime}
                    onChange={(e) => setOpenTime(e.target.value)}
                    className="form-input"
                    disabled={disabledFields.openTime}
                    style={{
                      backgroundColor: disabledFields.openTime ? "#e9ecef" : "#fff",
                      cursor: disabledFields.openTime ? "not-allowed" : "text",
                      opacity: disabledFields.openTime ? 0.7 : 1
                    }}
                  />
                </div>

                {openTime && (
                  <div className="form-group">
                    <label>Thời gian đóng đề (tự động tính)</label>
                    <div className="form-input" style={{
                      background: "#e3f2fd",
                      color: "#1565c0",
                      padding: "10px",
                      borderRadius: "4px",
                      border: "1px solid #90caf9",
                      cursor: "default"
                    }}>
                      {formatDateTime(calculateCloseTime(openTime, duration, bufferTime))}
                    </div>
                  </div>
                )}

                <p className="helper-text">
                  ℹ️ Thời gian đóng = Thời gian mở + Thời lượng + Thời gian dự phòng
                </p>
              </div>

              <div className="form-section">
                <h4 className="section-title">⚙️ Cài đặt nâng cao</h4>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={showResultImmediately}
                      onChange={(e) => setShowResultImmediately(e.target.checked)}
                    />
                    <span>Hiển thị kết quả ngay sau khi nộp bài</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={showCorrectAnswers}
                      onChange={(e) => setShowCorrectAnswers(e.target.checked)}
                    />
                    <span>Hiển thị đáp án đúng cho sinh viên</span>
                  </label>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={true}
                      disabled
                    />
                    <span>Xáo trộn thứ tự câu hỏi - Mặc định</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={true}
                      disabled
                    />
                    <span>Xáo trộn thứ tự đáp án - Mặc định</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={true}
                      disabled
                    />
                    <span>Số lần làm: 1 - Mặc định</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={handleSaveExam} className="btn-primary">
                {isEditMode ? "💾 Cập nhật" : "➕ Tạo đề kiểm tra"}
              </button>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  resetForm();
                }}
                className="btn-secondary"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 🤖 MODAL TẠO ĐỀ AI ==================== */}
      {isAIModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>🤖 Tạo đề thi AI</h3>
              <button
                className="modal-close-btn"
                onClick={() => {
                  setIsAIModalOpen(false);
                  resetAIForm();
                }}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="ai-info-banner">
                <p>
                  <strong>🎯 Chức năng:</strong> Tạo đề thi mới với câu hỏi hoàn toàn mới được sinh bởi Claude AI,
                  dựa trên độ khó và phong cách của đề thi mẫu.
                </p>
                <p>
                  <strong>⚡ Lưu ý:</strong> Câu hỏi AI sẽ được lưu vào danh mục mới riêng biệt.
                  Quá trình tạo có thể mất 1-2 phút.
                </p>
                <p>
                  <strong>📸 Về câu hỏi có ảnh:</strong> AI chỉ tạo câu hỏi từ các câu hỏi text trong đề mẫu.
                  Câu hỏi có ảnh sẽ được bỏ qua.
                </p>
              </div>

              {/* Tên đề thi mới */}
              <div className="form-group">
                <label>
                  Tên đề thi mới <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={aiExamName}
                  onChange={(e) => setAIExamName(e.target.value)}
                  placeholder="VD: Đề thi Toán - Lớp A2"
                />
              </div>

              {/* Tên danh mục mới */}
              <div className="form-group">
                <label>
                  Tên danh mục cho câu hỏi AI <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={aiNewCategoryName}
                  onChange={(e) => setAINewCategoryName(e.target.value)}
                  placeholder="VD: AI - Đề thi Toán Lớp A2"
                />
                <small className="help-text">
                  Các câu hỏi AI sẽ được lưu vào danh mục này
                </small>
              </div>

              {/* Chọn lớp - chỉ lớp cùng môn */}
              <div className="form-group">
                <label>
                  Chọn lớp <span className="required">*</span>
                </label>
                <select
                  value={aiSelectedClass}
                  onChange={(e) => setAISelectedClass(e.target.value)}
                >
                  <option value="">-- Chọn lớp --</option>
                  {classes.map((cls) => (
                    <option key={cls._id} value={cls._id}>
                      {cls.className}
                    </option>
                  ))}
                </select>
                <small className="help-text">
                  Chỉ hiển thị các lớp cùng môn với đề gốc
                </small>
              </div>

              {/* Thời gian và cấu hình */}
              <div className="form-row">
                <div className="form-group">
                  <label>Thời lượng (phút)</label>
                  <input
                    type="number"
                    value={aiDuration}
                    onChange={(e) => setAIDuration(parseInt(e.target.value))}
                    min="1"
                  />
                </div>
                <div className="form-group">
                  <label>Thời gian dự phòng (phút)</label>
                  <input
                    type="number"
                    value={aiBufferTime}
                    onChange={(e) => setAIBufferTime(parseInt(e.target.value))}
                    min="0"
                  />
                </div>
              </div>

              {/* Thời gian mở đề */}
              <div className="form-group">
                <label>
                  Thời gian mở đề <span className="required">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={aiOpenTime}
                  onChange={(e) => setAIOpenTime(e.target.value)}
                />
              </div>

              {/* Tùy chọn hiển thị kết quả */}
              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={aiShowResultImmediately}
                    onChange={(e) => setAIShowResultImmediately(e.target.checked)}
                  />
                  Hiển thị kết quả ngay sau khi nộp
                </label>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={aiShowCorrectAnswers}
                    onChange={(e) => setAIShowCorrectAnswers(e.target.checked)}
                  />
                  Hiển thị đáp án đúng
                </label>
              </div>
            </div>

            <div className="modal-footer">
              <button
                onClick={handleGenerateAIExam}
                className="btn-primary"
                disabled={isGeneratingAI}
              >
                {isGeneratingAI ? "⏳ Đang tạo..." : "🤖 Tạo đề AI"}
              </button>
              <button
                onClick={() => {
                  setIsAIModalOpen(false);
                  resetAIForm();
                }}
                className="btn-secondary"
                disabled={isGeneratingAI}
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExamPageTC;