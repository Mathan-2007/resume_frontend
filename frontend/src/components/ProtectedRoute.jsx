import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";

export default function ProtectedRoute({ allowedRoles = [], children }) {
  const [auth, setAuth] = useState({ loading: true, authorized: false, role: null });

  useEffect(() => {
    const verify = async () => {
      try {
        const res = await fetch("https://resume-analyzer-8rhy.onrender.com/auth/verify_token", {
          method: "GET",
          credentials: "include", // ✅ send cookiessa
        });
        if (!res.ok) throw new Error("Token invalid");

        const data = await res.json();
        const userRole = data.user?.role || "user";

        if (allowedRoles.includes(userRole)) {
          setAuth({ loading: false, authorized: true, role: userRole });
        } else {
          setAuth({ loading: false, authorized: false, role: userRole });
        }
      } catch (err) {
        setAuth({ loading: false, authorized: false, role: null });
      }
    };
    verify();
  }, [allowedRoles]);

  if (auth.loading) return <div style={{ textAlign: "center", marginTop: 50 }}>Verifying...</div>;

  if (!auth.authorized) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
