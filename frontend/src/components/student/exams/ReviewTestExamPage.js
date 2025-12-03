import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import "../../../styles/TakeExamPage.css";

function ReviewTestExamPage() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [result, setResult] = useState(null);

  const QUESTIONS_PER_PAGE = 3;

  const getStudentId = () => {
    // ✅ FIX: Check "app_user" first (new storage location)
    let id = localStorage.getItem("app_user");

    if (id) {
      if (id.startsWith("{")) {
        try {
          const obj = JSON.parse(id);
          id = obj._id || obj.id;
          return id;
        } catch (e) {
          console.error("Error parsing app_user:", e);
        }
      }
      return id;
    }

    // Fallback: Check "userId" (legacy storage location)
    id = localStorage.getItem("userId");

    if (id) {
      if (id.startsWith("{")) {
        try {
          const obj = JSON.parse(id);
          id = obj._id;
          return id;
        } catch (e) {
          console.error("Error parsing localStorage userId:", e);
        }
      }
      return id;
    }

    id = sessionStorage.getItem("userId");
    if (id) {
      if (id.startsWith("{")) {
        try {
          const obj = JSON.parse(id);
          id = obj._id;
          return id;
        } catch (e) {
          console.error("Error parsing sessionStorage userId:", e);
        }
      }
      return id;
    }

    const params = new URLSearchParams(window.location.search);
    id = params.get("studentId");
    if (id) {
      return id;
    }

    const keys = Object.keys(localStorage);
    const userKey = keys.find(key => 
      key.toLowerCase().includes("user") || 
      key.toLowerCase().includes("id")
    );

    if (userKey) {
      let value = localStorage.getItem(userKey);
      if (value && value.startsWith("{")) {
        try {
          const obj = JSON.parse(value);
          value = obj._id;
        } catch (e) {
          console.error("Error parsing userKey:", e);
        }
      }
      return value;
    }

    console.error("❌ userId not found! Full localStorage:", localStorage);
    return null;
  };

  useEffect(() => {
    fetchExamAndResult();
  }, [examId]);

  const fetchExamAndResult = async () => {
    try {
      const id = getStudentId();

      if (!id) {
        throw new Error(
          "Không tìm thấy thông tin sinh viên.\n\n" +
          "Vui lòng đăng nhập lại hoặc làm bài kiểm tra từ danh sách bài thi."
        );
      }

      console.log("🔍 Fetching exam and result for student:", id);

      // ✅ FIX: Lấy thông tin đề thi (lấy tất cả câu, không shuffle - sẽ sắp xếp dựa trên questionOrder đã lưu)
      // Thay vì gọi /take (có shuffle), gọi /:id (lấy tất cả câu)
      const examRes = await fetch(`https://khoaluantotnghiep-5ff3.onrender.com/api/test-exams/${examId}`);
      if (!examRes.ok) {
        throw new Error("Không thể tải đề thi");
      }
      const examData = await examRes.json();
      console.log("📝 Exam data (tất cả câu):", examData);

      // Lấy kết quả làm bài
      const resultRes = await fetch(
        `https://khoaluantotnghiep-5ff3.onrender.com/api/test-exams/${examId}/my-result?studentId=${id}`
      );
      if (!resultRes.ok) {
        throw new Error("Không thể tải kết quả");
      }
      const resultData = await resultRes.json();

      if (resultData.hasAttempted) {
        console.log("✅ Result found:", resultData);

        // ✅ NEW: Sắp xếp lại câu hỏi theo questionOrder đã lưu (để hiển thị giống lúc làm)
        const questionOrderIds = resultData.questionOrder || [];
        const optionOrderMap = resultData.optionOrder || {};
        console.log("📋 Question order saved:", questionOrderIds);
        console.log("📋 Option order saved:", optionOrderMap);

        let reorderedQuestions = [];
        if (questionOrderIds.length > 0) {
          // Sắp xếp theo questionOrder đã lưu
          const questionMap = {};
          examData.questions.forEach((q) => {
            if (q && q.questionId) {
              questionMap[q.questionId._id] = q;
            }
          });

          reorderedQuestions = questionOrderIds
            .map((qId) => {
              const q = questionMap[qId];
              if (!q || !q.questionId) return null;

              // ✅ NEW: Store optionOrder để dùng khi hiển thị
              // KHÔNG modify options - giữ nguyên original
              // userAnswer và correctAnswer đều là original index, không cần convert
              q.questionId._optionOrder = optionOrderMap[qId] || null;

              return q;
            })
            .filter(Boolean); // Bỏ qua null

          console.log("✅ Reordered questions to match exam order");
        } else {
          // Fallback: dùng thứ tự gốc
          reorderedQuestions = examData.questions.filter((q) => q && q.questionId);
        }

        // ✅ FIX: Dùng original answers trực tiếp (không cần convert vì lưu original từ đầu)
        const userAnswersObj = {};
        if (resultData.answers) {
          Object.entries(resultData.answers).forEach(([qId, answer]) => {
            userAnswersObj[qId] = answer; // original index
          });
        }

        console.log("📤 Original answers:", userAnswersObj);

        // ✅ FIX: Tính số câu đúng dựa trên original answers + original correctAnswer
        let correctCount = 0;
        if (reorderedQuestions && reorderedQuestions.length > 0) {
          reorderedQuestions.forEach((q) => {
            if (!q || !q.questionId) return;

            const question = q.questionId;
            const userAnswer = userAnswersObj[question._id];
            const correctAnswer = question.correctAnswer; // original correctAnswer (lưu trong DB)

            // Convert to number for reliable comparison
            const userAnswerNum = userAnswer !== undefined && userAnswer !== null ? Number(userAnswer) : null;
            const correctAnswerNum = Number(correctAnswer);

            if (userAnswerNum === correctAnswerNum && userAnswerNum !== null) {
              correctCount++;
            }
          });
        }

        console.log("📊 Calculated correctCount:", correctCount);

        // Cập nhật examData để hiển thị theo thứ tự đã lưu
        examData.questions = reorderedQuestions;
        setExam(examData);

        resultData.correctCount = correctCount;
        setResult(resultData);
        setUserAnswers(userAnswersObj); // ✅ Dùng original answers
      } else {
        throw new Error("Không tìm thấy kết quả làm bài của bạn");
      }

      setLoading(false);
    } catch (err) {
      console.error("Error fetching exam and result:", err);
      Swal.fire({
        icon: "error",
        title: "Lỗi",
        text: err.message || "Đã xảy ra lỗi khi tải dữ liệu",
        confirmButtonText: "Quay lại",
        allowOutsideClick: false,
      }).then(() => {
        navigate("/myTest");
      });
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString("vi-VN");
  };

  const getAnswerStatus = (question) => {
    const userAnswer = userAnswers[question._id];
    // ✅ FIX: Dùng original correctAnswer (userAnswer cũng là original index)
    const correctAnswer = question.correctAnswer;

    if (userAnswer === undefined) {
      return { status: "notAnswered", label: "❌ Không trả lời" };
    }

    // Convert to number for reliable comparison
    const userAnswerNum = Number(userAnswer);
    const correctAnswerNum = Number(correctAnswer);

    if (userAnswerNum === correctAnswerNum) {
      return { status: "correct", label: "✅ Đúng" };
    }

    return { status: "wrong", label: "❌ Sai" };
  };

  const handleNextPage = () => {
    if ((currentPage + 1) * QUESTIONS_PER_PAGE < exam.questions.length) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  if (loading) return <p>Đang tải dữ liệu...</p>;
  if (!exam) return <p>Không tìm thấy đề thi!</p>;

  const canViewScore = exam.showResultImmediately;
  const canViewAnswer = exam.showCorrectAnswers;

  console.log("🔍 Exam settings:", {
    showResultImmediately: exam.showResultImmediately,
    showCorrectAnswers: exam.showCorrectAnswers,
    canViewScore,
    canViewAnswer
  });

  const currentQuestions = exam.questions.slice(
    currentPage * QUESTIONS_PER_PAGE,
    (currentPage + 1) * QUESTIONS_PER_PAGE
  );

  return (
    <div className="exam-container">
      {/* MAIN CONTENT */}
      <div className="main-content" style={{ width: "100%" }}>
        <div className="header">
          <div onClick={() => navigate("/myTest")} style={{ cursor: "pointer", color: "blue" }}>
            ← Quay lại danh sách
          </div>
          <h2>📋 Xem lại: {exam.title}</h2>
          <div style={{ color: "#666" }}>Chế độ xem lại</div>
        </div>

        {/* THÔNG TIN KẾT QUẢ */}
        {result && canViewScore && (
          <div
            style={{
              backgroundColor: "#f8f9fa",
              padding: "20px",
              borderRadius: "8px",
              marginBottom: "20px",
              border: "1px solid #dee2e6"
            }}
          >
            <h4>📊 Kết quả của bạn:</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px", marginTop: "10px" }}>
              <div>
                <p style={{ color: "#666", fontSize: "14px" }}>Số câu đúng</p>
                <p style={{ fontSize: "24px", fontWeight: "bold", color: "#28a745" }}>
                  {result.correctCount || 0}/{exam.questions.length}
                </p>
              </div>
              <div>
                <p style={{ color: "#666", fontSize: "14px" }}>Điểm (Hệ 10)</p>
                <p style={{ fontSize: "24px", fontWeight: "bold", color: "#007bff" }}>
                  {result.scoreOut10 || (result.score / result.totalPoints * 10).toFixed(2)}/10
                </p>
              </div>
              <div>
                <p style={{ color: "#666", fontSize: "14px" }}>Ngày làm</p>
                <p style={{ fontSize: "14px", fontWeight: "bold" }}>
                  {formatDate(result.submittedAt)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* DANH SÁCH CÂU HỎI - Chỉ hiển thị nếu canViewAnswer = true */}
        {canViewAnswer ? (
          <>
            {currentQuestions
              .filter((q, idx) => q && q.questionId) // ✅ FIX: Lọc bỏ các câu hỏi null
              .map((currentQuestion, index) => {
                const question = currentQuestion.questionId;
                // ✅ Tìm globalIndex từ original position (trước khi filter)
                const globalIndex = exam.questions.findIndex(q => q && q.questionId && q._id === currentQuestion._id);
                const userAnswer = userAnswers[question._id];
                const answerStatus = getAnswerStatus(question);

              return (
                <div
                  key={question._id}
                  style={{
                    backgroundColor: "#fff",
                    padding: "20px",
                    marginBottom: "20px",
                    borderRadius: "8px",
                    border: `2px solid ${
                      answerStatus.status === "correct"
                        ? "#28a745"
                        : answerStatus.status === "wrong"
                        ? "#dc3545"
                        : "#dee2e6"
                    }`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "15px"
                    }}
                  >
                    <h3 style={{ margin: 0 }}>
                      {globalIndex + 1}. {question.title && question.title.includes('<') ? (
                        <span dangerouslySetInnerHTML={{ __html: question.title }} style={{ display: 'inline' }} />
                      ) : (
                        question.title
                      )}
                    </h3>
                    <span style={{
                      padding: "5px 10px",
                      borderRadius: "4px",
                      backgroundColor:
                        answerStatus.status === "correct"
                          ? "#d4edda"
                          : answerStatus.status === "wrong"
                          ? "#f8d7da"
                          : "#e2e3e5",
                      color:
                        answerStatus.status === "correct"
                          ? "#155724"
                          : answerStatus.status === "wrong"
                          ? "#721c24"
                          : "#383d41",
                      fontSize: "14px",
                      fontWeight: "bold"
                    }}>
                      {answerStatus.label}
                    </span>
                  </div>

                  {question.imageUrl && (
                    <div style={{ marginBottom: "15px" }}>
                      <img
                        src={`https://khoaluantotnghiep-5ff3.onrender.com${question.imageUrl}`}
                        alt="question"
                        style={{ maxWidth: "100%", height: "auto", borderRadius: "4px" }}
                      />
                    </div>
                  )}

                  {/* CÂU HỎI VÀ ĐÁP ÁN */}
                  <div style={{ marginTop: "15px" }}>
                    {/* ✅ NEW: Hiển thị options theo thứ tự shuffle (áp dụng optionOrder) */}
                    {(() => {
                      const optionOrder = question._optionOrder;
                      let displayOptions = [];

                      if (optionOrder) {
                        // optionOrder: { shuffled_idx: original_idx }
                        // Sắp xếp options theo thứ tự shuffle
                        const sortedKeys = Object.keys(optionOrder)
                          .map(Number)
                          .sort((a, b) => a - b);

                        displayOptions = sortedKeys.map(shuffledIdx => {
                          const originalIdx = Number(optionOrder[shuffledIdx]);
                          return {
                            displayIndex: shuffledIdx,
                            originalIndex: originalIdx,
                            text: question.options[originalIdx]
                          };
                        });
                      } else {
                        // Không có shuffle, hiển thị bình thường
                        displayOptions = question.options.map((text, idx) => ({
                          displayIndex: idx,
                          originalIndex: idx,
                          text: text
                        }));
                      }

                      return displayOptions.map((opt) => {
                        const userAnswerNum = userAnswer !== undefined && userAnswer !== null ? Number(userAnswer) : null;
                        const isUserAnswer = userAnswerNum === opt.originalIndex;

                        const correctAnswerNum = Number(question.correctAnswer);
                        const isCorrectAnswer = correctAnswerNum === opt.originalIndex;

                        let optionStyle = {
                          padding: "12px 15px",
                          marginBottom: "10px",
                          borderRadius: "4px",
                          border: "1px solid #dee2e6",
                          backgroundColor: "#fff",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          fontSize: "16px"
                        };

                        if (isCorrectAnswer) {
                          optionStyle.backgroundColor = "#d4edda";
                          optionStyle.border = "2px solid #28a745";
                        }

                        if (isUserAnswer && userAnswer !== undefined) {
                          if (isCorrectAnswer) {
                            optionStyle.backgroundColor = "#d4edda";
                            optionStyle.border = "2px solid #28a745";
                          } else {
                            optionStyle.backgroundColor = "#f8d7da";
                            optionStyle.border = "2px solid #dc3545";
                          }
                        }

                        return (
                          <div key={opt.originalIndex} style={optionStyle}>
                            <span style={{ marginRight: "10px", fontWeight: "bold" }}>
                              {String.fromCharCode(65 + opt.displayIndex)}.
                            </span>
                            <span>
                              {opt.text && opt.text.includes('<') ? (
                                <span dangerouslySetInnerHTML={{ __html: opt.text }} />
                              ) : (
                                opt.text
                              )}
                            </span>

                            {isCorrectAnswer && (
                              <span style={{ marginLeft: "auto" }}>✅ Đáp án đúng</span>
                            )}
                            {isUserAnswer && userAnswer !== undefined && (
                              <span style={{ marginLeft: "auto" }}>
                                {isCorrectAnswer ? "✅ Trả lời đúng" : "❌ Trả lời của bạn"}
                              </span>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {userAnswer === undefined && (
                    <div style={{
                      marginTop: "15px",
                      padding: "10px",
                      backgroundColor: "#e7f3ff",
                      borderRadius: "4px",
                      color: "#0066cc"
                    }}>
                      {/* ✅ FIX: Use shuffled correctAnswer */}
                      <strong>💡 Đáp án đúng:</strong> {String.fromCharCode(65 + Number(question.correctAnswer))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* NÚT ĐIỀU HƯỚNG - Chỉ hiển thị khi xem câu hỏi */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "10px",
                marginTop: "20px"
              }}
            >
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 0}
                style={{
                  padding: "10px 20px",
                  backgroundColor: currentPage === 0 ? "#ccc" : "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: currentPage === 0 ? "not-allowed" : "pointer",
                  fontSize: "16px"
                }}
              >
                ← Trang trước
              </button>

              <div style={{ color: "#666", display: "flex", alignItems: "center" }}>
                Trang {currentPage + 1} / {Math.ceil(exam.questions.length / QUESTIONS_PER_PAGE)}
              </div>

              <button
                onClick={handleNextPage}
                disabled={(currentPage + 1) * QUESTIONS_PER_PAGE >= exam.questions.length}
                style={{
                  padding: "10px 20px",
                  backgroundColor: (currentPage + 1) * QUESTIONS_PER_PAGE >= exam.questions.length ? "#ccc" : "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: (currentPage + 1) * QUESTIONS_PER_PAGE >= exam.questions.length ? "not-allowed" : "pointer",
                  fontSize: "16px"
                }}
              >
                Trang kế →
              </button>
            </div>
          </>
        ) : (
          // Nếu không được xem câu hỏi, chỉ hiển thị thông báo
          <div
            style={{
              marginTop: "30px",
              padding: "20px",
              backgroundColor: "#e7f3ff",
              borderRadius: "8px",
              border: "1px solid #b3d9ff",
              color: "#0066cc",
              textAlign: "center",
              fontSize: "16px"
            }}
          >
            <p>📋 Giáo viên chưa cho phép bạn xem chi tiết câu hỏi và đáp án</p>
            <p style={{ fontSize: "14px", marginTop: "10px", color: "#555" }}>
              Bạn chỉ có thể xem kết quả (nếu được cho phép)
            </p>
          </div>
        )}

        {/* NÚT QUAY LẠI */}
        <div style={{ textAlign: "center", marginTop: "20px" }}>
          <button
            onClick={() => navigate("/myTest")}
            style={{
              padding: "12px 30px",
              fontSize: "16px",
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer"
            }}
          >
            ← Quay lại danh sách
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReviewTestExamPage;