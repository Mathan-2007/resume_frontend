import { Link } from 'react-router-dom';

export default function Features() {
  return (
    <div style={{minHeight:'100vh',color:'#fff',textAlign:'center',padding:60,background:'linear-gradient(135deg, #ff00cc, #333399, #00c9ff, #92fe9d)',backgroundSize:'400% 400%'}}>
      <h1 style={{fontSize:'2.8rem',marginBottom:30}}>Application Features</h1>

      {[{title:'📄 Resume Keyword Extraction',desc:'Automatically extracts impactful keywords from your resume to match industry roles and enhance ATS ranking.'},{title:'💻 GitHub Repository Analysis',desc:'Analyzes your GitHub profile to count repositories, highlight active contributions, and summarize your coding activity.'},{title:'🧩 LeetCode Insights',desc:'Fetches details like the number of problems solved, difficulty levels, and recent activity trends.'},{title:'⚡ Smart Keyword Generator',desc:'Generates tailored, high-ranking keywords for your target job role using intelligent language models.'}].map((f)=>(
        <div key={f.title} style={{margin:'30px auto',maxWidth:700,background:'rgba(255,255,255,0.15)',padding:25,borderRadius:15,backdropFilter:'blur(10px)'}}>
          <h3 style={{fontSize:'1.5rem',marginBottom:10}}>{f.title}</h3>
          <p>{f.desc}</p>
        </div>
      ))}

      <p style={{marginTop:40}}><Link to="/" style={{color:'#fff',textDecoration:'underline'}}>⬅ Back to Home</Link></p>
    </div>
  );
}


