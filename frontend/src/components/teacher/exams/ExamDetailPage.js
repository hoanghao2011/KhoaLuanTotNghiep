// src/components/ExamDetailPage.js
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { fetchTestExamQuestions, addManualTestQuestion, addBulkTestQuestions, deleteTestQuestion, updateTestQuestionPoints, fetchBankQuestions } from "../../../api";
import "../../../styles/ExamDetailPage.css";
import RichTextEditor from "../../RichTextEditor";

const BASE_URL = "http://localhost:5000/api";

function ExamDetailPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [examData, setExamData] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [addMenuPosition, setAddMenuPosition] = useState({ x: 0, y: 0 });
  const addMenuRef = useRef(null);
  const [showManualAddModal, setShowManualAddModal] = useState(false);
  const [title, setTitle] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [difficulty, setDifficulty] = useState("Trung bình");
  const [points, setPoints] = useState(1);
  const titleEditorRef = useRef(null);
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankQuestions, setBankQuestions] = useState([]);
  const [selectedBankQuestions, setSelectedBankQuestions] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState([]);
  const [showRandomModal, setShowRandomModal] = useState(false);
  const [randomCount, setRandomCount] = useState(5);
  const [selectedRandomCategory, setSelectedRandomCategory] = useState("all");
  const [randomDifficulty, setRandomDifficulty] = useState("all");
  const [difficultyCounts, setDifficultyCounts] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedQuestions, setExpandedQuestions] = useState([]);
  const [sortBy, setSortBy] = useState("order"); // "order", "difficulty-asc", "difficulty-desc"
  const [difficultyDistribution, setDifficultyDistribution] = useState({});

  useEffect(() => {
    if (!examId) {
      navigate("/test-exam");
      return;
    }
    fetchExamData();
    fetchQuestions();
  }, [examId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target)) {
        setShowAddMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchExamData = async () => {
    try {
      const res = await fetch(`${BASE_URL}/test-exams/${examId}`);
      if (!res.ok) throw new Error("Không thể load exam");
      const data = await res.json();
      setExamData(data);
    } catch (err) {
      console.error("Lỗi khi load exam:", err);
      Swal.fire("Lỗi", "Không thể tải thông tin đề thi", "error");
      navigate("/test-exam");
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async () => {
    try {
      const data = await fetchTestExamQuestions(examId);
      setQuestions(data || []);
      // Tính toán phân bổ độ khó
      const distribution = {};
      (data || []).forEach(q => {
        const difficulty = q.questionId?.difficulty || "Trung bình";
        distribution[difficulty] = (distribution[difficulty] || 0) + 1;
      });
      setDifficultyDistribution(distribution);
    } catch (err) {
      console.error("Lỗi khi load questions:", err);
      setQuestions([]);
    }
  };

  const fetchBankQuestionsData = async () => {
    if (!examData?.categories || examData.categories.length === 0) return;
    try {
      const data = await fetchBankQuestions(examId);
      const currentQuestionIds = questions.map(q => q.questionId?._id || q.questionId);
      const availableQuestions = data.filter(q => !currentQuestionIds.includes(q._id));
      setBankQuestions(availableQuestions);
      const counts = {};
      availableQuestions.forEach(q => {
        const diff = q.difficulty || "Trung bình";
        counts[diff] = (counts[diff] || 0) + 1;
      });
      setDifficultyCounts(counts);
    } catch (err) {
      console.error("Lỗi khi load ngân hàng câu hỏi:", err);
      Swal.fire("Lỗi", "Không thể tải ngân hàng câu hỏi", "error");
    }
  };

  const insertImageIntoEditor = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = `<img src="${event.target.result}" style="max-width: 100%; height: auto;" />`;
          document.execCommand('insertHTML', false, img);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const applyFormat = (command, value = null) => {
    document.execCommand(command, false, value);
    titleEditorRef.current?.focus();
  };

  const handleAddMenuClick = (e) => {
    e.stopPropagation();
    setShowAddMenu(true);
    let x = e.clientX;
    let y = e.clientY;
    const menuWidth = 250;
    const menuHeight = 120;
    if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth;
    if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight;
    setAddMenuPosition({ x, y });
  };

  const handleManualAdd = () => {
    setShowAddMenu(false);
    setShowManualAddModal(true);
  };

  const handleSaveManualQuestion = async () => {
    const titleContent = titleEditorRef.current?.innerHTML || title;
    if (!titleContent || options.some(opt => !opt.trim())) {
      Swal.fire("Thiếu thông tin", "Vui lòng nhập đầy đủ câu hỏi và các đáp án", "warning");
      return;
    }
    
    const newTotalQuestions = questions.length + 1;
    const averagePoints = 100 / newTotalQuestions;
    
    const questionData = {
      title: titleContent,
      options,
      correctAnswer,
      difficulty,
      points: averagePoints,
      categoryId: examData.categories[0]._id || examData.categories[0],
    };
    
    try {
      const formData = new FormData();
      Object.keys(questionData).forEach(key => {
        if (key === 'options') {
          formData.append('options', JSON.stringify(questionData.options));
        } else {
          formData.append(key, questionData[key]);
        }
      });
      if (titleEditorRef.current?.querySelector('img')) {
        const imgDataUrl = titleEditorRef.current.querySelector('img').src;
        if (imgDataUrl.startsWith('data:image')) {
          const response = await fetch(imgDataUrl);
          const blob = await response.blob();
          formData.append('image', blob, 'question-image.jpg');
        }
      }
      await addManualTestQuestion(examId, formData);
      
      // Cập nhật lại điểm cho tất cả câu hỏi
      const updatedData = await fetchTestExamQuestions(examId);
      const newAveragePoints = 100 / updatedData.length;
      for (let q of updatedData) {
        await updateTestQuestionPoints(examId, q._id, newAveragePoints);
      }
      
      await fetchQuestions();
      Swal.fire("Thành công!", "Đã thêm câu hỏi vào đề thi", "success");
      resetManualForm();
    } catch (error) {
      Swal.fire("Lỗi", "Không thể thêm câu hỏi", "error");
      console.error(error);
    }
  };

  const resetManualForm = () => {
    setTitle("");
    if (titleEditorRef.current) titleEditorRef.current.innerHTML = "";
    setOptions(["", "", "", ""]);
    setCorrectAnswer(0);
    setDifficulty("Trung bình");
    setPoints(1);
    setShowManualAddModal(false);
  };

  const handleBankAdd = async () => {
    setShowAddMenu(false);
    await fetchBankQuestionsData();
    setShowBankModal(true);
  };

  const toggleCategoryExpand = (categoryId) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleSelectBankQuestion = (questionId) => {
    setSelectedBankQuestions(prev =>
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const handleAddFromBank = async () => {
    if (selectedBankQuestions.length === 0) {
      Swal.fire("Chưa chọn câu hỏi", "Vui lòng chọn ít nhất một câu hỏi", "warning");
      return;
    }
    try {
      await addBulkTestQuestions(examId, selectedBankQuestions);
      
      // Cập nhật lại điểm cho tất cả câu hỏi
      const updatedData = await fetchTestExamQuestions(examId);
      const averagePoints = 100 / updatedData.length;
      for (let q of updatedData) {
        await updateTestQuestionPoints(examId, q._id, averagePoints);
      }
      
      await fetchQuestions();
      setShowBankModal(false);
      setSelectedBankQuestions([]);
      Swal.fire("Thành công!", `Đã thêm ${selectedBankQuestions.length} câu hỏi`, "success");
    } catch (error) {
      Swal.fire("Lỗi", "Không thể thêm câu hỏi từ ngân hàng", "error");
      console.error(error);
    }
  };

  const handleRandomAdd = async () => {
    setShowAddMenu(false);
    await fetchBankQuestionsData();
    setShowRandomModal(true);
  };

  const handleConfirmRandomAdd = async () => {
    if (bankQuestions.length === 0) {
      Swal.fire("Không có câu hỏi", "Ngân hàng câu hỏi trống hoặc tất cả câu hỏi đã có trong đề.", "warning");
      return;
    }
    let filteredQuestions = bankQuestions;
    if (selectedRandomCategory !== "all") {
      filteredQuestions = filteredQuestions.filter(
        q => q.categoryId === selectedRandomCategory || q.categoryId?._id === selectedRandomCategory
      );
    }
    if (randomDifficulty !== "all") {
      filteredQuestions = filteredQuestions.filter(q => (q.difficulty || "Trung bình") === randomDifficulty);
    }
    if (filteredQuestions.length === 0) {
      Swal.fire("Không tìm thấy", "Không có câu hỏi nào phù hợp với điều kiện đã chọn.", "warning");
      return;
    }
    const shuffled = [...filteredQuestions].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, Math.min(randomCount, shuffled.length));
    try {
      await addBulkTestQuestions(examId, selected.map(q => q._id));
      
      // Cập nhật lại điểm cho tất cả câu hỏi
      const updatedData = await fetchTestExamQuestions(examId);
      const averagePoints = 100 / updatedData.length;
      for (let q of updatedData) {
        await updateTestQuestionPoints(examId, q._id, averagePoints);
      }
      
      await fetchQuestions();
      setShowRandomModal(false);
      Swal.fire("Thành công!", `Đã thêm ngẫu nhiên ${selected.length} câu hỏi`, "success");
    } catch (err) {
      console.error(err);
      Swal.fire("Lỗi", "Không thể thêm câu hỏi ngẫu nhiên", "error");
    }
  };

  const handleDeleteQuestion = async (questionItemId) => {
    const result = await Swal.fire({
      title: "Xác nhận xóa?",
      text: "Bạn có chắc chắn muốn xóa câu hỏi này khỏi đề thi?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Xóa",
      cancelButtonText: "Hủy",
    });
    if (result.isConfirmed) {
      try {
        await deleteTestQuestion(examId, questionItemId);
        
        // Cập nhật lại điểm cho các câu hỏi còn lại
        const updatedData = await fetchTestExamQuestions(examId);
        if (updatedData.length > 0) {
          const averagePoints = 100 / updatedData.length;
          for (let q of updatedData) {
            await updateTestQuestionPoints(examId, q._id, averagePoints);
          }
        }
        
        await fetchQuestions();
        Swal.fire("Đã xóa!", "Câu hỏi đã được xóa khỏi đề thi", "success");
      } catch (error) {
        Swal.fire("Lỗi", "Không thể xóa câu hỏi", "error");
        console.error(error);
      }
    }
  };

  const handleUpdateQuestionPoints = async (questionItemId, newPoints) => {
    try {
      await updateTestQuestionPoints(examId, questionItemId, parseFloat(newPoints));
      await fetchQuestions();
    } catch (error) {
      Swal.fire("Lỗi", "Không thể cập nhật điểm câu hỏi", "error");
      console.error(error);
    }
  };

  const toggleQuestionExpand = (questionId) => {
    setExpandedQuestions(prev =>
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const calculateTotalPoints = () => {
    return questions.reduce((sum, q) => sum + (q.points || 0), 0);
  };

  const getSortedQuestions = () => {
    const sorted = [...filteredQuestions];

    if (sortBy === "difficulty-asc") {
      const difficultyOrder = { "Dễ": 1, "Trung bình": 2, "Khó": 3, "Rất khó": 4 };
      sorted.sort((a, b) => {
        const diffA = a.questionId?.difficulty || "Trung bình";
        const diffB = b.questionId?.difficulty || "Trung bình";
        return (difficultyOrder[diffA] || 0) - (difficultyOrder[diffB] || 0);
      });
    } else if (sortBy === "difficulty-desc") {
      const difficultyOrder = { "Dễ": 1, "Trung bình": 2, "Khó": 3, "Rất khó": 4 };
      sorted.sort((a, b) => {
        const diffA = a.questionId?.difficulty || "Trung bình";
        const diffB = b.questionId?.difficulty || "Trung bình";
        return (difficultyOrder[diffB] || 0) - (difficultyOrder[diffA] || 0);
      });
    }

    return sorted;
  };

  if (loading) {
    return (
      <div className="exam-detail-page">
        <div className="loading">Đang tải...</div>
      </div>
    );
  }

  if (!examData) {
    return (
      <div className="exam-detail-page">
        <div className="error">Không tìm thấy đề thi</div>
      </div>
    );
  }

  const filteredQuestions = questions.filter(q => {
    const questionData = q.questionId;
    if (!questionData) return false;
    const searchLower = searchTerm.toLowerCase();
    return questionData.title.toLowerCase().includes(searchLower);
  });

  return (
    <div className="exam-detail-page">
      <div className="page-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate("/test-exam")}>
            ← Quay lại
          </button>
        </div>
        <div className="header-info">
          <h2 className="exam-title">{examData.title}</h2>
          <span className={`exam-status ${examData.status === 'published' ? 'published' : 'draft'}`}>
            {examData.status === 'published' ? '🚀 Đã xuất bản' : '📝 Bản nháp'}
          </span>
        </div>
      </div>
      <div className="exam-meta">
        <span>📚 Môn: <strong>{examData.subject?.name}</strong></span>
        <span>📝 Tổng số câu: <strong>{questions.length}</strong></span>
        {Object.keys(difficultyDistribution).length > 0 && (
          <div style={{
            marginLeft: "20px",
            display: "flex",
            gap: "15px",
            alignItems: "center",
            flexWrap: "wrap"
          }}>
            <span style={{ fontSize: "14px", color: "#666" }}>Phân bổ độ khó:</span>
            {difficultyDistribution["Dễ"] && (
              <span style={{
                fontSize: "13px",
                color: "#666"
              }}>
                Dễ: {difficultyDistribution["Dễ"]}
              </span>
            )}
            {difficultyDistribution["Trung bình"] && (
              <span style={{
                fontSize: "13px",
                color: "#666"
              }}>
                Trung bình: {difficultyDistribution["Trung bình"]}
              </span>
            )}
            {difficultyDistribution["Khó"] && (
              <span style={{
                fontSize: "13px",
                color: "#666"
              }}>
                Khó: {difficultyDistribution["Khó"]}
              </span>
            )}
            {difficultyDistribution["Rất khó"] && (
              <span style={{
                fontSize: "13px",
                color: "#666"
              }}>
                Rất khó: {difficultyDistribution["Rất khó"]}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="actions-bar">
        <input
          type="text"
          placeholder="🔍 Tìm kiếm câu hỏi..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: "4px",
            backgroundColor: "#fff",
            cursor: "pointer",
            fontSize: "14px"
          }}
        >
          <option value="order">📋 Sắp xếp theo thứ tự</option>
          <option value="difficulty-asc">📈 Từ dễ đến khó</option>
          <option value="difficulty-desc">📉 Từ khó đến dễ</option>
        </select>
        <button className="add-question-btn" onClick={handleAddMenuClick}>
          ➕ Thêm câu hỏi
        </button>
      </div>
      {showAddMenu && (
        <div
          ref={addMenuRef}
          className="context-menu"
          style={{ top: addMenuPosition.y, left: addMenuPosition.x }}
        >
          <div className="context-menu-item" onClick={handleManualAdd}>
            ✏️ Thêm thủ công
          </div>
          <div className="context-menu-item" onClick={handleBankAdd}>
            📚 Chọn từ ngân hàng
          </div>
          <div className="context-menu-item" onClick={handleRandomAdd}>
            🎲 Thêm ngẫu nhiên
          </div>
        </div>
      )}
      <div className="questions-section">
        {questions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h3>Chưa có câu hỏi nào</h3>
            <p>Hãy thêm câu hỏi đầu tiên cho đề thi của bạn</p>
            <button className="add-question-btn" onClick={handleAddMenuClick}>
              Thêm câu hỏi
            </button>
          </div>
        ) : (
          <div className="questions-list">
            {getSortedQuestions().map((q, index) => {
              const questionData = q.questionId;
              if (!questionData) return null;
              const isExpanded = expandedQuestions.includes(q._id);
              return (
                <div key={q._id} className="question-card">
                  <div
                    className="question-header"
                    onClick={() => toggleQuestionExpand(q._id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                      <span style={{ fontSize: '14px', color: '#64748b' }}>
                        {isExpanded ? '▼' : '▶'}
                      </span>
                      <div className="question-number-badge">Câu {index + 1}</div>
                      <div
                        className="question-title-compact"
                        dangerouslySetInnerHTML={{ __html: questionData.title }}
                        style={{ flex: 1, marginBottom: 0, fontSize: '16px', color: '#1e293b' }}
                      />
                      <span className={`difficulty-badge ${questionData.difficulty?.toLowerCase().replace(/\s/g, '-')}`}
                        style={{ marginBottom: 0, marginLeft: 'auto' }}>
                        {questionData.difficulty || "Trung bình"}
                      </span>
                    </div>
                    <div className="question-actions" onClick={(e) => e.stopPropagation()}>
                      <div className="points-input-group">
                        <label>Điểm:</label>
                        <input
                          type="number"
                          value={q.points || 1}
                          onChange={(e) => handleUpdateQuestionPoints(q._id, e.target.value)}
                          min="0"
                          step="0.5"
                          className="points-input"
                        />
                      </div>
                      <button
                        className="delete-question-btn"
                        onClick={() => handleDeleteQuestion(q._id)}
                      >
                        🗑️ Xóa
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="question-content">
                      {questionData.imageUrl && (
                        <div className="question-image">
                          <img
                            src={`http://localhost:5000${questionData.imageUrl}`}
                            alt="question"
                          />
                        </div>
                      )}
                      <div className="options-list">
                        {questionData.options.map((opt, idx) => (
                          <div
                            key={idx}
                            className={`option ${idx === questionData.correctAnswer ? 'correct' : ''}`}
                          >
                            <span className="option-label">
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span className="option-text">{opt}</span>
                            {idx === questionData.correctAnswer && (
                              <span className="correct-badge">✓ Đúng</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {showManualAddModal && (
        <div className="modal-overlay" onClick={resetManualForm}>
          <div className="modal-content manual-add-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✏️ Thêm câu hỏi mới</h3>
              <button className="modal-close-btn" onClick={resetManualForm}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Câu hỏi:</label>
                <RichTextEditor
                  value={title}
                  onChange={setTitle}
                  placeholder="Nhập nội dung câu hỏi..."
                />
              </div>

              <div className="form-group">
                <label>Độ khó:</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                >
                  <option value="Dễ">Dễ</option>
                  <option value="Trung bình">Trung bình</option>
                  <option value="Khó">Khó</option>
                  <option value="Rất khó">Rất khó</option>
                </select>
              </div>

              <div className="answers-section">
                <h4>Các đáp án</h4>
                {options.map((opt, idx) => (
                  <div key={idx} className="answer-item">
                    <div className="answer-header">
                      <label>Đáp án {String.fromCharCode(65 + idx)}</label>
                      <label className="correct-answer-label">
                        <input
                          type="radio"
                          name="correct"
                          checked={correctAnswer === idx}
                          onChange={() => setCorrectAnswer(idx)}
                        />
                        <span>Đáp án đúng</span>
                      </label>
                    </div>

                    <RichTextEditor
                      value={opt}
                      onChange={(value) => {
                        const newOptions = [...options];
                        newOptions[idx] = value;
                        setOptions(newOptions);
                      }}
                      placeholder={`Nhập đáp án ${String.fromCharCode(65 + idx)}...`}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={handleSaveManualQuestion} className="btn-primary">
                💾 Lưu câu hỏi
              </button>
              <button onClick={resetManualForm} className="btn-secondary">
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
      {showBankModal && (
        <div className="modal-overlay" onClick={() => {
          setShowBankModal(false);
          setSelectedBankQuestions([]);
        }}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📚 Chọn câu hỏi từ ngân hàng</h3>
              <button className="modal-close-btn" onClick={() => {
                setShowBankModal(false);
                setSelectedBankQuestions([]);
              }}>×</button>
            </div>
            <div className="modal-body">
              <div className="selection-info">
                <strong>Đã chọn: {selectedBankQuestions.length} câu hỏi</strong>
                {bankQuestions.length > 0 && (
                  <button
                    onClick={() => {
                      if (expandedCategories.length === examData.categories.length) {
                        setExpandedCategories([]);
                      } else {
                        setExpandedCategories(examData.categories.map(cat => cat._id || cat));
                      }
                    }}
                    className="toggle-all-btn"
                  >
                    {expandedCategories.length === examData.categories.length ? "Thu gọn tất cả" : "Mở rộng tất cả"}
                  </button>
                )}
              </div>
              {bankQuestions.length === 0 ? (
                <div className="empty-state">
                  <p>Không có câu hỏi nào trong ngân hàng hoặc tất cả đã được thêm vào đề thi.</p>
                </div>
              ) : (
                <div className="bank-questions-list">
                  {examData.categories.map((category) => {
                    const categoryId = category._id || category;
                    const categoryName = category.name || "Chương";
                    const categoryQuestions = bankQuestions.filter(q =>
                      (q.categoryId === categoryId) || (q.categoryId?._id === categoryId)
                    );
                    if (categoryQuestions.length === 0) return null;
                    const isExpanded = expandedCategories.includes(categoryId);
                    return (
                      <div key={categoryId} className="category-section">
                        <div
                          className="category-header"
                          onClick={() => toggleCategoryExpand(categoryId)}
                        >
                          <span className="expand-icon">{isExpanded ? "▼" : "▶"}</span>
                          <span className="category-name">{categoryName}</span>
                          <span className="category-count">{categoryQuestions.length} câu</span>
                        </div>
                        {isExpanded && (
                          <div className="category-questions">
                            {categoryQuestions.map((question, index) => (
                              <div
                                key={question._id}
                                className={`bank-question-item ${selectedBankQuestions.includes(question._id) ? 'selected' : ''}`}
                                onClick={() => toggleSelectBankQuestion(question._id)}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedBankQuestions.includes(question._id)}
                                  onChange={() => toggleSelectBankQuestion(question._id)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <div className="bank-question-content">
                                  <div
                                    className="bank-question-title"
                                    dangerouslySetInnerHTML={{ __html: `<strong>Câu ${index + 1}:</strong> ${question.title}` }}
                                  />
                                </div>
                                <div className="bank-question-meta">
                                  <span className="difficulty-tag">{question.difficulty || "Trung bình"}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                onClick={handleAddFromBank}
                className="btn-primary"
                disabled={selectedBankQuestions.length === 0}
              >
                ➕ Thêm {selectedBankQuestions.length > 0 ? `${selectedBankQuestions.length} câu` : 'câu hỏi'}
              </button>
              <button
                onClick={() => {
                  setShowBankModal(false);
                  setSelectedBankQuestions([]);
                }}
                className="btn-secondary"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
      {showRandomModal && (
        <div className="modal-overlay" onClick={() => setShowRandomModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🎲 Thêm câu hỏi ngẫu nhiên</h3>
              <button className="modal-close-btn" onClick={() => setShowRandomModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Chọn chương:</label>
                <select
                  value={selectedRandomCategory}
                  onChange={(e) => setSelectedRandomCategory(e.target.value)}
                >
                  <option value="all">Tất cả các chương ({bankQuestions.length} câu)</option>
                  {examData.categories.map((cat) => {
                    const catId = cat._id || cat;
                    const catCount = bankQuestions.filter(q => q.categoryId === catId || q.categoryId?._id === catId).length;
                    return (
                      <option key={catId} value={catId}>
                        {(cat.name || "Chương")} ({catCount} câu)
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="form-group">
                <label>Độ khó:</label>
                <select
                  value={randomDifficulty}
                  onChange={(e) => setRandomDifficulty(e.target.value)}
                >
                  <option value="all">Tất cả độ khó ({Object.values(difficultyCounts).reduce((a, b) => a + b, 0)} câu)</option>
                  <option value="Dễ">Dễ ({difficultyCounts['Dễ'] || 0} câu)</option>
                  <option value="Trung bình">Trung bình ({difficultyCounts['Trung bình'] || 0} câu)</option>
                  <option value="Khó">Khó ({difficultyCounts['Khó'] || 0} câu)</option>
                  <option value="Rất khó">Rất khó ({difficultyCounts['Rất khó'] || 0} câu)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Số lượng câu hỏi:</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={randomCount}
                  onChange={(e) => setRandomCount(parseInt(e.target.value))}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={handleConfirmRandomAdd} className="btn-primary">
                🎲 Thêm ngẫu nhiên
              </button>
              <button onClick={() => setShowRandomModal(false)} className="btn-secondary">
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExamDetailPage;