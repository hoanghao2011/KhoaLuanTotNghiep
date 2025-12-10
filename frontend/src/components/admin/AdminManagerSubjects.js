import React, { useEffect, useState } from "react";
import axios from "axios";
import "../../styles/AdminManagerSubjects.css";

const API_BASE = "http://localhost:5000/api";

const AdminManagerSubjects = () => {
  const [subjects, setSubjects] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [activeSemester, setActiveSemester] = useState(null);
const [selectedSemesterId, setSelectedSemesterId] = useState("all");

  // Modal thêm môn học
  const [modalVisible, setModalVisible] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [selectedSemesterForAdd, setSelectedSemesterForAdd] = useState(""); // chọn khi thêm

  useEffect(() => {
    fetchSemestersAndActive();
  }, []);

useEffect(() => {
  if (selectedSemesterId === "all") {
    fetchAllSubjects();
  } else if (selectedSemesterId) { 
    fetchSubjects(selectedSemesterId);
  }
}, [selectedSemesterId]);

  // Thêm ngay dưới hàm fetchSubjects
const fetchAllSubjects = async () => {
  try {
    const res = await axios.get(`${API_BASE}/subjects/all`);
    setSubjects(res.data);
  } catch (err) {
    console.error("Lỗi lấy tất cả môn học:", err);
    setSubjects([]);
  }
};

  const fetchSemestersAndActive = async () => {
    try {
      const [allRes, activeRes] = await Promise.all([
        axios.get(`${API_BASE}/semesters`),
        axios.get(`${API_BASE}/semesters/active`).catch(() => ({ data: null }))
      ]);
      setSemesters(
        allRes.data.sort((a, b) => a.name.localeCompare(b.name, "vi"))
      );

      if (activeRes.data) {
        setActiveSemester(activeRes.data);
      }
    } catch (err) {
      console.error("Lỗi tải học kỳ:", err);
      alert("Không thể tải danh sách học kỳ");
    }
  };

  const fetchSubjects = async (semesterId) => {
    if (!semesterId) return;
    try {
      const res = await axios.get(`${API_BASE}/subjects?semesterId=${semesterId}`);
      setSubjects(res.data);
    } catch (err) {
      console.error(err);
      // Không alert lỗi nhẹ
    }
  };

const handleSemesterChange = (e) => {
  const value = e.target.value;
  setSelectedSemesterId(value);
};

  const handleAddSubject = async () => {
    const name = newSubjectName.trim();
    if (!name) return alert("Vui lòng nhập tên môn học!");
    if (!selectedSemesterForAdd) return alert("Vui lòng chọn học kỳ!");

    try {
      const res = await axios.post(`${API_BASE}/subjects`, {
        name,
        semesterId: selectedSemesterForAdd
      });

      // Nếu đang xem đúng học kỳ đó → thêm vào danh sách
      if (selectedSemesterForAdd === selectedSemesterId) {
        setSubjects(prev => [...prev, res.data]);
      }

      alert(`Đã thêm môn "${name}" vào học kỳ thành công!`);
      setNewSubjectName("");
      setModalVisible(false);
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi khi thêm môn học");
    }
  };

  const handleDelete = async (subject) => {
    if (!window.confirm(`Xóa môn học "${subject.name}"?`)) return;

    try {
      await axios.delete(`${API_BASE}/subjects/${subject._id}`);
      setSubjects(prev => prev.filter(s => s._id !== subject._id));
      alert("Xóa thành công!");
    } catch (err) {
      alert(err.response?.data?.message || "Không thể xóa môn học");
    }
  };

  return (
    <div className="admin-subjects-container">
      {/* Header với nút thêm bên trái, học kỳ bên phải */}
      <div style={{ marginBottom: "25px" }}>
        <h2 style={{ marginBottom: "15px" }}>Quản lý môn học</h2>

        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "15px"
        }}>
          {/* Nút thêm môn sát bên trái */}
          <button className="add-btn" onClick={() => setModalVisible(true)}>
            Thêm môn học
          </button>

          {/* Selector học kỳ */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontWeight: "600", color: "#333", whiteSpace: "nowrap" }}>
              Xem học kỳ:
            </span>
<select
  value={selectedSemesterId}
  onChange={handleSemesterChange}
  style={{
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    fontSize: "16px",
    minWidth: "280px",
    backgroundColor: selectedSemesterId === "all" ? "#f0f8ff" : 
                   activeSemester?._id === selectedSemesterId ? "#e8f5e8" : "white",
    fontWeight: selectedSemesterId === "all" ? "normal" : "normal"
  }}
>
  <option value="all">Tất cả học kỳ</option>
  {semesters.map(sem => (
    <option key={sem._id} value={sem._id}>
      {sem.name} {sem.isActive && "(Kỳ hiện tại)"}
    </option>
  ))}
</select>
          </div>
        </div>
      </div>

      {/* Bảng môn học */}
      <table className="subjects-table">
        <thead>
          <tr>
            <th>STT</th>
            <th>Tên môn học</th>
            <th>Học kỳ</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {subjects.length === 0 ? (
            <tr>
              <td colSpan="3" style={{ textAlign: "center", color: "#999", fontStyle: "italic", padding: "30px" }}>
                Chưa có môn học nào trong học kỳ này
              </td>
            </tr>
          ) : (
          subjects.map((s, index) => (
            <tr key={s._id}>
              <td>{index + 1}</td>
              <td>{s.name}</td>
                <td>{s.semester?.name || "—"}</td>
              <td>
                <button className="delete-btn" onClick={() => handleDelete(s)}>
                  Xóa
                </button>
              </td>
            </tr>
          ))
          )}
        </tbody>
      </table>

      {/* Modal thêm môn học - có chọn học kỳ */}
      {modalVisible && (
        <div className="modal" onClick={() => setModalVisible(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>Thêm môn học mới</h3>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                Chọn học kỳ <span style={{ color: "#e74c3c" }}>*</span>
              </label>
              <select
                value={selectedSemesterForAdd}
                onChange={(e) => setSelectedSemesterForAdd(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #ccc",
                  fontSize: "16px"
                }}
              >
                <option value="all">-- Tất cả học kỳ --</option>
                {semesters.map(sem => (
                  <option key={sem._id} value={sem._id}>
                    {sem.name} {sem.isActive && "(Kỳ hiện tại)"}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
                Tên môn học <span style={{ color: "#e74c3c" }}>*</span>
              </label>
              <input
                type="text"
                placeholder="VD: Toán học, Ngữ văn, Tin học..."
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddSubject()}
                autoFocus
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #ccc",
                  fontSize: "16px"
                }}
              />
            </div>

            <div className="modal-actions">
              <button onClick={handleAddSubject} style={{ backgroundColor: "#1a73e8" }}>
                Thêm môn học
              </button>
              <button onClick={() => {
                setModalVisible(false);
                setNewSubjectName("");
                setSelectedSemesterForAdd(activeSemester?._id || "");
              }} style={{ backgroundColor: "#95a5a6" }}>
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagerSubjects;