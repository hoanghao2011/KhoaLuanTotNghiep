import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Sidebar.css";

function Sidebar({ user, onLogout }) {
  const navigate = useNavigate();
  const currentUser = user || JSON.parse(localStorage.getItem("app_user") || "{}");

  // Modal đổi mật khẩu
  const [showModal, setShowModal] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError("");

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError("Vui lòng nhập đầy đủ thông tin");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Mật khẩu mới không khớp");
      return;
    }

    if (newPassword.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`https://khoaluantotnghiep-5ff3.onrender.com/api/users/${currentUser._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        alert("Đổi mật khẩu thành công! Vui lòng đăng nhập lại.");
        setShowModal(false);
        onLogout();
      } else {
        setError(data.message || "Không thể đổi mật khẩu");
      }
    } catch (err) {
      setError("Lỗi kết nối server");
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
  };

  return (
    <div className="sidebar">

<h2 className="sidebar-title">
  <div className="title-role">
    {currentUser?.role === "teacher"
      ? "Dashboard giảng viên"
      : currentUser?.role === "student"
      ? "Dashboard sinh viên"
      : currentUser?.role === "admin"
      ? "Dashboard quản trị viên"
      : "Dashboard"}
  </div>
  {currentUser?.name && (
    <div>

      
    <div className="title-name">
      {currentUser.name}
    </div>

<div className="user-avatar-container">
            {currentUser?.avatarUrl ? (
              <img 
                src={currentUser.avatarUrl} 
                alt={currentUser.name} 
                className="user-avatar"
              />
            ) : (
              <div className="avatar-placeholder">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
          </div>
        </div>

  )}
</h2>
      <div className="menu-container">
        <ul>
          {currentUser?.role === "teacher" && (
            <>
              <li onClick={() => navigate("/categories")}>Tạo danh mục</li>
              <li onClick={() => navigate("/practice-exam")}>Tạo đề luyện tập</li>
              <li onClick={() => navigate("/test-exam")}>Tạo đề kiểm tra</li>
              <li onClick={() => navigate("/reports")}>Thống kê & báo cáo</li>
              <li onClick={() => navigate("/profile")}>Hồ sơ cá nhân</li>
            </>
          )}
          {currentUser?.role === "student" && (
            <>
              <li onClick={() => navigate("/student")}>Trang học viên</li>
              <li onClick={() => navigate("/myExams")}>Bài luyện tập</li>
              <li onClick={() => navigate("/myTest")}>Bài kiểm tra</li>
            </>
          )}
          {currentUser?.role === "admin" && (
            <>
              <li onClick={() => navigate("/admin/classes")}>Quản lý lớp học</li>
              <li onClick={() => navigate("/admin/teachers")}>Quản lý giảng viên</li>
              <li onClick={() => navigate("/admin/students")}>Quản lý sinh viên</li>
              <li onClick={() => navigate("/admin/subjects")}>Quản lý môn học</li>
              <li onClick={() => navigate("/admin/semesters")}>Quản lý học kỳ</li>
            </>
          )}
        </ul>
      </div>

      {/* NÚT ĐỔI MẬT KHẨU */}
      {(currentUser?.role === "teacher" || currentUser?.role === "student") && (
        <button onClick={() => setShowModal(true)} className="btn-change-password">
          Đổi mật khẩu
        </button>
      )}

      {/* NÚT ĐĂNG XUẤT */}
      <button
        onClick={() => {
          localStorage.removeItem("app_user");
          onLogout();
          navigate("/login");
        }}
        className="btn-logout"
      >
        Đăng xuất
      </button>

      {/* MODAL ĐỔI MẬT KHẨU */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Đổi mật khẩu</h3>
            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label>Mật khẩu cũ</label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Mật khẩu mới</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Nhập lại mật khẩu mới</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              {error && <p className="error-text">{error}</p>}

              <div className="modal-actions">
                <button type="button" onClick={closeModal} className="btn-cancel">
                  Hủy
                </button>
                <button type="submit" disabled={loading} className="btn-confirm">
                  {loading ? "Đang xử lý..." : "Xác nhận"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Sidebar;