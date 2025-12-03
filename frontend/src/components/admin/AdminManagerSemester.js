import React, { useEffect, useState } from "react";
import axios from "axios";
import "../../styles/AdminManagerSemester.css";

const API_BASE = "https://khoaluantotnghiep-5ff3.onrender.com/api";

function AdminManagerSemester() {
  const [semesters, setSemesters] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingSemester, setEditingSemester] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    startDate: "", // YYYY-MM-DD (cho input date)
    endDate: "",   // YYYY-MM-DD
    isActive: false,
  });

  // Format Date → "01/09/2024"
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  };

  useEffect(() => {
    fetchSemesters();
  }, []);

  const fetchSemesters = async () => {
    try {
      const res = await axios.get(`${API_BASE}/semesters`);
      setSemesters(res.data);
    } catch (err) {
      alert("Lỗi tải danh sách học kỳ!");
    }
  };

  const openModal = (semester = null) => {
    setEditingSemester(semester);
    if (semester) {
      setFormData({
        name: semester.name,
        startDate: semester.startDate.split("T")[0], // YYYY-MM-DD
        endDate: semester.endDate.split("T")[0],     // YYYY-MM-DD
        isActive: semester.isActive,
      });
    } else {
      setFormData({
        name: "",
        startDate: "",
        endDate: "",
        isActive: false,
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSemester(null);
    setFormData({ name: "", startDate: "", endDate: "", isActive: false });
  };

const handleSubmit = async () => {
  if (!formData.name.trim()) {
    return alert("Vui lòng nhập tên học kỳ!");
  }
  if (!formData.startDate || !formData.endDate) {
    return alert("Vui lòng chọn ngày bắt đầu và kết thúc!");
  }
  
  const start = new Date(formData.startDate);
  const end = new Date(formData.endDate);
  
  if (start >= end) {
    return alert("Ngày bắt đầu phải trước ngày kết thúc!");
  }

  // Nếu đánh dấu active, kiểm tra ngày hôm nay nằm trong khoảng (fix timezone)
  if (formData.isActive) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startCheckDate = new Date(formData.startDate);
    startCheckDate.setHours(0, 0, 0, 0);
    const endCheckDate = new Date(formData.endDate);
    endCheckDate.setHours(0, 0, 0, 0);
    
    if (today < startCheckDate || today > endCheckDate) {
      return alert("Không thể đặt học kỳ này là kỳ hiện tại vì ngày hôm nay không nằm trong thời gian mở của học kỳ!");
    }
  }

  // Kiểm tra khoảng thời gian mở không trùng với các học kỳ khác (strict check)
  const overlap = semesters.some((sem) => {
    // Bỏ qua nếu đang chỉnh sửa học kỳ hiện tại
    if (editingSemester && sem._id === editingSemester._id) return false;

    const semStart = new Date(sem.startDate);
    const semEnd = new Date(sem.endDate);

    // Kiểm tra có chồng lấn không (strict: không cho phép chỉ chạm tới)
    return (start < semEnd && end > semStart);
  });

  if (overlap) {
    return alert("Khoảng thời gian của học kỳ này trùng lặp với học kỳ khác. Vui lòng chọn lại!");
  }

  const payload = {
    name: formData.name.trim(),
    startDate: new Date(formData.startDate).toISOString(),
    endDate: new Date(formData.endDate).toISOString(),
    isActive: formData.isActive,
  };

  try {
    if (editingSemester) {
      await axios.put(`${API_BASE}/semesters/${editingSemester._id}`, payload);
      alert("Cập nhật học kỳ thành công!");
    } else {
      await axios.post(`${API_BASE}/semesters`, payload);
      alert("Tạo học kỳ thành công!");
    }
    closeModal();
    fetchSemesters();
  } catch (err) {
    alert(err.response?.data?.message || "Lỗi khi lưu học kỳ!");
  }
};



  const handleDelete = async (id) => {
    if (!window.confirm("Xóa học kỳ này? Các lớp liên quan sẽ bị ảnh hưởng!")) return;
    try {
      await axios.delete(`${API_BASE}/semesters/${id}`);
      alert("Xóa thành công!");
      fetchSemesters();
    } catch (err) {
      alert(err.response?.data?.message || "Không thể xóa (đang có lớp sử dụng)");
    }
  };

  return (
    <div className="admin-semester-container">
      <div className="header">
        <h2>Quản lý học kỳ</h2>
        <button className="add-btn" onClick={() => openModal()}>
          Thêm học kỳ mới
        </button>
      </div>

      <div className="semester-grid">
        {semesters.length === 0 ? (
          <p className="no-data">Chưa có học kỳ nào. Hãy tạo học kỳ đầu tiên!</p>
        ) : (
          semesters.map((sem) => (
            <div
              key={sem._id}
              className={`semester-card ${sem.isActive ? "active" : ""}`}
            >
              <div className="card-header">
                <h3>{sem.name}</h3>
                {sem.isActive && <span className="badge active">Kỳ hiện tại</span>}
              </div>
              <div className="card-body">
                <p>
                  <strong>Từ:</strong> {formatDate(sem.startDate)}
                </p>
                <p>
                  <strong>Đến:</strong> {formatDate(sem.endDate)}
                </p>
              </div>
              <div className="card-actions">
                <button onClick={() => openModal(sem)} className="btn-edit">
                  Sửa
                </button>
                <button onClick={() => handleDelete(sem._id)} className="btn-delete">
                  Xóa
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingSemester ? "Sửa học kỳ" : "Thêm học kỳ mới"}</h3>

            <div className="form-group">
              <label>Tên học kỳ</label>
              <input
                type="text"
                placeholder="VD: Học kỳ 1 2024-2025"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Ngày bắt đầu</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
              <small className="date-hint">
                Bạn chọn: <strong>{formData.startDate ? formatDate(formData.startDate) : "Chưa chọn"}</strong>
              </small>
            </div>

            <div className="form-group">
              <label>Ngày kết thúc</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
              <small className="date-hint">
                Bạn chọn: <strong>{formData.endDate ? formatDate(formData.endDate) : "Chưa chọn"}</strong>
              </small>
            </div>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
              Đánh dấu là kỳ hiện tại (chỉ 1 kỳ được active)
            </label>

            <div className="modal-actions">
              <button onClick={closeModal} className="btn-cancel">
                Hủy
              </button>
              <button onClick={handleSubmit} className="btn-confirm">
                {editingSemester ? "Cập nhật" : "Tạo mới"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminManagerSemester;