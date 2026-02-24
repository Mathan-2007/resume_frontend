import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { Upload, Target, Briefcase, MessageSquare, CheckCircle, AlertCircle, Info, TrendingUp, FileText, User, Mail, Phone, Code, LogOut } from 'lucide-react';

const API_BASE = 'https://resume-analyzer-8rhy.onrender.com';

export default function UserDashboard() {
  const [activeTab, setActiveTab] = useState('analysis');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  // User data
  const [user, setUser] = useState({});
  
  // Resume data
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeData, setResumeData] = useState(null);
  
  // Coding profiles
  const [github, setGithub] = useState(null);
  const [leetcode, setLeetcode] = useState(null);
  const [codechef, setCodechef] = useState(null);
  
  // AI Chat
  const [chatMessages, setChatMessages] = useState([]);
  const [userMessage, setUserMessage] = useState('');
  const [chatting, setChatting] = useState(false);

  const email = localStorage.getItem("email");

  // Fetch user info
  useEffect(() => {
    const fetchUserData = async () => {
      const storedEmail = localStorage.getItem("email");
      if (!storedEmail) return;
      
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/user/info/${storedEmail}`, {
  credentials: "include"
});
        const data = await res.json();
        setUser(data.user);
      } catch (err) {
        console.error("User fetch error:", err);
        setError("Failed to load user data");
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  // Fetch coding profiles
  useEffect(() => {
    if (!email) return;
    
    const fetchProfiles = async () => {
      try {
        const [g, l, c] = await Promise.all([
          fetch(`${API_BASE}/github/${email}`, {
  credentials: "include"
}).then(r => r.json()),
          fetch(`${API_BASE}/leetcode/${email}`, {
  credentials: "include"
}).then(r => r.json()),
          fetch(`${API_BASE}/codechef/${email}`, {
  credentials: "include"
}).then(r => r.json()),
        ]);
        setGithub(g);
        setLeetcode(l);
        setCodechef(c);
      } catch (err) {
        console.warn("Profile fetch error:", err);
      }
    };
    fetchProfiles();
  }, [email]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setResumeFile(file);
      setError(null);
      uploadResume(file);
    } else {
      setError('Please select a valid PDF file');
    }
  };

  const uploadResume = async (file) => {
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('email', email);
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE}/user/upload_resume`, {
  method: 'POST',
  body: formData,
  credentials: "include"
});

      const result = await response.json();
      
      if (response.ok) {
        setResumeData({
          ats_score: result.ats_score,
          word_count: result.word_count,
          data: result.structured_info,
          ats_breakdown: result.ats_breakdown,
          suggested_skills: result.suggested_skills || []
        });
      } else {
        setError(result.error || 'Failed to upload resume');
      }
    } catch (err) {
      setError('Network error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!userMessage.trim() || !resumeData) return;

    const newMessage = { role: 'user', content: userMessage };
    setChatMessages([...chatMessages, newMessage]);
    setUserMessage('');
    setChatting(true);

    try {
      const response = await fetch(`${API_BASE}/ai/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: "include",
  body: JSON.stringify({
    query: userMessage,
    resume_data: resumeData.data || {}
  })
});

      const data = await response.json();
      const aiResponse = {
        role: 'assistant',
        content: data.response
      };
      setChatMessages(prev => [...prev, aiResponse]);
    } catch (err) {
      console.error('AI error:', err);
      const errorResponse = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      };
      setChatMessages(prev => [...prev, errorResponse]);
    } finally {
      setChatting(false);
    }
  };

const handleLogout = async () => {
  try {
    const res = await fetch("https://resume-analyzer-8rhy.onrender.com/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    // Try to parse JSON safely
    let json = {};
    try {
      json = await res.json();
    } catch {
      json = {};
    }

    if (!res.ok) {
      console.error("Logout failed:", json);
      throw new Error(json?.detail || "Logout failed");
    }

    // ✅ Backend confirmed logout
    localStorage.clear();
    sessionStorage.clear();

    // Optional: soft clear client-side cookies (won’t affect HttpOnly)
    document.cookie.split(";").forEach((c) => {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    // ✅ Redirect only after backend confirms success
    navigate("/login");
  } catch (err) {
    console.error("Logout error:", err);
    alert("Logout failed — please try again.");
  }
};


  const getATSRecommendations = () => {
    if (!resumeData) return [];
    
    const score = resumeData.ats_score || 0;
    const recommendations = [];

    if (score < 50) {
      recommendations.push({
        type: 'critical',
        message: 'Add more technical keywords and skills relevant to your target role',
        icon: AlertCircle,
        color: 'red'
      });
      recommendations.push({
        type: 'critical',
        message: 'Include quantifiable achievements and metrics in your experience',
        icon: AlertCircle,
        color: 'red'
      });
      recommendations.push({
        type: 'critical',
        message: 'Expand your skills section with more relevant technologies',
        icon: AlertCircle,
        color: 'red'
      });
    } else if (score < 75) {
      recommendations.push({
        type: 'warning',
        message: 'Consider adding more industry-specific certifications',
        icon: Info,
        color: 'yellow'
      });
      recommendations.push({
        type: 'warning',
        message: 'Include more detailed project descriptions with outcomes',
        icon: Info,
        color: 'yellow'
      });
      recommendations.push({
        type: 'success',
        message: 'Good foundation - focus on quantifying your impact',
        icon: CheckCircle,
        color: 'green'
      });
    } else {
      recommendations.push({
        type: 'success',
        message: 'Excellent ATS compatibility! Your resume is well-optimized',
        icon: CheckCircle,
        color: 'green'
      });
      recommendations.push({
        type: 'success',
        message: 'Strong keyword presence and clear structure',
        icon: CheckCircle,
        color: 'green'
      });
      recommendations.push({
        type: 'info',
        message: 'Keep updating with new skills and achievements regularly',
        icon: Info,
        color: 'blue'
      });
    }

    return recommendations;
  };

  const getRoleRecommendations = () => {
    if (!resumeData?.data) return [];
    
    const skills = resumeData?.data?.skills?.technical || [];
    const roles = [];

    if (skills.some(s => s.toLowerCase().includes('react') || s.toLowerCase().includes('angular') || s.toLowerCase().includes('vue'))) {
      roles.push({
        title: 'Frontend Developer',
        match: 85,
        description: 'Your frontend framework expertise makes you a strong candidate',
        skills: ['React', 'JavaScript', 'CSS', 'HTML']
      });
    }

    if (skills.some(s => s.toLowerCase().includes('python') || s.toLowerCase().includes('java') || s.toLowerCase().includes('node'))) {
      roles.push({
        title: 'Backend Developer',
        match: 80,
        description: 'Strong backend programming skills identified',
        skills: ['Python', 'Java', 'Node.js', 'APIs']
      });
    }

    if (skills.some(s => s.toLowerCase().includes('react') || s.toLowerCase().includes('node')) && 
        skills.some(s => s.toLowerCase().includes('mongodb') || s.toLowerCase().includes('sql'))) {
      roles.push({
        title: 'Full Stack Developer',
        match: 90,
        description: 'Complete stack proficiency detected',
        skills: ['Full Stack', 'MERN', 'Database', 'APIs']
      });
    }

    if (skills.some(s => s.toLowerCase().includes('ml') || s.toLowerCase().includes('ai') || s.toLowerCase().includes('tensorflow'))) {
      roles.push({
        title: 'Machine Learning Engineer',
        match: 75,
        description: 'ML/AI skills present in your profile',
        skills: ['Python', 'TensorFlow', 'ML', 'Data Science']
      });
    }

    if (skills.some(s => s.toLowerCase().includes('devops') || s.toLowerCase().includes('docker') || s.toLowerCase().includes('kubernetes'))) {
      roles.push({
        title: 'DevOps Engineer',
        match: 78,
        description: 'DevOps and infrastructure skills identified',
        skills: ['Docker', 'Kubernetes', 'CI/CD', 'Cloud']
      });
    }

    if (roles.length === 0) {
      roles.push({
        title: 'Software Developer',
        match: 70,
        description: 'General software development role based on your technical background',
        skills: ['Programming', 'Problem Solving', 'Software Development']
      });
    }

    return roles.sort((a, b) => b.match - a.match);
  };

const getSuggestedSkills = () => {
  if (!resumeData?.suggested_skills) return [];
  return resumeData.suggested_skills.map(s => s.trim());
};


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
  Welcome, {resumeData?.data?.name || 'User'}!
</h1>

            <p className="text-purple-200">Your AI-powered career dashboard</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-5 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl transition-all flex items-center gap-2"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="text-red-400 mt-0.5" size={20} />
            <div className="flex-1">
              <p className="text-red-200 font-medium">Error</p>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'analysis', label: 'Resume Analysis', icon: FileText },
            { id: 'ats', label: 'ATS Analysis', icon: Target },
            { id: 'roles', label: 'Role Recommendation', icon: Briefcase },
            { id: 'assistant', label: 'AI Assistant', icon: MessageSquare }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-xl font-medium capitalize transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-white/10 text-purple-200 hover:bg-white/20'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Resume Analysis Tab */}
        {activeTab === 'analysis' && (
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <FileText size={24} />
                Resume Analysis Overview
              </h2>

              {/* Upload Section */}
              <div className="border-2 border-dashed border-purple-400/50 rounded-xl p-8 mb-6 text-center hover:border-purple-400 transition-colors">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                  id="resume-upload"
                />
                <label htmlFor="resume-upload" className="cursor-pointer">
                  <div className="space-y-3">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600/30 rounded-full mb-2">
                      <Upload size={32} className="text-purple-300" />
                    </div>
                    <div className="text-purple-300">
                      {resumeFile ? (
                        <div className="flex items-center justify-center gap-2">
                          <FileText size={20} />
                          <span className="font-medium">{resumeFile.name}</span>
                        </div>
                      ) : (
                        <>
                          <p className="text-lg font-medium">Click to upload your resume</p>
                          <p className="text-sm opacity-75">PDF files only (Max 10MB)</p>
                        </>
                      )}
                    </div>
                    {loading && (
                      <div className="flex items-center justify-center gap-2 mt-3">
                        <div className="w-5 h-5 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                        <span className="text-purple-300 text-sm">Analyzing your resume...</span>
                      </div>
                    )}
                  </div>
                </label>
              </div>

              {resumeData ? (
                <>
                  {/* Quick Stats */}
                  <div className="grid md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-purple-600/30 to-purple-700/30 rounded-xl p-4 text-center">
                      <p className="text-purple-200 text-sm mb-1">ATS Score</p>
                      <p className="text-4xl font-bold text-white">{resumeData.ats_score || 0}</p>
                      <p className="text-purple-300 text-xs mt-1">out of 100</p>
                    </div>
                    <div className="bg-gradient-to-br from-pink-600/30 to-pink-700/30 rounded-xl p-4 text-center">
                      <p className="text-purple-200 text-sm mb-1">Word Count</p>
                      <p className="text-4xl font-bold text-white">{resumeData.word_count || 0}</p>
                      <p className="text-purple-300 text-xs mt-1">words</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-600/30 to-blue-700/30 rounded-xl p-4 text-center">
                      <p className="text-purple-200 text-sm mb-1">Technical Skills</p>
                      <p className="text-4xl font-bold text-white">{resumeData.data?.skills?.technical?.length || 0}</p>
                      <p className="text-purple-300 text-xs mt-1">skills identified</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-600/30 to-green-700/30 rounded-xl p-4 text-center">
                      <p className="text-purple-200 text-sm mb-1">Languages</p>
                      <p className="text-4xl font-bold text-white">{resumeData.data?.languages?.length || 0}</p>
                      <p className="text-purple-300 text-xs mt-1">languages</p>
                    </div>
                  </div>

                  {/* Personal Information */}
                  {resumeData.data && (
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="bg-white/5 rounded-xl p-5 space-y-3">
                        <h3 className="text-lg font-semibold text-purple-300 mb-4 flex items-center gap-2">
                          <User size={20} />
                          Personal Information
                        </h3>
                        {user.name && (
                          <div className="flex items-center gap-3">
                            <User size={16} className="text-purple-400" />
                            <span className="text-white">{resumeData?.data?.name}</span>
                          </div>
                        )}
                        {user.email && (
                          <div className="flex items-center gap-3">
                            <Mail size={16} className="text-purple-400" />
                            <span className="text-white text-sm">{resumeData?.data?.email}</span>
                          </div>
                        )}
                        {user.phone && (
                          <div className="flex items-center gap-3">
                            <Phone size={16} className="text-purple-400" />
                            <span className="text-white">{resumeData?.data?.phone}</span>
                          </div>
                        )}
                      </div>

                      <div className="bg-white/5 rounded-xl p-5 space-y-3">
                        <h3 className="text-lg font-semibold text-purple-300 mb-4 flex items-center gap-2">
                          <Code size={20} />
                          Coding Profiles
                        </h3>
                        {github && (
                          <div className="text-sm">
                            <span className="text-purple-300">GitHub: </span>
                            <span className="text-white">{github.repos || 0} repos, {github.stars || 0} ⭐</span>
                          </div>
                        )}
                        {leetcode && (
                          <div className="text-sm">
                            <span className="text-purple-300">LeetCode: </span>
                            <span className="text-white">{leetcode.solved || 0} solved</span>
                          </div>
                        )}
                        {codechef && (
                          <div className="text-sm">
                            <span className="text-purple-300">CodeChef: </span>
                            <span className="text-white">{codechef.stars || 0}⭐ Stars</span>
                          </div>
                        )}
                      </div>

                      {/* Technical Skills */}
                      {resumeData?.data?.skills?.technical?.length > 0 && (
                        <div className="md:col-span-2 bg-white/5 rounded-xl p-5">
                          <h3 className="text-lg font-semibold text-purple-300 mb-4">Technical Skills</h3>
                          <div className="flex flex-wrap gap-2">
                            {resumeData?.data?.skills.technical.map((skill, idx) => (
                              <span key={idx} className="bg-purple-600/40 px-4 py-2 rounded-full text-white text-sm font-medium border border-purple-500/30">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Languages */}
                      {resumeData?.data?.languages?.length > 0 && (
                        <div className="md:col-span-2 bg-white/5 rounded-xl p-5">
                          <h3 className="text-lg font-semibold text-purple-300 mb-4">Languages</h3>
                          <div className="flex flex-wrap gap-2">
                            {resumeData?.data?.languages.map((lang, idx) => (
                              <span key={idx} className="bg-pink-600/40 px-4 py-2 rounded-full text-white text-sm font-medium border border-pink-500/30">
                                {lang}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Summary */}
                      {resumeData?.data?.summary && (
                        <div className="md:col-span-2 bg-white/5 rounded-xl p-5">
                          <h3 className="text-lg font-semibold text-purple-300 mb-3">Professional Summary</h3>
                          <p className="text-white leading-relaxed">{resumeData?.data?.summary}</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <Info className="mx-auto text-purple-400 mb-4" size={48} />
                  <p className="text-purple-200 text-lg">Upload your resume to see detailed analysis</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ATS Analysis Tab */}
        {activeTab === 'ats' && (
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Target size={24} />
                ATS Compatibility Analysis
              </h2>

              {resumeData ? (
                <>
                  {/* ATS Score Gauge */}
                  <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-xl p-8 mb-6">
                    <div className="text-center">
                      <p className="text-purple-200 text-sm mb-3">Your ATS Score</p>
                      <div className="relative inline-block">
                        <svg className="w-48 h-48">
                          <circle
                            cx="96"
                            cy="96"
                            r="88"
                            fill="none"
                            stroke="rgba(255,255,255,0.1)"
                            strokeWidth="12"
                          />
                          <circle
                            cx="96"
                            cy="96"
                            r="88"
                            fill="none"
                            stroke="url(#gradient)"
                            strokeWidth="12"
                            strokeDasharray={`${(resumeData.ats_score / 100) * 553} 553`}
                            strokeLinecap="round"
                            transform="rotate(-90 96 96)"
                          />
                          <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#a855f7" />
                              <stop offset="100%" stopColor="#ec4899" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div>
                            <p className="text-5xl font-bold text-white">{resumeData.ats_score}</p>
                            <p className="text-purple-300 text-sm">/ 100</p>
                          </div>
                        </div>
                      </div>
                      <p className="text-white text-lg font-medium mt-4">
                        {resumeData.ats_score >= 75 ? '✨ Excellent' : 
                         resumeData.ats_score >= 50 ? '👍 Good' : '⚠️ Needs Improvement'}
                      </p>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-white mb-4">Recommendations</h3>
                    {getATSRecommendations().map((rec, idx) => (
                      <div key={idx} className={`rounded-xl p-4 flex items-start gap-3 ${
                        rec.color === 'red' ? 'bg-red-600/20 border border-red-500/30' :
                        rec.color === 'yellow' ? 'bg-yellow-600/20 border border-yellow-500/30' :
                        rec.color === 'green' ? 'bg-green-600/20 border border-green-500/30' :
                        'bg-blue-600/20 border border-blue-500/30'
                      }`}>
                        <rec.icon className={`flex-shrink-0 mt-0.5 ${
                          rec.color === 'red' ? 'text-red-400' :
                          rec.color === 'yellow' ? 'text-yellow-400' :
                          rec.color === 'green' ? 'text-green-400' :
                          'text-blue-400'
                        }`} size={20} />
                        <p className="text-white">{rec.message}</p>
                      </div>
                    ))}
                  </div>

                  {/* ATS Tips */}
                  <div className="mt-6 bg-white/5 rounded-xl p-5">
                    <h3 className="text-lg font-semibold text-purple-300 mb-3">ATS Optimization Tips</h3>
                    <ul className="space-y-2 text-purple-100 text-sm">
                      <li className="flex items-start gap-2">
                        <CheckCircle size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                        <span>Use standard section headings like "Work Experience" and "Education"</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                        <span>Include relevant keywords from job descriptions</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                        <span>Avoid using images, tables, or complex formatting</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                        <span>List your technical skills explicitly</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle size={16} className="text-green-400 mt-0.5 flex-shrink-0" />
                        <span>Use standard fonts and clear formatting</span>
                      </li>
                    </ul>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <Target className="mx-auto text-purple-400 mb-4" size={48} />
                  <p className="text-purple-200 text-lg mb-4">Upload your resume in the Resume Analysis tab first</p>
                  <button
                    onClick={() => setActiveTab('analysis')}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl transition-colors"
                  >
                    Go to Resume Analysis
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Role Recommendation Tab */}
        {activeTab === 'roles' && (
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Briefcase size={24} />
                Recommended Roles
              </h2>

              {resumeData ? (
                <>
                  {resumeData.data?.role_match && (
                    <div className="bg-gradient-to-r from-purple-600/30 to-pink-600/30 rounded-xl p-5 mb-6 border border-purple-500/30">
                      <p className="text-purple-200 text-sm mb-1">Suggested Role from Resume</p>
                      <p className="text-white text-xl font-semibold">{resumeData.data.role_match}</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    {getRoleRecommendations().map((role, idx) => (
                      <div key={idx} className="bg-white/5 rounded-xl p-6 border border-white/10 hover:border-purple-500/50 transition-all">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-xl font-semibold text-white mb-2">{role.title}</h3>
                            <p className="text-purple-200 text-sm">{role.description}</p>
                          </div>
                          <div className="text-right ml-4">
                            <div className={`text-3xl font-bold ${
                              role.match >= 85 ? 'text-green-400' :
                              role.match >= 70 ? 'text-yellow-400' :
                              'text-orange-400'
                            }`}>
                              {role.match}%
                            </div>
                            <p className="text-purple-300 text-xs">Match</p>
                          </div>
                        </div>
                        
                        <div className="mb-4">
                          <div className="w-full bg-white/10 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all ${
                                role.match >= 70 ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' :
                              'bg-gradient-to-r from-red-500 to-orange-500'
                              }`}
                              style={{ width: `${role.match}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {role.skills.map((s, i) => (
                            <span
                              key={i}
                              className="bg-purple-600/30 border border-purple-400/30 px-3 py-1 rounded-full text-sm text-white"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  {resumeData.detected_role && (
  <div className="bg-gradient-to-r from-purple-600/30 to-pink-600/30 rounded-xl p-5 mb-6 border border-purple-500/30">
    <p className="text-purple-200 text-sm mb-1">AI-Detected Role</p>
    <p className="text-white text-xl font-semibold">{resumeData.detected_role}</p>
  </div>
)}

                  {/* Suggested Skills Section */}
{getSuggestedSkills().length > 0 && (
  <div className="mt-8 bg-gradient-to-r from-purple-700/20 to-pink-700/20 rounded-xl p-6 border border-purple-500/30">
    <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
  <TrendingUp size={20} className="text-purple-300" />
  Suggested Skills to Strengthen Your {resumeData.detected_role || "Career"}
</h3>
<p className="text-purple-200 text-sm mb-4">
  Based on your current resume, here are additional skills recommended for your role:
  <span className="font-semibold text-purple-400 ml-1">
    {resumeData.detected_role || "General Developer"}
  </span>
</p>

    <div className="flex flex-wrap gap-2">
      {getSuggestedSkills().map((skill, i) => (
        <span
          key={i}
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-full text-sm font-medium border border-purple-400/30 shadow-sm"
        >
          {skill}
        </span>
      ))}
    </div>
  </div>
)}

                </>
              ) : (
                <div className="text-center py-12">
                  <Briefcase className="mx-auto text-purple-400 mb-4" size={48} />
                  <p className="text-purple-200 text-lg mb-4">
                    Upload your resume first to get personalized role suggestions
                  </p>
                  <button
                    onClick={() => setActiveTab('analysis')}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl transition-colors"
                  >
                    Go to Resume Analysis
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Assistant Tab */}
        {activeTab === 'assistant' && (
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 flex flex-col h-[70vh]">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <MessageSquare size={24} />
                AI Career Assistant
              </h2>

              <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
                {chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center text-purple-200">
                    <MessageSquare size={48} className="text-purple-400 mb-3" />
                    <p className="text-lg font-medium">Start chatting with your AI assistant</p>
                    <p className="text-sm text-purple-300 mt-1">
                      Ask about resume improvement, job roles, or technical growth tips.
                    </p>
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
                          msg.role === 'user'
                            ? 'bg-purple-600 text-white rounded-br-none'
                            : 'bg-white/10 text-purple-100 rounded-bl-none border border-white/10'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-white/10 pt-3 flex items-center gap-3">
                <input
                  type="text"
                  value={userMessage}
                  onChange={(e) => setUserMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={sendMessage}
                  disabled={chatting}
                  className={`px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all ${
                    chatting
                      ? 'bg-purple-400/40 cursor-not-allowed text-purple-200'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                >
                  {chatting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Thinking...</span>
                    </>
                  ) : (
                    <>
                      <MessageSquare size={18} />
                      <span>Send</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
