import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { fetchTeachingAssignments } from "../api";
import axios from "axios";
import "../styles/ProfileTeacher.css";

function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [classesMap, setClassesMap] = useState({});
  const [activeSemester, setActiveSemester] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedClass, setSelectedClass] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState(null);
  const [sortOrder, setSortOrder] = useState("asc");

  // 🔹 Upload avatar
  const [avatarFile, setAvatarFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const normalizeString = (str) =>
    str?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() || "";

  const filteredStudents = useMemo(() => {
    if (!selectedClass?.students) return [];
    let students = [...selectedClass.students];

    if (searchTerm) {
      const term = normalizeString(searchTerm);
      students = students.filter((s) => {
        const username = normalizeString(s.username);
        const name = normalizeString(s.name);
        return username.includes(term) || name.includes(term);
      });
    }

    if (sortField) {
      students.sort((a, b) => {
        const getLastName = (fullName) =>
          normalizeString(fullName.trim().split(" ").slice(-1)[0]);

        const valA =
          sortField === "name" ? getLastName(a.name) : normalizeString(a[sortField]);
        const valB =
          sortField === "name" ? getLastName(b.name) : normalizeString(b[sortField]);

        if (valA < valB) return sortOrder === "asc" ? -1 : 1;
        if (valA > valB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    return students;
  }, [selectedClass, searchTerm, sortField, sortOrder]);

  useEffect(() => {
    const storedUser = localStorage.getItem("app_user");
    if (!storedUser) {
      navigate("/login");
      return;
    }

    let userInfo;
    try {
      userInfo = JSON.parse(storedUser);
      setUser(userInfo);
    } catch {
      localStorage.removeItem("app_user");
      navigate("/login");
      return;
    }

    if (userInfo.role !== "teacher") {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        const [assignData, classesRes, semestersRes] = await Promise.all([
          fetchTeachingAssignments(userInfo._id),
          axios.get("http://localhost:5000/api/classes", {
            params: { userId: userInfo._id, role: userInfo.role },
          }),
          axios.get("http://localhost:5000/api/semesters"),
        ]);

        setAssignments(assignData);

        const classesObj = {};
        classesRes.data.forEach((cls) => {
          classesObj[cls._id] = cls;
        });
        setClassesMap(classesObj);

        const active = semestersRes.data.find((s) => s.isActive);
        setActiveSemester(active || null);
      } catch (err) {
        setError("Không thể tải dữ liệu phân công hoặc lớp học");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  const handleClassClick = (classId) => {
    const cls = classesMap[classId];
    if (cls) setSelectedClass(cls);
  };

  const closeStudentList = () => {
    setSelectedClass(null);
    setSearchTerm("");
    setSortField(null);
    setSortOrder("asc");
  };

  // 🔹 Xử lý chọn file avatar
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setAvatarFile(file);
    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploading(true);
      const res = await axios.post(
        `http://localhost:5000/api/users/upload-avatar`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (res.data?.imageUrl) {
        // Update local user state
        const updatedUser = { ...user, avatarUrl: res.data.imageUrl };
        setUser(updatedUser);
        localStorage.setItem("app_user", JSON.stringify(updatedUser));
        alert("Cập nhật ảnh đại diện thành công!");
      }
    } catch (err) {
      console.error(err);
      alert("Upload ảnh thất bại!");
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="loading">Đang tải dữ liệu...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="teacher-profile-page">
      <div className="page-header">
        <h2>Hồ sơ giảng viên</h2>
        <p>Thông tin cá nhân & phân công giảng dạy</p>
      </div>

      <div className="profile-card">
        <div className="avatar-block">
          <div className="avatar-circle">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="avatar-img"
              />
            ) : (
              user?.name?.[0]?.toUpperCase() || "T"
            )}
          </div>

          {/* Nút chỉnh sửa ảnh */}
          <label className="btn-edit-avatar">
            {uploading ? "Đang tải..." : "Chỉnh sửa ảnh"}
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleAvatarChange}
            />
          </label>
        </div>

        <div className="profile-info">
          <h3>{user?.name || "Giảng viên"}</h3>
          <p>
            <strong>Tài khoản:</strong> {user?.username}
          </p>
          <p>
            <strong>Vai trò:</strong> Giảng viên
          </p>
          {activeSemester && (
            <p>
              <strong>Học kỳ hiện tại:</strong> {activeSemester.name} (
              {new Date(activeSemester.startDate).toLocaleDateString("vi-VN")} –{" "}
              {new Date(activeSemester.endDate).toLocaleDateString("vi-VN")})
            </p>
          )}
        </div>
      </div>

      <div className="assignments-section">
        <h3>Phân công giảng dạy</h3>

        {assignments.length === 0 ? (
          <div className="empty-state">
            <p>Chưa được phân công lớp học nào trong học kỳ hiện tại.</p>
          </div>
        ) : (
          <div className="assignment-grid">
            {assignments.map((item) => {
              const classId = item.class?._id || item.class;
              const classInfo = classesMap[classId];
              const studentCount = classInfo?.students?.length || 0;

              if (
                activeSemester &&
                classInfo?.semester?._id !== activeSemester._id &&
                classInfo?.semester !== activeSemester._id
              ) {
                return null;
              }

              return (
                <div
                  key={item._id}
                  className="assignment-card"
                  onClick={() => handleClassClick(classId)}
                  style={{ cursor: "pointer" }}
                >
                  <p>
                    <strong>Môn học:</strong> {item.subject?.name || "Chưa xác định"}
                  </p>
                  <p>
                    <strong>Lớp học:</strong> {item.class?.className || "Chưa có lớp"}
                  </p>
                  <p>
                    <strong>Sĩ số sinh viên:</strong> {studentCount}
                  </p>
                  <p>
                    <strong>Học kỳ:</strong> {classInfo?.semester?.name || "Không xác định"}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedClass && (
        <div className="student-modal-overlay" onClick={closeStudentList}>
          <div className="student-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Thông tin lớp học</h3>
              <button className="close-modal-btn" onClick={closeStudentList}>
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="class-info">
                <p>
                  <strong>Tên lớp:</strong> {selectedClass.className}
                </p>
                <p>
                  <strong>Môn học:</strong>{" "}
                  {assignments.find(
                    (a) =>
                      a.class?._id === selectedClass._id ||
                      a.class === selectedClass._id
                  )?.subject?.name || "Chưa xác định"}
                </p>
                <p>
                  <strong>Học kỳ:</strong>{" "}
                  {selectedClass.semester?.name || "Không xác định"}
                </p>
                <p>
                  <strong>Số lượng sinh viên:</strong>{" "}
                  {selectedClass.students?.length || 0} sinh viên
                </p>
              </div>

              <div className="search-sort-bar">
                <input
                  type="text"
                  placeholder="🔍 Tìm sinh viên theo mã hoặc họ tên..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="student-table-wrapper">
                {filteredStudents.length > 0 ? (
                  <table className="student-table">
                    <thead>
                      <tr>
                        <th>STT</th>
                        <th
                          onClick={() => handleSort("username")}
                          className={`sortable ${
                            sortField === "username" ? "active" : ""
                          }`}
                        >
                          Mã sinh viên{" "}
                          {sortField === "username"
                            ? sortOrder === "asc"
                              ? "▲"
                              : "▼"
                            : ""}
                        </th>
                        <th
                          onClick={() => handleSort("name")}
                          className={`sortable ${sortField === "name" ? "active" : ""}`}
                        >
                          Họ và tên{" "}
                          {sortField === "name"
                            ? sortOrder === "asc"
                              ? "▲"
                              : "▼"
                            : ""}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((student, index) => (
                        <tr key={student._id || index}>
                          <td>{index + 1}</td>
                          <td>{student.username}</td>
                          <td>{student.name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="no-students">Không tìm thấy sinh viên nào.</p>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-close" onClick={closeStudentList}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
