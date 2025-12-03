// server.js
const express = require("express"); // THIẾU DÒNG NÀY!
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./src/config/db");
const path = require("path");

// Import routes
const subjectRoutes = require("./src/routes/subjectRoutes");
const categoryRoutes = require("./src/routes/categoryRoutes");
const questionRoutes = require("./src/routes/questionRoutes");
const practiceExamRoutes = require("./src/routes/practiceExamRoutes");
const testExamRoutes = require("./src/routes/testExamRoutes");
const teachingAssignmentRoutes = require("./src/routes/teachingAssignment");
const userRoutes = require("./src/routes/userRoutes");
const semesterRoutes = require("./src/routes/semesterRoutes"); // ĐÃ CÓ
const classRoutes = require("./src/routes/classRoutes");


const examRoutes = require("./src/routes/testExamRoutes");

dotenv.config();

const app = express(); // BÂY GIỜ MỚI CÓ express!

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Kết nối DB
connectDB();

// === ROUTES ===
app.use("/api/subjects", subjectRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/practice-exams", practiceExamRoutes);
app.use("/api/test-exams", testExamRoutes);
app.use("/api/teaching-assignments", teachingAssignmentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/semesters", semesterRoutes);
app.use("/api/classes", classRoutes);
app.use("/api/exams", examRoutes);
// Trang chủ
app.get("/", (req, res) => {
  res.send("API is running... Welcome to Exam Management System!");
});

// 404 Handler
app.use("*", (req, res) => {
  res.status(404).json({ message: `Không tìm thấy route: ${req.originalUrl}` });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error("Server error:", err.stack);
  res.status(err.status || 500).json({
    message: err.message || "Server error",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API Docs: http://localhost:${PORT}/api`);
});