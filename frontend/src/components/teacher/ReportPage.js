import React, { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import * as XLSX from "xlsx";
import "../../styles/ReportPage.css";

const API_URL = "http://localhost:5000/api";

function ReportPage() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classData, setClassData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState("list"); // "list" hoặc "stats"
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);

  // Lấy danh sách lớp của giáo viên
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("app_user"));
        const response = await axios.get(`${API_URL}/test-exams/teacher/${user._id}/classes`);
        setClasses(response.data);
      } catch (err) {
        console.error("Error fetching classes:", err);
        Swal.fire("Lỗi!", "Không thể tải danh sách lớp.", "error");
      }
    };
    fetchClasses();
  }, []);

  // Lấy dữ liệu sinh viên và điểm khi chọn lớp
  const handleSelectClass = async (classId) => {
    setSelectedClass(classId);
    setLoading(true);
    setSelectedExam(null); // Reset exam selection when class changes
    try {
      const response = await axios.get(`${API_URL}/test-exams/class/${classId}/students-scores`);
      console.log("📊 Class data loaded:", response.data);
      setClassData(response.data);
      // Extract unique exams from classData
      if (response.data && response.data.exams && response.data.exams.length > 0) {
        setExams(response.data.exams);
      }
      setViewMode("list");
    } catch (err) {
      console.error("Error fetching class data:", err);
      Swal.fire("Lỗi!", "Không thể tải dữ liệu lớp.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Tính toán thống kê (lọc theo bài thi được chọn)
  const calculateStats = () => {
    if (!classData || !selectedExam) return null;

    const allScores = [];
    const studentAttempts = new Set();

    classData.students.forEach(student => {
      student.attempts.forEach(attempt => {
        // Chỉ tính những attempts của bài thi được chọn
        if (attempt.examId === selectedExam) {
          allScores.push(attempt.percentage || 0);
          studentAttempts.add(student.studentId);
        }
      });
    });

    // ✅ NEW: Convert to 10-point scale
    const avgScore = allScores.length > 0 ? parseFloat(((allScores.reduce((a, b) => a + b, 0) / allScores.length) / 10).toFixed(2)) : 0;

    return {
      totalStudents: studentAttempts.size,
      totalAttempts: allScores.length,
      avgScore
    };
  };

  // Dữ liệu biểu đồ điểm theo sinh viên (lọc theo bài thi)
  const getStudentScoreData = () => {
    if (!classData || !selectedExam) return [];

    return classData.students
      .map(student => {
        // Chỉ lấy attempts của bài thi được chọn
        const examAttempts = student.attempts.filter(a => a.examId === selectedExam);
        if (examAttempts.length === 0) return null;

        return {
          name: student.studentName,
          avgScore: examAttempts.length > 0
            ? parseFloat((examAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / examAttempts.length).toFixed(2))
            : 0,
          passed: examAttempts.filter(a => a.isPassed).length,
          total: examAttempts.length
        };
      })
      .filter(item => item !== null); // Loại bỏ sinh viên không có attempts cho bài thi này
  };

  // Thông tin về bài thi được chọn
  const getExamInfo = () => {
    if (!classData || !selectedExam) return null;

    const exam = classData.exams.find(e => e._id === selectedExam);
    const examAttempts = [];

    classData.students.forEach(student => {
      student.attempts.forEach(attempt => {
        if (attempt.examId === selectedExam) {
          examAttempts.push(attempt);
        }
      });
    });

    const avgScore = examAttempts.length > 0
      ? parseFloat((examAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / examAttempts.length).toFixed(2))
      : 0;

    const passRate = examAttempts.length > 0
      ? parseFloat(((examAttempts.filter(a => a.isPassed).length / examAttempts.length) * 100).toFixed(2))
      : 0;

    return {
      examTitle: exam?.title || "",
      avgScore,
      passRate,
      totalAttempts: examAttempts.length
    };
  };

  // Dữ liệu phân phối điểm (Pass/Fail, lọc theo bài thi)
  const getPassFailData = () => {
    if (!classData || !selectedExam) return [];

    let passed = 0, failed = 0;
    classData.students.forEach(student => {
      student.attempts.forEach(attempt => {
        // Chỉ tính attempts của bài thi được chọn
        if (attempt.examId === selectedExam) {
          if (attempt.isPassed) passed++;
          else failed++;
        }
      });
    });

    return [
      { name: "Đạt", value: passed, color: "#28a745" },
      { name: "Không đạt", value: failed, color: "#dc3545" }
    ];
  };

  // Dữ liệu phổ điểm (Score distribution - số lượng sinh viên, lọc theo bài thi)
  const getScoreDistribution = () => {
    if (!classData || !selectedExam) return [];

    const ranges = [
      { label: "1", min: 0, max: 10 },
      { label: "2", min: 10, max: 20 },
      { label: "3", min: 20, max: 30 },
      { label: "4", min: 30, max: 40 },
      { label: "5", min: 40, max: 50 },
      { label: "6", min: 50, max: 60 },
      { label: "7", min: 60, max: 70 },
      { label: "8", min: 70, max: 80 },
      { label: "9", min: 80, max: 90 },
      { label: "10", min: 90, max: 100 }
    ];

    return ranges.map((range, rangeIdx) => {
      // Đếm số sinh viên duy nhất có điểm rơi vào khoảng này (chỉ từ bài thi được chọn)
      const studentIds = new Set();
      classData.students.forEach(student => {
        student.attempts.forEach(attempt => {
          // Chỉ tính attempts của bài thi được chọn
          if (attempt.examId === selectedExam) {
            const score = attempt.percentage || 0;
            const isLastRange = rangeIdx === ranges.length - 1;

            // Nếu là range cuối (90-100), cho phép score = 100
            if (isLastRange) {
              if (score >= range.min && score <= range.max) {
                studentIds.add(student.studentId);
              }
            } else {
              // Các range khác: score >= min và score < max (để tránh overlap)
              if (score >= range.min && score < range.max) {
                studentIds.add(student.studentId);
              }
            }
          }
        });
      });
      return { label: range.label, count: studentIds.size };
    });
  };

  const stats = calculateStats();
  const studentScoreData = getStudentScoreData();
  const examInfo = getExamInfo();
  const passFailData = getPassFailData();
  const scoreDistribution = getScoreDistribution();

  // Debug logging
  console.log("📈 Stats:", stats);
  console.log("📊 Student Score Data:", studentScoreData);
  console.log("📉 Exam Info:", examInfo);
  console.log("🔄 Pass/Fail Data:", passFailData);
  console.log("📊 Score Distribution:", scoreDistribution);
  console.log("viewMode:", viewMode);
  console.log("classData exists:", !!classData);
  console.log("selectedExam:", selectedExam);
  console.log("stats.totalAttempts:", stats?.totalAttempts);

  // Hàm export kết quả ra Excel
  const exportToExcel = async () => {
    if (!classData || !selectedExam) {
      Swal.fire("Lỗi!", "Vui lòng chọn lớp và bài kiểm tra.", "error");
      return;
    }

    try {
      Swal.fire({
        title: "Đang xử lý...",
        html: "Đang chuẩn bị dữ liệu export...",
        allowOutsideClick: false,
        didOpen: async () => {
          Swal.showLoading();

          // Lấy danh sách tất cả sinh viên có làm bài thi này
          const studentsWithExam = classData.students
            .map(student => {
              const examAttempts = student.attempts.filter(a => a.examId === selectedExam);
              if (examAttempts.length === 0) return null;

              return {
                ...student,
                examAttempts: examAttempts
              };
            })
            .filter(item => item !== null);

          if (studentsWithExam.length === 0) {
            Swal.close();
            Swal.fire("Thông báo", "Không có sinh viên nào làm bài kiểm tra này.", "info");
            return;
          }

          // Lấy thông tin bài thi
          const selectedExamData = classData.exams.find(e => e._id === selectedExam);

          // Tạo dữ liệu cho Excel
          const exportData = [];

          for (const student of studentsWithExam) {
            for (const attempt of student.examAttempts) {
              try {
                // Lấy chi tiết kết quả với điểm từng câu từ API mới
                const resultResponse = await axios.get(
                  `${API_URL}/test-exams/${selectedExam}/my-result-detailed?studentId=${student.studentId}`
                );

                const result = resultResponse.data;
                const submittedDate = new Date(attempt.submittedAt);

                // Lấy thời gian làm bài từ dữ liệu response
                const timeSpentMinutes = result.timeSpent !== null && result.timeSpent !== undefined
                  ? Math.round(result.timeSpent / 60)
                  : "-";

                // Tạo row dữ liệu cơ bản
                const rowData = {
                  "Họ tên": student.studentName,
                  "Tài khoản": student.studentUsername,
                  "Ngày làm bài": submittedDate.toLocaleString("vi-VN"),
                  "Thời gian làm (phút)": timeSpentMinutes
                };

                // Thêm điểm từng câu (hệ 10)
                const pointsPerQuestion = result.questions && result.questions.length > 0
                  ? (10 / result.questions.length).toFixed(2)
                  : 0;

                if (result.questions && result.questions.length > 0) {
                  result.questions.forEach((question, idx) => {
                    const earnedPointsForQuestion = question.earnedPoints === question.points ? pointsPerQuestion : 0;
                    const columnName = `Câu ${idx + 1}`;
                    rowData[columnName] = earnedPointsForQuestion;
                  });
                }

                // Thêm cột tổng điểm hệ 10 ở cuối
                const scoreOut10 = result.scoreOut10 || (result.percentage / 10).toFixed(2);
                rowData["Tổng điểm (hệ 10)"] = scoreOut10;

                exportData.push(rowData);
              } catch (err) {
                console.error(`Lỗi lấy kết quả cho sinh viên ${student.studentName}:`, err);
                // Vẫn thêm dữ liệu cơ bản nếu không lấy được chi tiết
                const submittedDate = new Date(attempt.submittedAt);
                const timeSpentMinutes = attempt.timeSpent !== null && attempt.timeSpent !== undefined
                  ? Math.round(attempt.timeSpent / 60)
                  : "-";

                exportData.push({
                  "Họ tên": student.studentName,
                  "Tài khoản": student.studentUsername,
                  "Ngày làm bài": submittedDate.toLocaleString("vi-VN"),
                  "Thời gian làm (phút)": timeSpentMinutes
                });
              }
            }
          }

          // Tạo workbook và sheet với thứ tự cột cố định
          const ws = XLSX.utils.json_to_sheet(exportData, {
            header: Object.keys(exportData[0] || {})
          });
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Kết quả");

          // Điều chỉnh độ rộng cột
          const colWidths = Object.keys(exportData[0] || {}).map(key => ({
            wch: Math.max(key.length, 15)
          }));
          ws['!cols'] = colWidths;

          // Tạo tên file
          const filename = `Ket_qua_${selectedExamData?.title || "Bai_kiem_tra"}_${new Date().toISOString().split('T')[0]}.xlsx`;

          // Export
          XLSX.writeFile(wb, filename);

          Swal.close();
          Swal.fire(
            "Thành công!",
            `Đã export ${exportData.length} kết quả ra file ${filename}`,
            "success"
          );
        }
      });
    } catch (err) {
      console.error("Lỗi export Excel:", err);
      Swal.fire("Lỗi!", "Không thể export dữ liệu. " + err.message, "error");
    }
  };

  // Check if ResponsiveContainer is available
  useEffect(() => {
    setTimeout(() => {
      const rechartsSurfaces = document.querySelectorAll('.recharts-surface');
      console.log(`🎨 Found ${rechartsSurfaces.length} Recharts SVG surfaces`);
      rechartsSurfaces.forEach((surface, idx) => {
        console.log(`  Surface ${idx}:`, surface.getAttribute('width'), 'x', surface.getAttribute('height'));
      });
    }, 500);
  }, [viewMode]);

  return (
    <div className="report-container">
      <h2> Thống kê & Báo cáo</h2>

      {/* Chọn lớp */}
      <div className="class-selector">
        <h3>Chọn lớp để xem báo cáo:</h3>
        <div className="class-buttons">
          {classes.length === 0 ? (
            <p style={{ color: "#999" }}>Bạn chưa được phân công lớp nào.</p>
          ) : (
            classes.map(cls => (
              <button
                key={cls._id}
                className={`class-btn ${selectedClass === cls._id ? "active" : ""}`}
                onClick={() => handleSelectClass(cls._id)}
              >
                {cls.className}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chọn bài thi */}
      {selectedClass && exams.length > 0 && (
        <div className="exam-selector">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
            <h3 style={{ margin: 0 }}>Chọn bài kiểm tra để xem báo cáo:</h3>
            {selectedExam && (
              <button
                className="export-btn"
                onClick={exportToExcel}
                title="Export kết quả ra file Excel"
              >
                📥 Export Excel
              </button>
            )}
          </div>
          <div className="exam-buttons">
            {exams.map(exam => (
              <button
                key={exam._id}
                className={`exam-btn ${selectedExam === exam._id ? "active" : ""}`}
                onClick={() => setSelectedExam(exam._id)}
              >
                {exam.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Nội dung khi chọn lớp */}
      {selectedClass && (
        <div className="report-content">
          {loading ? (
            <p>Đang tải dữ liệu...</p>
          ) : classData && selectedExam ? (
            <>
              {/* Tabs chuyển đổi view */}
              <div className="view-tabs">
                <button
                  className={`tab-btn ${viewMode === "list" ? "active" : ""}`}
                  onClick={() => setViewMode("list")}
                >
                  📋 Danh sách sinh viên
                </button>
                <button
                  className={`tab-btn ${viewMode === "stats" ? "active" : ""}`}
                  onClick={() => setViewMode("stats")}
                >
                  📈 Biểu đồ thống kê
                </button>
              </div>

              {/* VIEW 1: Danh sách sinh viên */}
              {viewMode === "list" && (
                <div className="student-list-view">
                  <h3>Danh sách sinh viên - {examInfo?.examTitle}</h3>
                  <table className="student-table">
                    <thead>
                      <tr>
                        <th>Tên sinh viên</th>
                        <th>Tài khoản</th>
                        <th>Điểm trung bình hệ 10</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classData.students.map(student => {
                        // Chỉ lấy attempts của bài thi được chọn
                        const examAttempts = student.attempts.filter(a => a.examId === selectedExam);
                        if (examAttempts.length === 0) return null;

                        const avgScore = examAttempts.length > 0
                          ? (examAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / examAttempts.length / 10).toFixed(2)
                          : "-";

                        return (
                          <tr key={student.studentId}>
                            <td>{student.studentName}</td>
                            <td>{student.studentUsername}</td>
                            <td className={Number(avgScore) >= 5 ? "pass" : "fail"}>
                              {avgScore}/10
                            </td>
                            <td>
                              <button
                                className="detail-btn"
                                onClick={() => {
                                  // Hiển thị chi tiết của bài thi được chọn cho sinh viên này
                                  const studentExamAttempt = examAttempts[0]; // Lấy lần làm đầu tiên (hoặc có thể add dropdown để chọn lần khác)
                                  if (studentExamAttempt) {
                                    // Fetch detailed results
                                    axios.get(
                                      `${API_URL}/test-exams/${selectedExam}/my-result-detailed?studentId=${student.studentId}`
                                    ).then(res => {
                                      const result = res.data;
                                      const timeSpentMinutes = result.timeSpent ? Math.round(result.timeSpent / 60) : "-";
                                      const scoreOut10 = result.scoreOut10 || (result.percentage / 10).toFixed(2);

                                      let questionDetailsHtml = "";
                                      if (result.questions && result.questions.length > 0) {
                                        // ✅ NEW: Divide 10 points equally among all questions
                                        const totalQuestions = result.questions.length;
                                        const pointsPerQuestion = (10 / totalQuestions).toFixed(2);
                                        questionDetailsHtml = result.questions.map((q, idx) => {
                                          // If student answered correctly, give full points for this question
                                          const earnedPointsForQuestion = q.earnedPoints === q.points ? pointsPerQuestion : 0;
                                          return `
                                            <div style="margin: 8px 0; padding: 10px; background: #f5f5f5; border-radius: 5px; display: flex; justify-content: space-between; align-items: center;">
                                              <span><strong>Câu ${idx + 1}</strong></span>
                                              <span style="color: ${q.earnedPoints === q.points ? 'green' : 'orange'}; font-weight: 600;">${earnedPointsForQuestion}/${pointsPerQuestion} ${q.earnedPoints === q.points ? '✅' : '❌'}</span>
                                            </div>
                                          `;
                                        }).join('');
                                      }

                                      Swal.fire({
                                        title: `Chi tiết ${student.studentName} - ${examInfo?.examTitle}`,
                                        html: `
                                          <div style="text-align: left; max-height: 600px; overflow-y: auto;">
                                            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                                              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                                                <div>
                                                  <p style="margin: 0; color: #666; font-size: 13px;">Điểm tổng</p>
                                                  <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #1976d2;">${scoreOut10}/10</p>
                                                </div>
                                                <div>
                                                  <p style="margin: 0; color: #666; font-size: 13px;">Thời gian làm bài</p>
                                                  <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: bold; color: #1976d2;">${timeSpentMinutes} phút</p>
                                                </div>
                                              </div>
                                            </div>
                                            <h4 style="margin: 15px 0 10px 0; color: #333;">Điểm từng câu:</h4>
                                            ${questionDetailsHtml}
                                          </div>
                                        `,
                                        width: "600px",
                                        confirmButtonText: "Đóng"
                                      });
                                    }).catch(() => {
                                      Swal.fire("Lỗi!", "Không thể tải chi tiết bài thi.", "error");
                                    });
                                  }
                                }}
                              >
                                Chi tiết
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* VIEW 2: Biểu đồ thống kê */}
              {viewMode === "stats" && (
                <div className="stats-view">
                  {/* Thống kê tóm tắt */}
                  <div className="stats-summary">
                    <div className="stat-card">
                      <h4>👥 Tổng sinh viên</h4>
                      <p>{stats.totalStudents}</p>
                    </div>
                    <div className="stat-card">
                      <h4>📊 Điểm trung bình hệ 10</h4>
                      <p>{stats.avgScore}/10</p>
                    </div>
                  </div>

                  {/* Kiểm tra dữ liệu biểu đồ */}
                  {stats.totalAttempts === 0 ? (
                    <div className="no-data-message">
                      <p>📊 Lớp này chưa có dữ liệu làm bài. Sinh viên cần hoàn thành ít nhất một bài thi để hiển thị biểu đồ.</p>
                    </div>
                  ) : (
                    <>
                      {/* Biểu đồ phổ điểm */}
                      <div className="chart-wrapper" key={`distribution-${scoreDistribution?.length || 0}`}>
                        <h3>📊 Phổ điểm (Phân bố kết quả theo khoảng điểm)</h3>
                        {scoreDistribution && scoreDistribution.length > 0 ? (
                          <div className="distribution-chart">
                            <div className="chart-y-axis-dist">
                              {(() => {
                                const maxCount = Math.max(...scoreDistribution.map(d => d.count), 1);
                                // Tính step: làm tròn maxCount lên và chia thành ~5 khoảng
                                const step = Math.ceil(maxCount / 5) || 1;
                                // Tính giá trị max trên Y-axis (luôn >= maxCount và là bội của step)
                                const yMax = Math.ceil(maxCount / step) * step;
                                const labels = [];
                                for (let i = 0; i <= yMax; i += step) {
                                  labels.push(i);
                                }
                                return labels.map((val, idx) => (
                                  <div key={idx} className="y-label-dist">{val}</div>
                                ));
                              })()}
                            </div>
                            <div className="chart-content-dist">
                              <div className="dist-bars">
                                {scoreDistribution.map((range, idx) => {
                                  const maxCount = Math.max(...scoreDistribution.map(d => d.count), 1);
                                  const heightPercent = (range.count / maxCount) * 100;
                                  return (
                                    <div key={idx} className="dist-bar-group">
                                      {range.count > 0 && <div className="dist-bar-count">{range.count}</div>}
                                      <div className="dist-bar-container">
                                        <div
                                          className="dist-bar"
                                          style={{
                                            height: `${heightPercent}%`,
                                            backgroundColor: range.count > 0 ? '#3498db' : '#e0e0e0'
                                          }}
                                          title={`${range.label}: ${range.count} sinh viên`}
                                        >
                                        </div>
                                      </div>
                                      <div className="dist-bar-label">{range.label}</div>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="chart-x-axis-dist">Điểm (%)</div>
                            </div>
                          </div>
                        ) : (
                          <p style={{ textAlign: "center", color: "#999", padding: "50px 0" }}>Không có dữ liệu</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          ) : (
            <p>Không có dữ liệu.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default ReportPage;
