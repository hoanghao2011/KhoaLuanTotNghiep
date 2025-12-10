// routes/subjects.js
const express = require("express");
const router = express.Router();
const Subject = require("../models/Subject");
const User = require("../models/User");
const TeachingAssignment = require("../models/TeachingAssignment");

// GET /api/subjects → Lấy danh sách môn học theo học kỳ (ưu tiên kỳ hiện tại)
router.get("/", async (req, res) => {
  try {
    const { semesterId } = req.query;
    let targetSemesterId = semesterId;

    // Nếu không truyền semesterId → tự động lấy học kỳ đang active
    if (!targetSemesterId) {
      const Semester = require("../models/Semester");
      const active = await Semester.findOne({ isActive: true });
      if (!active) {
        return res.json([]); // Không có kỳ active → trả rỗng
      }
      targetSemesterId = active._id;
    }

    // Kiểm tra học kỳ có tồn tại không (tránh lỗi ObjectId không hợp lệ)
    const Semester = require("../models/Semester");
    const semesterExists = await Semester.findById(targetSemesterId);
    if (!semesterExists) {
      return res.status(400).json({ message: "Học kỳ không tồn tại" });
    }

    // Tìm môn học + populate đầy đủ tên và trạng thái active
    const subjects = await Subject.find({ semester: targetSemesterId })
      .populate("semester", "name isActive")
      .sort({ name: 1 })
      .lean();

    res.json(subjects);
  } catch (err) {
    console.error("Lỗi lấy danh sách môn học:", err);
    res.status(500).json({ message: "Lỗi server khi lấy danh sách môn học" });
  }
});

// POST /api/subjects → Tạo môn học mới
router.post("/", async (req, res) => {
  const { name, semesterId } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ message: "Tên môn học không được để trống" });
  }

  let targetSemesterId = semesterId;

  // Nếu không truyền semesterId → dùng học kỳ hiện tại
  if (!targetSemesterId) {
    const Semester = require("../models/Semester");
    const active = await Semester.findOne({ isActive: true });
    if (!active) {
      return res.status(400).json({ message: "Không có học kỳ hiện tại để thêm môn học" });
    }
    targetSemesterId = active._id;
  }

  try {
    // Kiểm tra trùng tên trong cùng học kỳ
    const existing = await Subject.findOne({
      name: name.trim(),
      semester: targetSemesterId,
    });

    if (existing) {
      return res.status(400).json({ message: "Môn học đã tồn tại trong học kỳ này" });
    }

    const newSubject = new Subject({
      name: name.trim(),
      semester: targetSemesterId,
    });

    const saved = await newSubject.save();

    // Trả về dữ liệu đã populate để frontend dùng ngay
    const populated = await Subject.findById(saved._id)
      .populate("semester", "name isActive")
      .lean();

    res.status(201).json(populated);
  } catch (err) {
    console.error("Lỗi tạo môn học:", err);
    res.status(500).json({ message: err.message || "Lỗi server khi tạo môn học" });
  }
});

//getall 

router.get("/all", async (req, res) => {
  try {
    const subjects = await Subject.find({})
      .populate("semester", "name isActive")
      .sort({ name: 1 });
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server" });
  }
});

// DELETE /api/subjects/:id → Xóa môn học + dọn dẹp liên kết
router.delete("/:id", async (req, res) => {
  try {
    const subject = await Subject.findByIdAndDelete(req.params.id);
    if (!subject) {
      return res.status(404).json({ message: "Môn học không tồn tại" });
    }

    // Dọn dẹp trong User (nếu có mảng subjects)
    await User.updateMany(
      { role: "teacher" },
      { $pull: { subjects: subject.name } }
    ).catch(() => console.log("Không cần cập nhật User.subjects"));

    // Dọn dẹp trong TeachingAssignment (nếu có)
    if (TeachingAssignment) {
      await TeachingAssignment.deleteMany({ subject: req.params.id }).catch(() =>
        console.log("Không cần xóa TeachingAssignment")
      );
    }

    res.json({
      message: `Đã xóa môn học "${subject.name}" thành công!`,
    });
  } catch (err) {
    console.error("Lỗi xóa môn học:", err);
    res.status(500).json({ message: "Lỗi server khi xóa môn học" });
  }
});

module.exports = router;