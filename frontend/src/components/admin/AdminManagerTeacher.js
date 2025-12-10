import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import "../../styles/AdminManagerTeacher.css";
import TeacherDetailModal from "../admin/TeacherDetailModal";

const API_BASE = "http://localhost:5000/api"; // Đã thêm http:// để tránh lỗi

const normalizeString = (str) =>
  str?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() || "";

const AdminManagerTeacher = () => {
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);        // Tất cả môn học (có semester)
  const [assignments, setAssignments] = useState([]);
  const [semesters, setSemesters] = useState([]);      // Danh sách học kỳ

  // Modal thêm giảng viên
  const [addModal, setAddModal] = useState(false);
  const [selectedSemesterForAdd, setSelectedSemesterForAdd] = useState(""); // Học kỳ chọn khi thêm

  // Modal chỉnh sửa phân công
  const [editModal, setEditModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);

  // Modal xóa
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    teacherId: null,
    teacherName: "",
  });

  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState("all");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [selectedSemesterView, setSelectedSemesterView] = useState("all");
  const [notifyModal, setNotifyModal] = useState({
    open: false,
    message: "",
    type: "success",
  });

  const showNotify = (message, type = "success") => {
    setNotifyModal({ open: true, message, type });
  };

  const [newTeacher, setNewTeacher] = useState({
    name: "",
    username: "",
    password: "123456",
    subjectIds: [],
  });

  // ==================== FETCH DATA ====================
  useEffect(() => {
    fetchTeachers();
    fetchAllSubjects();     // Lấy tất cả môn để filter theo kỳ
    fetchAssignments();
    fetchSemesters();
  }, []);

  const fetchTeachers = async () => {
    try {
      const res = await axios.get(`${API_BASE}/users`);
      setTeachers(res.data.filter((u) => u.role === "teacher"));
    } catch (err) {
      console.error("Lỗi tải giảng viên:", err);
    }
  };

  const fetchAllSubjects = async () => {
    try {
      const res = await axios.get(`${API_BASE}/subjects/all`); // Đảm bảo route này trả kèm semester đã populate
      setSubjects(res.data);
    } catch (err) {
      console.error("Lỗi tải môn học:", err);
    }
  };

  const fetchAssignments = async () => {
    try {
      const res = await axios.get(`${API_BASE}/teaching-assignments`);
      setAssignments(res.data);
    } catch (err) {
      console.error("Lỗi tải phân công:", err);
    }
  };

  const fetchSemesters = async () => {
    try {
      const res = await axios.get(`${API_BASE}/semesters`);
      setSemesters(res.data.sort((a, b) => new Date(b.startDate) - new Date(a.startDate)));
    } catch (err) {
      console.error("Lỗi tải học kỳ:", err);
    }
  };

// ==================== XỬ LÝ DỮ LIỆU CHO BẢNG – CÓ LỌC THEO HỌC KỲ ====================
const processedTeachers = useMemo(() => {
  let filteredBySemester = teachers;

  // Nếu chọn học kỳ cụ thể → chỉ lấy giảng viên có dạy môn trong kỳ đó
  if (selectedSemesterView !== "all") {
    const teacherIdsInSemester = assignments
      .filter(a => a.semester?._id === selectedSemesterView)
      .map(a => a.teacher?._id);

    filteredBySemester = teachers.filter(t => 
      teacherIdsInSemester.includes(t._id)
    );
  }

  return filteredBySemester.map((teacher) => {
    const teacherAssignments = assignments.filter((a) => a.teacher?._id === teacher._id);

    const subjectNames = teacherAssignments
      .map((a) => a.subject?.name)
      .filter(Boolean);

    const semesterNames = [...new Set(
      teacherAssignments
        .map((a) => a.semester?.name)
        .filter(Boolean)
    )];

    return {
      ...teacher,
      subjectNames,
      semesterNames: semesterNames.length > 0 ? semesterNames.join(", ") : "Chưa có",
    };
  });
}, [teachers, assignments, selectedSemesterView]);
  // Filter + Search
  const filteredTeachers = useMemo(() => {
    let result = processedTeachers;

    if (searchTerm) {
      const term = normalizeString(searchTerm);
      result = result.filter((t) =>
        normalizeString(t.name).includes(term) ||
        normalizeString(t.username).includes(term) ||
        normalizeString(t.subjectNames.join(" ")).includes(term) ||
        normalizeString(t.semesterNames).includes(term)
      );
    }

    return result;
  }, [processedTeachers, searchTerm]);

  // Sort
  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const sortedTeachers = useMemo(() => {
    if (!sortConfig.key) return filteredTeachers;
    return [...filteredTeachers].sort((a, b) => {
      let aVal = a[sortConfig.key] || "";
      let bVal = b[sortConfig.key] || "";
      if (sortConfig.key === "subjectNames") {
        aVal = a.subjectNames.join(", ");
        bVal = b.subjectNames.join(", ");
      }
      aVal = normalizeString(aVal.toString());
      bVal = normalizeString(bVal.toString());
      return sortConfig.direction === "asc"
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    });
  }, [filteredTeachers, sortConfig]);
// Hàm toggle môn
const toggleSubject = (subjectId) => {
  if (addModal) {
    setNewTeacher(prev => ({
      ...prev,
      subjectIds: prev.subjectIds.includes(subjectId)
        ? prev.subjectIds.filter(id => id !== subjectId)
        : [...prev.subjectIds, subjectId]
    }));
  } else {
    setSelectedSubjectIds(prev =>
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  }
};

// Danh sách môn cần hiển thị
const subjectsToShow = addModal
  ? subjects.filter(s => !selectedSemesterForAdd || s.semester?._id === selectedSemesterForAdd)
  : subjects;

// Danh sách ID đã chọn
const selectedIds = addModal ? newTeacher.subjectIds : selectedSubjectIds;
  // ==================== THÊM GIẢNG VIÊN ====================
const handleSaveNewTeacher = async () => {
  if (!newTeacher.name.trim() || !newTeacher.username.trim()) {
    showNotify("Vui lòng nhập đầy đủ họ tên và mã giảng viên!", "error");
    return;
  }
  if (newTeacher.subjectIds.length === 0) {
    showNotify("Vui lòng chọn ít nhất 1 môn học!", "error");
    return;
  }

  const usernameExists = teachers.some(
    (t) => t.username.toLowerCase() === newTeacher.username.toLowerCase()
  );
  if (usernameExists) {
    showNotify("Mã giảng viên đã tồn tại!", "error");
    return;
  }

  setLoading(true);
  try {
    const userRes = await axios.post(`${API_BASE}/users`, {
      name: newTeacher.name.trim(),
      username: newTeacher.username.trim(),
      password: newTeacher.password,
      role: "teacher",
    });

    const teacherId = userRes.data._id;

    // SỬA CHỖ NÀY – ĐÃ ĐÚNG 100%
    await Promise.all(
      newTeacher.subjectIds.map((subjectId) => {
        const subject = subjects.find(s => s._id === subjectId);
        return axios.post(`${API_BASE}/teaching-assignments`, {
          teacher: teacherId,
          subject: subjectId,
          semester: subject.semester._id, // LẤY ĐÚNG HỌC KỲ TỪ MÔN
        });
      })
    );

    showNotify("Thêm giảng viên thành công!");
    setAddModal(false);
    setNewTeacher({ name: "", username: "", password: "123456", subjectIds: [] });
    setSelectedSemesterForAdd("");
    fetchTeachers();
    fetchAssignments();
  } catch (err) {
    showNotify(err.response?.data?.message || "Lỗi khi thêm giảng viên", "error");
  } finally {
    setLoading(false);
  }
};
  // ==================== XÓA & CHỈNH SỬA (giữ nguyên logic cũ, chỉ sửa nhỏ) ====================
  const openDeleteModal = (id, name) => {
    setDeleteModal({ open: true, teacherId: id, teacherName: name });
  };

  const confirmDelete = async () => {
    setLoading(true);
    try {
      const teacherAssignments = assignments.filter((a) => a.teacher?._id === deleteModal.teacherId);
      await Promise.all(
        teacherAssignments.map((a) => axios.delete(`${API_BASE}/teachingAssignments/${a._id}`))
      );
      await axios.delete(`${API_BASE}/users/${deleteModal.teacherId}`);

      fetchTeachers();
      fetchAssignments();
      showNotify("Xóa giảng viên thành công!", "success");
    } catch (err) {
      showNotify("Không thể xóa giảng viên!", "error");
    } finally {
      setLoading(false);
      setDeleteModal({ open: false });
    }
  };

const handleSaveEdit = async () => {
  if (selectedSubjectIds.length === 0) {
    showNotify("Chọn ít nhất 1 môn!", "error");
    return;
  }
  setLoading(true);
  try {
    const oldAssignments = assignments.filter((a) => a.teacher?._id === selectedTeacher._id);
    await Promise.all(oldAssignments.map((a) => axios.delete(`${API_BASE}/teaching-assignments/${a._id}`)));

    // SỬA CHỖ NÀY – ĐÃ ĐÚNG 100%
    await Promise.all(
      selectedSubjectIds.map((sid) => {
        const subject = subjects.find(s => s._id === sid);
        return axios.post(`${API_BASE}/teaching-assignments`, {
          teacher: selectedTeacher._id,
          subject: sid,
          semester: subject.semester._id, // LẤY ĐÚNG HỌC KỲ TỪ MÔN
        });
      })
    );

    showNotify("Cập nhật phân công thành công!");
    setEditModal(false);
    fetchAssignments();
  } catch (err) {
    showNotify("Lỗi khi cập nhật!", "error");
  } finally {
    setLoading(false);
  }
};

  // ==================== RENDER ====================
  return (
    <div className="admin-teacher-container">
      <div style={{ marginBottom: "25px" }}>
        <h2 style={{ marginBottom: "15px" }}>Quản lý giảng viên</h2>

        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "15px"
        }}>
          {/* Nút thêm */}
          <button className="add-btn" onClick={() => setAddModal(true)}>
            + Thêm giảng viên
          </button>

          {/* Bộ lọc học kỳ*/}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontWeight: "600", color: "#333", whiteSpace: "nowrap" }}>
              Xem học kỳ:
            </span>
            <select
              value={selectedSemesterView}
              onChange={(e) => setSelectedSemesterView(e.target.value)}
              style={{
                padding: "10px 14px",
                borderRadius: "8px",
                border: "1px solid #ccc",
                fontSize: "16px",
                minWidth: "280px",
                backgroundColor: selectedSemesterView === "all" ? "#f0f8ff" : 
                semesters.find(s => s._id === selectedSemesterView)?.isActive ? "#e8f5e8" : "white",
              }}
            >
              <option value="all">Tất cả học kỳ</option>
              {semesters.map((sem) => (
                <option key={sem._id} value={sem._id}>
                  {sem.name} {sem.isActive && "(Kỳ hiện tại)"}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Ô tìm kiếm */}
      <div className="search-filter">
        <input
          type="text"
          placeholder="Tìm kiếm giảng viên, môn học, học kỳ..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <table className="teachers-table">
        <thead>
          <tr>
            <th onClick={() => handleSort("username")}>
              Mã GV {sortConfig.key === "username" ? "Up" : "Down"}
            </th>
            <th onClick={() => handleSort("name")}>
              Tên giảng viên {sortConfig.key === "name" ? "Up" : "Down"}
            </th>
            <th onClick={() => handleSort("subjectNames")}>
              Môn dạy {sortConfig.key === "subjectNames" ? "Up" : "Down"}
            </th>
            <th>Học kỳ</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          {sortedTeachers.map((t) => (
            <tr key={t._id}>
              <td>{t.username}</td>
              <td>{t.name}</td>
              <td>
                {t.subjectNames.length > 0
                  ? t.subjectNames.map((sub, i) => (
                      <span key={i} className="badge badge-subject">
                        {sub}
                      </span>
                    ))
                  : <em style={{ color: "#999" }}>Chưa phân công</em>}
              </td>
              <td>
                <strong>{t.semesterNames}</strong>
              </td>
              <td className="action-btns">
                <button
                  style={{ backgroundColor: "#e67e22" }}
                  onClick={() => setSelectedTeacher(t)}
                >
                  Chi tiết
                </button>
                <button
                  style={{ backgroundColor: "#e74c3c" }}
                  onClick={() => openDeleteModal(t._id, t.name)}
                >
                  Xóa
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ==================== MODAL THÊM GIẢNG VIÊN ==================== */}
      {addModal && (
        <div className="modal">
          <div className="modal-content">
            <button
              onClick={() => setAddModal(false)}
              style={{
                position: "flex",
                top: "10px",
                right: "15px",
                background: "none",
                border: "none",
                fontSize: "24px",
                cursor: "pointer",
              }}
            >
              ×
            </button>

            <h3>Thêm giảng viên mới</h3>

            <label>Tên giảng viên <span style={{ color: "red" }}>*</span></label>
            <input
              value={newTeacher.name}
              onChange={(e) => setNewTeacher({ ...newTeacher, name: e.target.value })}
              placeholder="Nhập họ tên"
            />

            <label>Mã giảng viên <span style={{ color: "red" }}>*</span></label>
            <input
              value={newTeacher.username}
              onChange={(e) => setNewTeacher({ ...newTeacher, username: e.target.value })}
              placeholder="VD: gv001"
            />

            {/* CHỌN HỌC KỲ */}
            <label>Chọn học kỳ để hiển thị môn học</label>
            <select
              value={selectedSemesterForAdd}
              onChange={(e) => setSelectedSemesterForAdd(e.target.value)}
              style={{ marginBottom: "15px" }}
            >
              <option value="">-- Tất cả học kỳ --</option>
              {semesters.map((sem) => (
                <option key={sem._id} value={sem._id}>
                  {sem.name} {sem.isActive && "(Kỳ hiện tại)"}
                </option>
              ))}
            </select>

            {/* DANH SÁCH MÔN HỌC THEO KỲ */}
<div className="subjects-selection">
  <p style={{ margin: "0 0 12px 0", fontWeight: "600", color: "#333" }}>
    Chọn môn dạy <span style={{ color: "red" }}>*</span>
  </p>
  <div className="subjects-list">
    {subjectsToShow.length === 0 ? (
      <p style={{ textAlign: "center", color: "#999", padding: "30px 0", margin: 0 }}>
        Không có môn học nào trong học kỳ này
      </p>
    ) : (
      subjectsToShow.map((s) => (
        <label key={s._id} className="subject-checkbox-item">
          <input
            type="checkbox"
            checked={selectedIds.includes(s._id)}
            onChange={() => toggleSubject(s._id)}
          />
          <div className="subject-info">
            <span className="subject-name">{s.name}</span>
            {s.code && <span className="subject-code">({s.code})</span>}
          </div>
        </label>
      ))
    )}
  </div>
</div>
            <div className="modal-actions">
              <button onClick={handleSaveNewTeacher} disabled={loading}>
                {loading ? "Đang lưu..." : "Thêm giảng viên"}
              </button>
              <button onClick={() => setAddModal(false)}>Hủy</button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL PHÂN CÔNG (giữ nguyên đẹp) ==================== */}
      {editModal && selectedTeacher && (
        <div className="modal">
          <div className="modal-content">
            <h3>Phân công môn dạy</h3>
            <p>
              <strong>Giảng viên:</strong> {selectedTeacher.name}
            </p>

            <div className="subjects-selection">
              <p style={{ margin: "0 0 10px 0", fontWeight: "500" }}>
                Chọn môn dạy cho <strong style={{ color: "#1a73e8" }}>{selectedTeacher.name}</strong>
              </p>
              <div className="subjects-list">
                {subjects.map((s) => (
                  <label key={s._id} className="subject-checkbox-item">
                    <input
                      type="checkbox"
                      checked={selectedSubjectIds.includes(s._id)}
                      onChange={() => {
                        setSelectedSubjectIds((prev) =>
                          prev.includes(s._id)
                            ? prev.filter((id) => id !== s._id)
                            : [...prev, s._id]
                        );
                      }}
                    />
                    <span className="subject-name">{s.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button onClick={handleSaveEdit} disabled={loading}>
                Lưu
              </button>
              <button onClick={() => setEditModal(false)}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL XÓA & NOTIFY & DETAIL ==================== */}
      {deleteModal.open && (
        <div className="modal">
          <div className="modal-content" style={{ textAlign: "center" }}>
            <h3 style={{ color: "#e74c3c" }}>Xác nhận xóa</h3>
            <p>
              Xóa giảng viên <strong>{deleteModal.teacherName}</strong>?
            </p>
            <div className="modal-actions">
              <button onClick={confirmDelete} disabled={loading}>
                Xóa
              </button>
              <button onClick={() => setDeleteModal({ open: false })}>Hủy</button>
            </div>
          </div>
        </div>
      )}

      {notifyModal.open && (
        <div className="modal">
          <div className={`modal-content notify-modal ${notifyModal.type}`}>
            <h3>{notifyModal.type === "success" ? "Thành công" : "Lỗi"}</h3>
            <p>{notifyModal.message}</p>
            <div className="modal-actions">
              <button onClick={() => setNotifyModal({ open: false })}>Đóng</button>
            </div>
          </div>
        </div>
      )}

      {selectedTeacher && !editModal && (
        <TeacherDetailModal
          teacher={selectedTeacher}
          onClose={() => setSelectedTeacher(null)}
          onUpdate={fetchAssignments}
        />
      )}

      {loading && (
        <div className="modal" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="modal-content" style={{ background: "transparent", boxShadow: "none" }}>
            <p style={{ color: "white", fontSize: "18px" }}>Đang xử lý...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagerTeacher;