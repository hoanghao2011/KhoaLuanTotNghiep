// components/TeacherDetailModal.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import "../../styles/TeacherDetailModal.css";

function TeacherDetailModal({ teacher, onClose, onUpdate }) {
  const [currentAssignments, setCurrentAssignments] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [riskySubjectsList, setRiskySubjectsList] = useState([]);
  const [onConfirmSave, setOnConfirmSave] = useState(null);

  const [confirmModal, setConfirmModal] = useState({
    visible: false,
    message: "",
    onConfirm: null
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [activeRes, assignRes, subjectsRes] = await Promise.all([
        axios.get("https://khoaluantotnghiep-5ff3.onrender.com/api/semesters/active"),
        axios.get(`https://khoaluantotnghiep-5ff3.onrender.com/api/teaching-assignments/teacher/${teacher._id}`),
        axios.get("https://khoaluantotnghiep-5ff3.onrender.com/api/subjects")
      ]);

      const activeSemesterId = activeRes.data._id;
      const currentOnes = assignRes.data.filter(a => a.semester === activeSemesterId);

      setCurrentAssignments(currentOnes);
      setSelectedSubjectIds(currentOnes.map(a => a.subject._id));
      setAllSubjects(subjectsRes.data);
    } catch (err) {
      console.error(err);
      alert("Không thể tải dữ liệu giảng viên!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (teacher) loadData();
  }, [teacher]);

  const handleResetPassword = async () => {
    if (!window.confirm(`Đặt lại mật khẩu giảng viên "${teacher.name}" về 123456?`)) return;
    setResetting(true);
    try {
      await axios.post(`https://khoaluantotnghiep-5ff3.onrender.com/api/users/${teacher._id}/reset-password`);
      alert("Reset mật khẩu thành công! Mật khẩu mới: 123456");
    } catch (err) {
      alert("Lỗi reset mật khẩu!");
    } finally {
      setResetting(false);
    }
  };

  const proceedSave = async (latestAssignments, removedSubjectIds, examsBySubject, activeSemesterId) => {
    try {
      // 🔑 Sửa: Xóa TẤT CẢ assignments bị remove (bao gồm cả risky nếu đã confirm)
      const toDelete = latestAssignments.filter(a =>
        removedSubjectIds.includes(a.subject._id)
      );

      console.log("Assignments to delete:", toDelete); // Logging để debug

      const deletePromises = toDelete.map(a =>
        axios.delete(`https://khoaluantotnghiep-5ff3.onrender.com/api/teaching-assignments/${a._id}`)
      );

      const existingIds = new Set(latestAssignments.map(a => a.subject._id));
      const createPromises = selectedSubjectIds
        .filter(id => !existingIds.has(id))
        .map(subjectId =>
          axios.post("https://khoaluantotnghiep-5ff3.onrender.com/api/teaching-assignments", {
            teacher: teacher._id,
            subject: subjectId,
            semester: activeSemesterId
          })
        );

      await Promise.all([...deletePromises, ...createPromises]);

      alert("Cập nhật môn dạy thành công!");
      setEditing(false);
      await loadData(); // Reload để cập nhật giao diện
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error("Lỗi trong proceedSave:", err);
      alert("Lỗi: " + (err.response?.data?.message || err.message));
    }
  };

  const handleSaveSubjects = async () => {
    try {
      const activeRes = await axios.get("https://khoaluantotnghiep-5ff3.onrender.com/api/semesters/active");
      const activeSemesterId = activeRes.data._id;

      const latestAssignRes = await axios.get(
        `https://khoaluantotnghiep-5ff3.onrender.com/api/teaching-assignments/teacher/${teacher._id}`
      );
      const latestAssignments = latestAssignRes.data.filter(a => a.semester === activeSemesterId);

      const previouslySelected = new Set(latestAssignments.map(a => a.subject._id));
      const nowSelected = new Set(selectedSubjectIds);

      const removedSubjectIds = [...previouslySelected].filter(id => !nowSelected.has(id));

      const hasExamRes = await axios.get(
        `https://khoaluantotnghiep-5ff3.onrender.com/api/exams/teacher/${teacher._id}/subjects`
      );
      const examsBySubject = hasExamRes.data;

      const riskySubjects = latestAssignments
        .filter(a =>
          removedSubjectIds.includes(a.subject._id) &&
          (a.class || examsBySubject.some(e => e.subject === a.subject._id && e.count > 0))
        )
        .map(a => a.subject.name);

      if (riskySubjects.length > 0) {
        setRiskySubjectsList(riskySubjects);

        // Mở modal confirm
        setConfirmModal({
          visible: true,
          message: `CẢNH BÁO: Bạn đang bỏ phân công các môn sau:\n\n` +
                   riskySubjects.map(name => `${name}`).join("\n") +
                   `\n\nNhững môn này đã được xếp lớp hoặc đã tạo đề thi!\n\nBạn có chắc chắn muốn tiếp tục?`,
          onConfirm: async () => {
            // Ẩn modal
            setConfirmModal({ visible: false, message: "", onConfirm: null });
            // Thực hiện lưu và xóa TẤT CẢ (bao gồm risky)
            await proceedSave(latestAssignments, removedSubjectIds, examsBySubject, activeSemesterId);
          }
        });

        return; // Dừng, chờ confirm
      }

      // Nếu không risky, proceed ngay (chỉ xóa safe, nhưng vì removedSubjectIds không chứa risky, nên OK)
      await proceedSave(latestAssignments, removedSubjectIds, examsBySubject, activeSemesterId);

    } catch (err) {
      console.error("Lỗi lưu môn dạy:", err);
      alert("Lỗi: " + (err.response?.data?.message || err.message));
    }
  };

  if (!teacher) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Chi tiết giảng viên</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="student-avatar">
            <div className="avatar-placeholder">
              {teacher.name?.charAt(0).toUpperCase() || "T"}
            </div>
          </div>

          <div className="info-grid">
            <div className="info-item"><label>Mã GV:</label> <strong className="highlight">{teacher.username}</strong></div>
            <div className="info-item"><label>Họ và tên:</label> <strong>{teacher.name}</strong></div>
            <div className="info-item"><label>Tài khoản:</label> <strong>{teacher.username}</strong></div>
            <div className="info-item">
              <label>Mật khẩu:</label>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ fontFamily: "monospace", letterSpacing: "3px", color: "#666" }}>••••••••</span>
                <button onClick={handleResetPassword} disabled={resetting}
                  style={{ background: resetting ? "#ccc" : "#dc3545", color: "white", border: "none", borderRadius: "8px", padding: "8px 16px", fontWeight: "600" }}>
                  {resetting ? "Đang..." : "Reset về 123456"}
                </button>
              </div>
            </div>
          </div>

          <div className="classes-section" style={{ marginTop: "28px" }}>
            <h3>Môn dạy hiện tại (Học kỳ đang diễn ra)</h3>

            {loading ? (
              <p>Đang tải...</p>
            ) : editing ? (
              <div>
                <div style={{ maxHeight: "260px", overflowY: "auto", border: "1px solid #ddd", borderRadius: "8px", padding: "12px", background: "#f9f9f9" }}>
                  {allSubjects.map(s => (
                    <label key={s._id} className="subject-checkbox-item">
                      <input
                        type="checkbox"
                        checked={selectedSubjectIds.includes(s._id)}
                        onChange={() => setSelectedSubjectIds(prev =>
                          prev.includes(s._id) ? prev.filter(id => id !== s._id) : [...prev, s._id]
                        )}
                      />
                      <span className="subject-name">{s.name}</span>
                    </label>
                  ))}
                </div>
                <div style={{ marginTop: "16px", textAlign: "right" }}>
                  <button onClick={handleSaveSubjects} style={{ background: "#4caf50", color: "white", padding: "10px 20px", border: "none", borderRadius: "8px", marginRight: "8px", fontWeight: "600" }}>
                    Lưu thay đổi
                  </button>
                  <button onClick={() => setEditing(false)} style={{ background: "#6c757d", color: "white", padding: "10px 20px", border: "none", borderRadius: "8px", fontWeight: "600" }}>
                    Hủy
                  </button>
                </div>
              </div>
            ) : (
              <>
                {currentAssignments.length === 0 ? (
                  <p className="no-data">Chưa phân công môn nào trong học kỳ hiện tại.</p>
                ) : (
                  <div className="classes-grid">
                    {currentAssignments.map(a => (
                      <div key={a._id} className="class-card">
                        <h3>{a.subject.name}</h3>
                        <div className="class-info">
                          <p>
                            <strong>Lớp:</strong>{" "}
                            {a.class?.className ? (
                              <span style={{ color: "#1976d2", fontWeight: "600" }}>{a.class.className}</span>
                            ) : (
                              <span style={{ color: "#e67e22", fontStyle: "italic" }}>Chưa xếp lớp</span>
                            )}
                          </p>
                          <p><strong>Học kỳ:</strong> <span style={{ color: "#2e7d32" }}>Học kỳ 2 2025-2026</span></p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ textAlign: "right", marginTop: "16px" }}>
                  <button onClick={() => setEditing(true)}
                  style={{ background: "#1976d2", color: "white", padding: "10px 20px", border: "none", borderRadius: "8px", fontWeight: "600" }}>
                    Chỉnh sửa môn dạy
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-close">Đóng</button>
        </div>
      </div>

      {confirmModal.visible && (
        <div className="modal-overlay" style={{ background: "rgba(0,0,0,0.65)", zIndex: 10000 }}>
          <div
            className="modal-content"
            style={{ maxWidth: "480px", padding: "24px" }}
            onClick={(e) => e.stopPropagation()} // chặn click lan ra ngoài
          >
            <h3 style={{ color: "#dc3545", marginBottom: "16px" }}>Cảnh báo</h3>

            <div style={{ lineHeight: "1.5", color: "#333", fontSize: "15px" }}>
              <p>Bạn đang bỏ phân công các môn sau:</p>
              <ul style={{ paddingLeft: "20px", marginBottom: "12px" }}>
                {riskySubjectsList.map((name, idx) => (
                  <li key={idx} style={{ marginBottom: "4px" }}>{name}</li>
                ))}
              </ul>
              <p>Những môn này đã được xếp lớp hoặc đã tạo đề thi!</p>
              <p style={{ fontWeight: "600", marginTop: "12px" }}>Bạn có chắc chắn muốn tiếp tục?</p>
            </div>

            <div style={{ textAlign: "right", marginTop: "20px" }}>
              <button
                style={{ marginRight: "8px", padding: "8px 16px", borderRadius: "6px", border: "1px solid #ccc" }}
                onClick={() => setConfirmModal({ visible: false, message: "", onConfirm: null })}
              >
                Hủy
              </button>
              <button
                onClick={confirmModal.onConfirm}
                style={{
                  background: "#dc3545",
                  color: "white",
                  padding: "8px 16px",
                  borderRadius: "6px",
                  border: "none",
                  fontWeight: "600"
                }}
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default TeacherDetailModal;
