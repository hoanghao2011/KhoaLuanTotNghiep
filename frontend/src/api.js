import axios from "axios";

const API_URL = "http://localhost:5000/api";

export const fetchSubjects = async () => {
  const response = await axios.get(`${API_URL}/subjects`);
  return response.data;
};

export const fetchTeacherSubjectsWithCategories = async (teacherId) => {
  const response = await axios.get(`${API_URL}/categories/teacher-subjects/${teacherId}`);
  return response.data;
};

// ⭐ FIX v3: Thêm teacherId để filter categories của teacher
export const fetchCategories = async (subjectId, teacherId = null) => {
  let url = `${API_URL}/categories/${subjectId}`;
  if (teacherId) {
    url += `?teacherId=${teacherId}`;
  }
  const response = await axios.get(url);
  return response.data;
};

export const addCategory = async (subjectId, name, description = "") => {
  const response = await axios.post(`${API_URL}/categories/${subjectId}`, { name, description });
  return response.data;
};

export const updateCategory = async (categoryId, name, description = "") => {
  const response = await axios.put(`${API_URL}/categories/${categoryId}`, { name, description });
  return response.data;
};

export const deleteCategory = async (categoryId) => {
  const response = await axios.delete(`${API_URL}/categories/${categoryId}`);
  return response.data;
};

export const fetchQuestions = async (categoryId) => {
  const response = await axios.get(`${API_URL}/questions/${categoryId}`);
  return response.data;
};

export const addQuestion = async (categoryId, formData) => {
  const response = await axios.post(`${API_URL}/questions/${categoryId}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const updateQuestion = async (questionId, formData) => {
  const response = await axios.put(`${API_URL}/questions/${questionId}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const deleteQuestion = async (questionId) => {
  const response = await axios.delete(`${API_URL}/questions/${questionId}`);
  return response.data;
};

export const importQuestions = async (categoryId, formData) => {
  const response = await axios.post(`${API_URL}/questions/${categoryId}/import`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return response.data;
};

export const fetchTestExams = async () => {
  const response = await axios.get(`${API_URL}/test-exams`);
  return response.data;
};

export const createTestExam = async (examData) => {
  const response = await axios.post(`${API_URL}/test-exams`, examData);
  return response.data;
};

export const updateTestExam = async (examId, examData) => {
  const response = await axios.put(`${API_URL}/test-exams/${examId}`, examData);
  return response.data;
};

export const deleteTestExam = async (examId) => {
  const response = await axios.delete(`${API_URL}/test-exams/${examId}`);
  return response.data;
};

export const publishTestExam = async (examId) => {
  const response = await axios.patch(`${API_URL}/test-exams/${examId}/publish`);
  return response.data;
};

export const fetchTestExamQuestions = async (examId) => {
  const response = await axios.get(`${API_URL}/test-exams/${examId}/questions`);
  return response.data;
};

export const addManualTestQuestion = async (examId, formData) => {
  const response = await axios.post(
    `${API_URL}/test-exams/${examId}/questions/manual`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return response.data;
};

export const addBulkTestQuestions = async (examId, questionIds) => {
  const response = await axios.post(`${API_URL}/test-exams/${examId}/questions/bulk`, { questionIds });
  return response.data;
};

export const deleteTestQuestion = async (examId, questionItemId) => {
  const response = await axios.delete(`${API_URL}/test-exams/${examId}/questions/${questionItemId}`);
  return response.data;
};

export const updateTestQuestionPoints = async (examId, questionItemId, points) => {
  const response = await axios.patch(
    `${API_URL}/test-exams/${examId}/questions/${questionItemId}/points`,
    { points }
  );
  return response.data;
};

export const fetchBankQuestions = async (examId) => {
  const response = await axios.get(`${API_URL}/test-exams/${examId}/bank-questions`);
  return response.data;
};

// Lấy danh sách môn + lớp mà giảng viên được phân công
export const fetchTeachingAssignments = async (teacherId) => {
  const response = await axios.get(`${API_URL}/teaching-assignments/teacher/${teacherId}`);
  return response.data;
};

// Tạo đề thi (PracticeExam)
export const createPracticeExam = async (examData) => {
  const response = await axios.post(`${API_URL}/practice-exams`, examData);
  return response.data;
};