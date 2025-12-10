// models/Subject.js
const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  semester: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Semester", 
    required: true 
  },
  description: { type: String }
}, { 
  timestamps: true,
  unique: ['name', 'semester']
});

subjectSchema.index({ semester: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Subject", subjectSchema);