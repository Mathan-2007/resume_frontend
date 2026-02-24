import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column',justifyContent:'space-between',color:'#fff',background:'linear-gradient(135deg, #ff00cc, #333399, #00c9ff, #92fe9d)',backgroundSize:'400% 400%'}}>
      <header style={{padding:'25px 60px',display:'flex',justifyContent:'space-between',alignItems:'center',backdropFilter:'blur(10px)',background:'rgba(255, 255, 255, 0.1)',boxShadow:'0 0 20px rgba(255,255,255,0.2)'}}>
        <div style={{fontSize:'1.8rem',fontWeight:700,color:'#fff',textShadow:'0 0 10px rgba(255,255,255,0.6)'}}>🔍 Resume Keyword Generator</div>
        <nav>
          <Link to="/about" style={{color:'#fff',marginLeft:25,textDecoration:'none',fontWeight:500}}>About</Link>
          <Link to="/features" style={{color:'#fff',marginLeft:25,textDecoration:'none',fontWeight:500}}>Features</Link>
          <Link to="/contact" style={{color:'#fff',marginLeft:25,textDecoration:'none',fontWeight:500}}>Contact</Link>
        </nav>
      </header>

      <section style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',padding:40}}>
        <h1 style={{fontSize:'3.5rem',fontWeight:700,marginBottom:20,textShadow:'0 0 20px rgba(255, 255, 255, 0.8)'}}>Enhance Your Resume with AI-Powered Insights</h1>
        <p style={{fontSize:'1.2rem',maxWidth:750,marginBottom:40,color:'#f0f0f0'}}>Automatically extract top-performing keywords, analyze GitHub and LeetCode activity, and make your resume stand out to recruiters effortlessly.</p>
        <Link to="/login" style={{background:'linear-gradient(90deg, #ff512f, #dd2476, #24c6dc, #514a9d)',color:'#fff',border:'none',padding:'16px 60px',borderRadius:50,fontSize:'1.3rem',fontWeight:600,boxShadow:'0 0 25px rgba(255, 255, 255, 0.5)'}}>Get Started</Link>
      </section>

      <footer style={{textAlign:'center',padding:20,fontSize:'0.9rem',opacity:0.9}}>✨ Built by <strong>Mathan, Manoj, Rajasri</strong></footer>
    </div>
  );
}


