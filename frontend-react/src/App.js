import './App.css';
import { Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import About from './pages/About';
import Features from './pages/Features';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Admin from './pages/Admin/Admin';
import Admin1 from './pages/Admin/Admin_Resume_Filter';
import User from './pages/user/user';
import Trainer from './pages/Trainer/Trainer';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/features" element={<Features />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/login" element={<Login />} />

      {/* ✅ Protected routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Admin />
          </ProtectedRoute>
        }
      />

      <Route
        path="/trainer"
        element={
          <ProtectedRoute allowedRoles={["trainer"]}>
            <Trainer />
          </ProtectedRoute>
        }
      />

      <Route
        path="/user"
        element={
          <ProtectedRoute allowedRoles={["user"]}>
            <User />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin_resume_filter"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <Admin1 />
          </ProtectedRoute>
        }
      />

      <Route
        path="*"
        element={
          <div style={{ padding: 20 }}>
            <Link to="/">Back to Home</Link>
          </div>
        }
      />
    </Routes>
  );
}

export default App;
