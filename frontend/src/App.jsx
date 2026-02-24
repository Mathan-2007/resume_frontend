import { Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home.jsx';
import About from './pages/About.jsx';
import Features from './pages/Features.jsx';
import Contact from './pages/Contact.jsx';
import Login from './pages/Login.jsx';
import Admin from './pages/Admin/Admin.jsx';
import Admin1 from './pages/Admin/Admin_Resume_Filter.jsx';
import User from './pages/user/user.jsx';
import Trainer from './pages/Trainer/Trainer.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

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
