import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {
    // ✅ LOGIN REQUEST
    const res = await fetch(
      "https://resume-analyzer-8rhy.onrender.com/auth/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",   // 🔥 REQUIRED FOR COOKIE
        body: JSON.stringify({ email, password }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      alert(data.detail || "Login failed ❌");
      return;
    }

    alert(`✅ ${data.message}`);

    // ✅ VERIFY TOKEN (COOKIE SENT AUTOMATICALLY)
    const verify = await fetch(
      "https://resume-analyzer-8rhy.onrender.com/auth/verify_token",
      {
        method: "GET",
        credentials: "include",  // 🔥 VERY IMPORTANT
      }
    );

    const verifyData = await verify.json();
    const role = verifyData.user?.role || "user";

    if (role === "admin") navigate("/admin");
    else if (role === "trainer") navigate("/trainer");
    else navigate("/user");
  } catch (err) {
    console.error(err);
    alert("Error connecting to server ⚠️");
  } finally {
    setLoading(false);
  }
};

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h2 style={{ fontSize: "2rem", marginBottom: 15, fontWeight: 600 }}>
          Login Portal
        </h2>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            required
            style={inputStyle}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          <input
            type="password"
            placeholder="Password"
            required
            style={inputStyle}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
          <button type="submit" style={loginBtnStyle} disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <Link
          to="/"
          style={{
            display: "inline-block",
            marginTop: 25,
            padding: "10px 18px",
            border: "none",
            borderRadius: 10,
            background: "rgba(255, 255, 255, 0.2)",
            color: "#fff",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          ⬅ Back to Home
        </Link>
      </div>
    </div>
  );
}

// -------------------- STYLES --------------------
const pageStyle = {
  minHeight: "100vh",
  margin: 0,
  padding: 0,
  fontFamily: "Poppins, sans-serif",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background:
    "linear-gradient(-45deg, #00c6ff, #0072ff, #6a00f4, #b400ff)",
  backgroundSize: "400% 400%",
};

const cardStyle = {
  background: "rgba(255, 255, 255, 0.15)",
  backdropFilter: "blur(12px)",
  borderRadius: 25,
  boxShadow: "0 0 40px rgba(0, 0, 0, 0.3)",
  width: 400,
  padding: "40px 30px",
  textAlign: "center",
  color: "#fff",
};

const inputStyle = {
  width: "100%",
  padding: "12px 15px",
  margin: "10px 0",
  border: "none",
  borderRadius: 10,
  background: "rgba(255, 255, 255, 0.2)",
  color: "#fff",
  fontSize: "1rem",
  outline: "none",
};

const loginBtnStyle = {
  width: "100%",
  padding: 12,
  border: "none",
  borderRadius: 10,
  background: "linear-gradient(90deg, #00e5ff, #0072ff)",
  color: "#fff",
  fontSize: "1rem",
  fontWeight: 600,
  cursor: "pointer",
};
