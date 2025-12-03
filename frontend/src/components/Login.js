import React, { useState } from "react";

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("https://khoaluantotnghiep-5ff3.onrender.com/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        const userInfo = {
          _id: data.user._id,
          username: data.user.username,
          role: data.user.role,
          name: data.user.name,
          subjects: data.user.subjects || [],
        };
        localStorage.setItem("app_user", JSON.stringify(userInfo));
        onLogin(userInfo);
      } else {
        setError(data.message || "Đăng nhập thất bại");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Lỗi kết nối đến server");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card} className="fadeIn">


        <h1 style={styles.title}>Hệ thống thi trực tuyến</h1>

        <form onSubmit={handleSubmit}>
          <div style={styles.inputGroup}>
            <span style={styles.icon}>
              <svg width="20" height="20" fill="#555">
                <path d="M10 10.8c2.3 0 4.2-1.9 4.2-4.2S12.3 2.4 10 2.4 5.8 4.3 5.8 6.6 7.7 10.8 10 10.8zm0 1.8c-2.8 0-8.4 1.4-8.4 4.2V19h16.8v-2.2c0-2.8-5.6-4.2-8.4-4.2z"/>
              </svg>
            </span>
            <input
              style={styles.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Tài khoản..."
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <span style={styles.icon}>
              <svg width="20" height="20" fill="#555">
                <path d="M14 8V6a4 4 0 00-8 0v2H4v10h12V8h-2zm-6-2a2 2 0 114 0v2H8V6z"/>
              </svg>
            </span>
            <input
              style={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Mật khẩu..."
              required
            />
          </div>

          {error && (
            <div style={styles.error}>
              <svg width="16" height="16" fill="#d60000" style={{ marginRight: 6 }}>
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm1 10H7V9h2v2zm0-4H7V5h2v2z"/>
              </svg>
              {error}
            </div>
          )}

          <button type="submit" style={styles.button} className="btnHover">
            Đăng nhập
          </button>
        </form>

        <div style={styles.helperBox}>
          <p style={{ margin: 0, fontSize: 13, color: "#555" }}>
            <strong>Lưu ý:</strong> Sử dụng tài khoản được cấp bởi quản trị viên.
          </p>
        </div>
      </div>

      {/* Animations */}
      <style>
        {`
          @keyframes fadeScale {
            from { opacity: 0; transform: translateY(20px) scale(0.95); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }
          .fadeIn { animation: fadeScale 0.6s cubic-bezier(0.22,1,0.36,1) forwards; }
          .btnHover { transition: all 0.3s ease; }
          .btnHover:hover {
            transform: translateY(-2px) scale(1.02);
            box-shadow: 0 12px 28px rgba(30,144,255,.3) !important;
          }
          .btnHover:active { transform: translateY(0) scale(0.99); }
          input:focus {
            outline:none !important;
            box-shadow:0 0 0 3px rgba(30,144,255,.2) !important;
            transform:scale(1.01);
            transition:all .25s ease;
          }
        `}
      </style>
    </div>
  );
}

/* ====================== STYLES ====================== */
const styles = {
  page: {
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    padding: "20px",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: 500,
    padding: "50px 45px",
    borderRadius: 28,
    background: "rgba(255,255,255,0.95)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    boxShadow: "0 25px 50px rgba(0,0,0,0.2)",
    border: "1px solid rgba(255,255,255,0.3)",
  },

  /* ---------- Tiêu đề hệ thống (không logo) ---------- */
 logoContainer: {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  marginBottom: 32,
},

systemTitle: {
  fontSize: 29,
  fontWeight: 900,
  margin: 0,
  letterSpacing: 1.2,
  textAlign: "center",
  lineHeight: 1.2,
},

titleGradient: {
  color: "#1a1a1a",          // chữ đen đậm
  fontWeight: 900,
  fontSize: 29,
  textAlign: "center",
  lineHeight: 1.2,
  letterSpacing: 1.2,
  textShadow: "0 1px 2px rgba(0,0,0,0.1)", // bóng nhẹ, tinh tế
},

titleUnderline: {
  width: 140,
  height: 4,
  background: "linear-gradient(90deg, #4facfe, #00f2fe)", // underline gradient nhẹ
  borderRadius: 3,
  marginTop: 12,
  boxShadow: "0 0 8px rgba(0, 150, 255, 0.2)",
}
,
  /* ---------- Các phần còn lại (giữ nguyên) ---------- */
  title: {
    textAlign: "center",
    fontSize: 32,
    fontWeight: 700,
    margin: "8px 0 40px",
    color: "#2c3e50",
    letterSpacing: -0.5,
  },
  inputGroup: { position: "relative", marginBottom: 22 },
  icon: {
    position: "absolute",
    top: "50%",
    left: 16,
    transform: "translateY(-50%)",
    pointerEvents: "none",
    opacity: 0.75,
    zIndex: 1,
  },
  input: {
    width: "100%",
    padding: "16px 16px 16px 48px",
    borderRadius: 16,
    border: "1px solid rgba(0,0,0,0.1)",
    background: "#fafafa",
    fontSize: 16,
    outline: "none",
    transition: "all 0.3s ease",
    boxShadow: "inset 0 2px 5px rgba(0,0,0,0.03)",
  },
  button: {
    marginTop: 18,
    width: "100%",
    padding: "16px 0",
    borderRadius: 16,
    border: "none",
    fontSize: 18,
    fontWeight: 700,
    cursor: "pointer",
    background: "linear-gradient(135deg, #1E90FF, #00BFFF)",
    color: "#fff",
    transition: "all 0.3s ease",
    boxShadow: "0 8px 20px rgba(30,144,255,0.25)",
    letterSpacing: 0.5,
  },
  error: {
    margin: "15px 0",
    padding: "14px 16px",
    borderRadius: 14,
    background: "rgba(255,82,82,0.1)",
    border: "1px solid rgba(255,82,82,0.3)",
    color: "#d60000",
    fontSize: 14,
    display: "flex",
    alignItems: "center",
    fontWeight: 500,
  },
  helperBox: {
    marginTop: 32,
    padding: "16px",
    borderRadius: 14,
    background: "rgba(240,248,255,0.8)",
    border: "1px dashed rgba(30,144,255,0.3)",
    fontSize: 13.5,
    color: "#444",
    textAlign: "center",
    lineHeight: 1.5,
  },
};

export default Login;