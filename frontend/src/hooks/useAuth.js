import { useEffect, useState } from "react";

export function useAuth(allowedRoles = []) {
  const [auth, setAuth] = useState({ loading: true, authorized: false, role: null });

  useEffect(() => {
    const verify = async () => {
      try {
        const res = await fetch("https://resume-analyzer-8rhy.onrender.com/auth/verify_token", {
          method: "GET",
          credentials: "include" // ✅ send cookies
        });

        if (!res.ok) throw new Error("Invalid token");

        const data = await res.json();
        const role = data.user?.role; // ✅ extract properly

        if (allowedRoles.length === 0 || allowedRoles.includes(role)) {
          setAuth({ loading: false, authorized: true, role });
        } else {
          setAuth({ loading: false, authorized: false, role });
        }
      } catch {
        setAuth({ loading: false, authorized: false, role: null });
      }
    };
    verify();
  }, [allowedRoles]);

  return auth;
}
