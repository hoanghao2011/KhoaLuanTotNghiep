import React, { useEffect, useState, useMemo, useRef } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import "../../styles/AdminManagerClass.css";

const API_BASE = "https://khoaluantotnghiep-5ff3.onrender.com/api";

function AdminManagerClass() {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [semesters, setSemesters] = useState([]);

  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showAddClassModal, setShowAddClassModal] = useState(false);

  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [newClassName, setNewClassName] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [maxStudents, setMaxStudents] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState("all");
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
const [classToDelete, setClassToDelete] = useState(null);
const [hasPracticeExam, setHasPracticeExam] = useState(false);

  const [importPreview, setImportPreview] = useState([]);
  const fileInputExcelRef = useRef(null);

  const [conflictError, setConflictError] = useState("");
const [notifyModal, setNotifyModal] = useState({
  open: false,
  type: "success", // success | error
  message: "",
});

  const normalizeString = (str) =>
    str?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() || "";

  useEffect(() => {
    fetchAllData();
  }, []);
const showNotify = (message, type = "error") => {
  setNotifyModal({ open: true, type, message });
};

  const fetchAllData = async () => {
    try {
      const [classRes, userRes, subjectRes, assignRes, semesterRes] = await Promise.all([
        axios.get(`${API_BASE}/classes`),
        axios.get(`${API_BASE}/users`),
        axios.get(`${API_BASE}/subjects`),
        axios.get(`${API_BASE}/teaching-assignments`),
        axios.get(`${API_BASE}/semesters`),
      ]);

const classesWithInfo = classRes.data.map((cls) => {
  const assign = assignRes.data.find(
    (a) => a.class?._id === cls._id && a.subject && a.teacher
  );

  return {
    ...cls,
    subject: assign?.subject || null,
    teacher: assign?.teacher || null,
    semester: cls.semester || null,
  };
});


      setClasses(classesWithInfo);
      setUsers(userRes.data);
      setSubjects(subjectRes.data);
      setAssignments(assignRes.data);
      setSemesters(semesterRes.data);
    } catch (err) {
      console.error("Lỗi lấy dữ liệu:", err);
      showNotify("Không thể tải dữ liệu!", "error");

    }
  };

  // Tự động chọn học kỳ hiện tại
  const activeSemesterId = useMemo(() => {
    return semesters.find(s => s.isActive)?._id || "";
  }, [semesters]);

  const teachers = users.filter((u) => u.role === "teacher");
  const students = users.filter((u) => u.role === "student");

  const getTeachersForSubject = (subjectId) => {
    if (!subjectId) return [];
    const teacherAssignments = assignments
      .filter((a) => a.subject?._id === subjectId && a.teacher?._id)
      .map((a) => ({ _id: a.teacher._id, name: a.teacher.name }));
    return Array.from(new Map(teacherAssignments.map((t) => [t._id, t])).values());
  };

  const handleAddClass = async () => {
if (!newClassName.trim()) {
  return setNotifyModal({
    open: true,
    type: "error",
    message: "Nhập tên lớp!"
  });
}    if (!selectedSubject) return alert("Chọn môn học!");
    if (!selectedSemester) return alert("Chọn học kỳ!");
    if (!selectedTeacher) return alert("Chọn giảng viên!");
    if (!maxStudents || maxStudents <= 0) return alert("Nhập số lượng SV hợp lệ!");

    try {
      await axios.post(`${API_BASE}/classes`, {
        className: newClassName.trim(),
        subject: selectedSubject,
        teacher: selectedTeacher,
        semester: selectedSemester,
        maxStudents: Number(maxStudents),
      });
      fetchAllData();
      resetAddModal();
setNotifyModal({
  open: true,
  type: "success",
  message: "Tạo lớp thành công!"
});
    } catch (err) {
      alert(err.response?.data?.message || "Lỗi tạo lớp!");
    }
  };

  const resetAddModal = () => {
    setNewClassName("");
    setSelectedSubject("");
    setSelectedTeacher("");
    setSelectedSemester(activeSemesterId);
    setMaxStudents("");
    setShowAddClassModal(false);
  };

const handleDeleteClick = async (cls) => {
  try {
    const res = await axios.get(`${API_BASE}/practice-exams?classId=${cls._id}`);
    setHasPracticeExam(res.data.length > 0);
    setClassToDelete(cls);
    setShowDeleteConfirm(true);
  } catch (err) {
    setNotifyModal({
      open: true,
      type: "error",
      message: "Không thể kiểm tra đề luyện tập!"
    });
  }
};

const confirmDelete = async () => {
  try {
    await axios.delete(`${API_BASE}/classes/${classToDelete._id}`);
    fetchAllData();
    alert("Xóa lớp và dữ liệu liên quan thành công!");
  } catch (err) {
    alert("Không thể xóa lớp!");
  } finally {
    setShowDeleteConfirm(false);
    setClassToDelete(null);
  }
};

const cancelDelete = () => {
  setShowDeleteConfirm(false);
  setClassToDelete(null);
};


// MỞ MODAL PHÂN SV
const openStudentModal = async (cls) => {
  setSelectedClass(cls);
  setConflictError("");
  setImportPreview([]);
  if (fileInputExcelRef.current) fileInputExcelRef.current.value = "";

  const currentStudents = cls.students?.map(s => s._id) || [];
  const subjectId = cls.subject?._id || cls.subject;

  const otherClassesSameSubject = classes.filter(
    c => (c.subject?._id || c.subject) === subjectId && c._id !== cls._id
  );

  const conflictMap = new Map();
  otherClassesSameSubject.forEach(otherClass => {
    otherClass.students?.forEach(s => {
      const studentId = s._id;
      if (!conflictMap.has(studentId)) {
        conflictMap.set(studentId, {
          name: s.name,
          className: otherClass.className,
          subjectId: otherClass.subject?._id || otherClass.subject
        });
      }
    });
  });

  // Lọc ra các SV hợp lệ (không trùng môn)
  const validStudentIds = currentStudents.filter(id => !conflictMap.has(id));
  setSelectedStudents(validStudentIds);

  // Tạo cảnh báo trùng môn học
  if (conflictMap.size > 0) {
    const warnings = Array.from(conflictMap.values())
      .slice(0, 5)
      .map(info => {
        const subjectObj = subjects.find(sub => sub._id === info.subjectId);
        const subjectName = subjectObj ? subjectObj.name : "Môn học";
        return `${info.name} đã học môn "${subjectName}" ở lớp ${info.className}`;
      })
      .join("\n");

    setConflictError(warnings + (conflictMap.size > 5 ? `\n... và ${conflictMap.size - 5} sinh viên khác.` : ""));
  }

  setShowStudentModal(true);
};


  const handleAssignStudents = async () => {
    const currentClass = classes.find((c) => c._id === selectedClass._id);
    const maxAllowed = currentClass?.maxStudents || 0;

    if (selectedStudents.length > maxAllowed) {
      alert(`Không thể chọn quá ${maxAllowed} sinh viên!`);
      return;
    }

    try {
      await axios.put(`${API_BASE}/classes/${selectedClass._id}`, {
        students: selectedStudents,
      });
      alert("Phân công SV thành công!");
      setShowStudentModal(false);
      fetchAllData();
    } catch (err) {
      const msg = err.response?.data?.message || "Không thể phân công!";
      setConflictError(msg);
      alert(msg);
    }
  };

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

const getSortArrow = (key) => {
  if (sortConfig.key !== key) return "⇅";
  return sortConfig.direction === "asc" ? "▲" : "▼";
};

  // Filter + Sort classes
  const filteredClasses = useMemo(() => {
    const term = normalizeString(searchTerm);

    return classes
      .filter((cls) => {
        const className = normalizeString(cls.className);
        const subjectName = normalizeString(
          subjects.find((s) => s._id === (cls.subject?._id || cls.subject))?.name || ""
        );
        const teacherName = normalizeString(
          users.find((u) => u._id === (cls.teacher?._id || cls.teacher))?.name || ""
        );
        const semesterName = normalizeString(
          semesters.find((s) => s._id === (cls.semester?._id || cls.semester))?.name || ""
        );

        if (filterBy === "className") return className.includes(term);
        if (filterBy === "subject") return subjectName.includes(term);
        if (filterBy === "teacher") return teacherName.includes(term);
        if (filterBy === "semester") return semesterName.includes(term);
        return className.includes(term) || subjectName.includes(term) || teacherName.includes(term) || semesterName.includes(term);
      })
      .sort((a, b) => {
        if (!sortConfig.key) return 0;
        let aVal = "", bVal = "";

        if (sortConfig.key === "className") {
          aVal = normalizeString(a.className);
          bVal = normalizeString(b.className);
        } else if (sortConfig.key === "subject") {
          aVal = normalizeString(subjects.find((s) => s._id === (a.subject?._id || a.subject))?.name || "");
          bVal = normalizeString(subjects.find((s) => s._id === (b.subject?._id || b.subject))?.name || "");
        } else if (sortConfig.key === "teacher") {
          aVal = normalizeString(users.find((u) => u._id === (a.teacher?._id || a.teacher))?.name || "");
          bVal = normalizeString(users.find((u) => u._id === (b.teacher?._id || b.teacher))?.name || "");
        } else if (sortConfig.key === "semester") {
          aVal = normalizeString(semesters.find((s) => s._id === (a.semester?._id || a.semester))?.name || "");
          bVal = normalizeString(semesters.find((s) => s._id === (b.semester?._id || b.semester))?.name || "");
        } else if (sortConfig.key === "students") {
          aVal = a.students?.length || 0;
          bVal = b.students?.length || 0;
        }

        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
  }, [classes, subjects, users, semesters, searchTerm, filterBy, sortConfig]);

  const filteredStudents = useMemo(() => {
    const term = normalizeString(studentSearch);
    const subjectId = selectedClass?.subject?._id || selectedClass?.subject;

    return students
      .filter((s) => {
        const matchesSearch = normalizeString(s.name).includes(term) || normalizeString(s.username).includes(term);
        if (!matchesSearch) return false;

        if (!subjectId || !showStudentModal) return true;

        const isInOtherClass = classes.some(
          (c) => c.subject?._id === subjectId && c._id !== selectedClass._id && c.students?.some((st) => st._id === s._id)
        );

        return !isInOtherClass;
      })
      .sort((a, b) => a.username.localeCompare(b.username));
  }, [students, studentSearch, selectedClass, classes, showStudentModal]);

  // ==================== IMPORT EXCEL ====================
  const handleExcelFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: "binary" });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

      const rows = data.slice(1);
      const studentsFromExcel = rows
        .map((row, idx) => {
          const username = String(row[0] || "").trim();
          const name = String(row[1] || "").trim();
          if (!username || !name) return null;
          return { username, name, row: idx + 2 };
        })
        .filter(Boolean);

      setImportPreview(studentsFromExcel);
    };
    reader.readAsBinaryString(file);
  };

const handleConfirmImport = () => {
  if (!selectedClass) return;

  const subjectId = selectedClass?.subject?._id || selectedClass?.subject;
  const currentClassId = selectedClass._id;
  const max = selectedClass?.maxStudents || 0;

  const errors = []; // lưu lỗi
  const validStudentIds = [];

  importPreview.forEach((s) => {
    // Tìm SV trong danh sách users
    const user = students.find(
      (u) => u.username === s.username && u.name === s.name
    );

    if (!user) {
      errors.push(`Không tìm thấy SV: ${s.username} - ${s.name} (dòng ${s.row})`);
      return;
    }

    // Kiểm tra xem SV đã học môn này ở lớp khác chưa
    const isInOtherClass = classes.some(
      (c) =>
        c._id !== currentClassId &&
        (c.subject?._id || c.subject) === subjectId &&
        c.students?.some((st) => st._id === user._id)
    );

    if (isInOtherClass) {
      errors.push(`SV ${user.username} - ${user.name} đã học môn này ở lớp khác!`);
      return;
    }

    validStudentIds.push(user._id);
  });

if (errors.length > 0) {
  setNotifyModal({
    open: true,
    type: "error",
    message: errors.join("\n")
  });
  return;
}


  // Merge với danh sách đã chọn
  const merged = Array.from(new Set([...selectedStudents, ...validStudentIds]));

if (merged.length > max) {
  setNotifyModal({
    open: true,
    type: "error",
    message: `Tổng SV (${merged.length}) vượt quá giới hạn ${max}!`
  });
  return;
}


  setSelectedStudents(merged);
  setImportPreview([]);
  if (fileInputExcelRef.current) fileInputExcelRef.current.value = "";
};


  const downloadStudentTemplate = () => {
    const wb = XLSX.utils.book_new();
    const wsData = [
      ["Mã SV (username)", "Họ tên (name)"],
      ["20120001", "Nguyễn Văn A"],
      ["20120002", "Trần Thị B"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 15 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, ws, "DanhSachSV");
    XLSX.writeFile(wb, "Mau_Import_SinhVien.xlsx");
  };

  return (
    <div className="admin-classes-container">
      <h2>Quản lý lớp học</h2>

      <div className="add-class-section">
        <button className="add-btn" onClick={() => { setSelectedSemester(activeSemesterId); setShowAddClassModal(true); }}>
          Thêm lớp mới
        </button>
      </div>

      <div className="search-filter">
        <input
          placeholder="Tìm kiếm lớp, môn, GV, học kỳ..."
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select value={filterBy} onChange={(e) => setFilterBy(e.target.value)}>
          <option value="all">Tất cả</option>
          <option value="className">Tên lớp</option>
          <option value="subject">Môn học</option>
          <option value="teacher">Giảng viên</option>
          <option value="semester">Học kỳ</option>
        </select>
      </div>

<table className="classes-table">
  <thead>
    <tr>
      <th onClick={() => handleSort("subject")}>
        Môn học {getSortArrow("subject")}
      </th>
      <th onClick={() => handleSort("className")}>
        Tên lớp {getSortArrow("className")}
      </th>
      <th onClick={() => handleSort("semester")}>
        Học kỳ {getSortArrow("semester")}
      </th>
      <th onClick={() => handleSort("teacher")}>
        Giảng viên {getSortArrow("teacher")}
      </th>
      <th onClick={() => handleSort("students")}>
        Số SV {getSortArrow("students")}
      </th>
      <th>Hành động</th>
    </tr>
  </thead>
  <tbody>
    {filteredClasses.length === 0 ? (
      <tr>
        <td colSpan="6" style={{ textAlign: "center", color: "#999" }}>
          Chưa có lớp nào
        </td>
      </tr>
    ) : (
      filteredClasses.map((cls) => {
        const subjectName =
          subjects.find((s) => s._id === (cls.subject?._id || cls.subject))
            ?.name || "Chưa gắn";
        const teacher = users.find(
          (u) => u._id === (cls.teacher?._id || cls.teacher)
        );
        const teacherName = teacher?.name || "Chưa gắn";
        const teacherAvatar = teacher?.avatar || ""; //
        const semesterName =
          semesters.find((s) => s._id === (cls.semester?._id || cls.semester))
            ?.name || "Chưa gắn";

        return (
          <tr key={cls._id}>
            <td>{subjectName}</td>
            <td>
              <span>{cls.className}</span>

            </td>
            <td>{semesterName}</td>
            <td>
              <div className="teacher-info">
                {teacherAvatar && (
                  <img
                    src={teacherAvatar}
                    alt={teacherName}
                    className="teacher-avatar"
                  />
                )}
                <span>{teacherName}</span>
              </div>
            </td>
            <td>
              {cls.students?.length || 0}/{cls.maxStudents || 0}
            </td>
            <td className="action-buttons">
              <button onClick={() => openStudentModal(cls)}>Phân SV</button>
<button className="delete" onClick={() => handleDeleteClick(cls)}>
  Xóa
</button>
            </td>
          </tr>
        );
      })
    )}
  </tbody>
</table>

{showDeleteConfirm && (
  <div className="modal">
    <div className="modal-content" style={{ position: "relative", maxWidth: "420px" }}>
      <h3 style={{ textAlign: "center", marginBottom: "10px" }}>Xác nhận xoá lớp</h3>

      <p style={{ fontSize: "16px", textAlign: "center" }}>
        Bạn có chắc muốn xoá lớp
        <br />
        <strong style={{ color: "#d32f2f" }}>{classToDelete?.className}</strong>?
      </p>

      {hasPracticeExam && (
        <div style={{
          background: "#ffebee",
          padding: "10px",
          borderRadius: "6px",
          margin: "15px 0",
          color: "#b71c1c",
          border: "1px solid #ffcdd2",
          fontSize: "14px"
        }}>
          ⚠ Xoá sẽ xoá mất toàn bộ thông tin liên quan đến lớp này!
          <br />
        </div>
      )}

      <div className="modal-actions">
        <button
          onClick={confirmDelete}
          style={{ background: "#d9534f", color: "#fff" }}
        >
          Xoá lớp
        </button>

        <button
          onClick={cancelDelete}
          style={{ background: "#455a64", color: "#fff" }}
        >
          Hủy
        </button>
      </div>
    </div>
  </div>
)}


      {/* Modal thêm lớp */}
{showAddClassModal && (
  <div className="modal">
    <div className="modal-content" style={{ position: "relative" }}>

      <h3>Thêm lớp mới</h3>

            <input type="text" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder="VD: Lớp KTPM17A" />
            <select value={selectedSubject} onChange={(e) => { setSelectedSubject(e.target.value); setSelectedTeacher(""); }}>
              <option value="">-- Chọn môn --</option>
              {subjects.map((s) => (
                <option key={s._id} value={s._id}>{s.name}</option>
              ))}
            </select>

            <select value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)}>
              <option value="">-- Chọn học kỳ --</option>
              {semesters.map((sem) => (
                <option key={sem._id} value={sem._id}>
                  {sem.name} {sem.isActive && "(Kỳ hiện tại)"}
                </option>
              ))}
            </select>

            <select value={selectedTeacher} onChange={(e) => setSelectedTeacher(e.target.value)} disabled={!selectedSubject}>
              <option value="">-- Chọn giảng viên --</option>
              {getTeachersForSubject(selectedSubject).length > 0 ? (
                getTeachersForSubject(selectedSubject).map((t) => (
                  <option key={t._id} value={t._id}>{t.name}</option>
                ))
              ) : (
                <option disabled>Không có GV dạy môn này</option>
              )}
            </select>

            <input type="number" value={maxStudents} onChange={(e) => setMaxStudents(e.target.value)} placeholder="Số lượng SV tối đa" />
            <div className="modal-actions">
              <button onClick={handleAddClass}>Xác nhận</button>
              <button onClick={resetAddModal}>Hủy</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal phân SV */}
{showStudentModal && (
  <div className="modal">
    <div className="modal-content modal-large" style={{ position: "relative" }}>



<h3 style={{ textAlign: "center", marginBottom: "10px" }}>
  Phân công sinh viên cho <span style={{ color: "#1a73e8" }}>{selectedClass?.className}</span>
</h3>

<div
  style={{
    display: "flex",
    justifyContent: "center",
    gap: "10px",
    marginBottom: "15px",
  }}
>
  <button
    onClick={() => fileInputExcelRef.current?.click()}
    style={{
      fontSize: "13px",
      padding: "6px 12px",
      background: "#0d6efd",
      color: "white",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
    }}
  >
    Import Excel
  </button>

  <button
    onClick={downloadStudentTemplate}
    style={{
      fontSize: "13px",
      padding: "6px 12px",
      background: "#6c757d",
      color: "white",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
    }}
  >
    Tải mẫu
  </button>
</div>


            <input
              ref={fileInputExcelRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleExcelFileChange}
              style={{ display: "none" }}
            />

{importPreview.length > 0 && (
  <div className="import-preview-container">
    <div className="import-preview-header">
      <div className="preview-info">
        <strong>Preview import</strong>
        <span className="preview-count">({importPreview.length} sinh viên)</span>
      </div>
      <div className="preview-actions">
        <button
          className="confirm-import-btn"
          onClick={handleConfirmImport}
        >
          Xác nhận
        </button>
        <button
          className="cancel-import-btn"
          onClick={() => {
            setImportPreview([]);
            if (fileInputExcelRef.current) fileInputExcelRef.current.value = "";
          }}
        >
          Hủy
        </button>
      </div>
    </div>
    <div className="import-preview-list">
      {importPreview.map((student, index) => (
        <div key={index} className="preview-student-item">
          <div className="student-info">
            <span className="student-username">{student.username}</span>
            <span className="student-name"> - {student.name}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
)}

            {/* CẢNH BÁO TRÙNG MÔN */}
            {conflictError && (
              <div style={{
                background: "#ffebee",
                color: "#c62828",
                padding: "12px",
                borderRadius: "6px",
                marginBottom: "15px",
                fontSize: "14px",
                whiteSpace: "pre-line",
                border: "1px solid #ffcdd2"
              }}>
                <strong>Lưu ý:</strong><br />
                {conflictError}
              </div>
            )}

            <div style={{ marginBottom: "10px", fontSize: "14px", color: "#555" }}>
              Đã chọn: <strong>{selectedStudents.length}</strong> / Tối đa: <strong>{selectedClass?.maxStudents || 0}</strong>
              {selectedStudents.length > (selectedClass?.maxStudents || 0) && (
                <span style={{ color: "red", marginLeft: "8px" }}>(Vượt quá giới hạn!)</span>
              )}
            </div>

            <input
              type="text"
              placeholder="Tìm sinh viên..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              style={{ width: "100%", padding: "8px", marginBottom: "10px" }}
            />

            <div className="students-list">
              {filteredStudents.length === 0 ? (
                <p style={{ color: "#999", textAlign: "center", margin: "20px 0" }}>
                  {studentSearch ? "Không tìm thấy sinh viên" : "Tất cả sinh viên đã học môn này ở lớp khác"}
                </p>
              ) : (
                filteredStudents.map((s) => (
                  <label key={s._id} style={{ display: "flex", marginLeft: "25px", padding: "8px 0", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={selectedStudents.includes(s._id)}
                      onChange={(e) => {
                        setSelectedStudents((prev) =>
                          e.target.checked ? [...prev, s._id] : prev.filter((id) => id !== s._id)
                        );
                      }}
                    />
                    <strong>{s.name}</strong> ({s.username})
                  </label>
                ))
              )}
            </div>

            <div className="modal-actions">
              <button
                onClick={handleAssignStudents}
                disabled={selectedStudents.length > (selectedClass?.maxStudents || 0)}
                style={{
                  opacity: selectedStudents.length > (selectedClass?.maxStudents || 0) ? 0.5 : 1,
                  cursor: selectedStudents.length > (selectedClass?.maxStudents || 0) ? "not-allowed" : "pointer",
                }}
              >
                Xác nhận
              </button>
              <button onClick={() => { setShowStudentModal(false); setConflictError(""); setImportPreview([]); }}>
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
{notifyModal.open && (
  <div className="modal">
    <div className="modal-content notify-modal" style={{ position: "relative" }}>

      <button
        onClick={() => setNotifyModal({ ...notifyModal, open: false })}
        className="modal-close-btn"
      >
        ✖
      </button>

      <h3 style={{ color: notifyModal.type === "success" ? "#2e7d32" : "#d32f2f" }}>
        {notifyModal.type === "success" ? "Thành công" : "Lỗi"}
      </h3>
      <p style={{ fontSize: "16px", margin: "15px 0" }}>{notifyModal.message}</p>
      <div className="modal-actions">
        <button onClick={() => setNotifyModal({ ...notifyModal, open: false })}>
          Đóng
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  );
}

export default AdminManagerClass;