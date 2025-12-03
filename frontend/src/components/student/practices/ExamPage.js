import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "../../../styles/ExamPage.css";

function ExamPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [examInfo, setExamInfo] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExamDetails = async () => {
      try {
        // Lấy thông tin đề
        const examRes = await axios.get(`https://khoaluantotnghiep-5ff3.onrender.com/api/practice-exams/${examId}`);
        setExamInfo(examRes.data);

        // Lấy danh sách câu hỏi
        const questionsRes = await axios.get(`https://khoaluantotnghiep-5ff3.onrender.com/api/practice-exams/${examId}/questions`);
        setQuestions(questionsRes.data || []);
      } catch (err) {
        console.error("Lỗi khi tải đề thi:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchExamDetails();
  }, [examId]);

  const handleAnswerChange = (questionId, answerIndex) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answerIndex }));
  };

  const handleSubmit = () => {
    const score = questions.reduce((acc, q) => {
      if (answers[q._id] === q.correctAnswer) {
        acc += q.scorePerQuestion || 1;
      }
      return acc;
    }, 0);

    alert(`Bạn đã nộp bài! Điểm: ${score}/${questions.length * (examInfo?.scorePerQuestion || 1)}`);
    navigate("/myExams");
  };

  if (loading) return <p>Đang tải đề thi...</p>;
  if (!examInfo) return <p>Không tìm thấy đề thi!</p>;

  return (
    <div className="exam-page">
      <h2>{examInfo.title}</h2>
      <div className="exam-timer">Thời gian: {examInfo.duration} phút</div>

      <div className="questions-container">
        {questions.length === 0 ? (
          <p>Chưa có câu hỏi nào trong đề này.</p>
        ) : (
          questions.map((question, index) => (
            <div key={question._id} className="question-item">
              <h3>
                Câu {index + 1}: {question.title && question.title.includes('<') ? (
                  <div dangerouslySetInnerHTML={{ __html: question.title }} style={{ display: 'inline' }} />
                ) : (
                  question.title
                )}
              </h3>

              {question.imageUrl && (
                <div className="question-image-inline">
                  <img
                    src={`https://khoaluantotnghiep-5ff3.onrender.com${question.imageUrl}`}
                    alt="question-image"
                    onError={(e) => {
                      console.warn(`❌ Failed to load image: ${question.imageUrl}`);
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}

              {question.options.map((option, optIndex) => (
                <div key={optIndex} className="option">
                  <input
                    type="radio"
                    name={`question-${question._id}`}
                    checked={answers[question._id] === optIndex}
                    onChange={() => handleAnswerChange(question._id, optIndex)}
                  />
                  <label>{String.fromCharCode(65 + optIndex)}. {option}</label>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      <button className="submit-btn" onClick={handleSubmit}>Nộp bài</button>
    </div>
  );
}

export default ExamPage;
