import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div style={{minHeight:'100vh',color:'#fff',background:'radial-gradient(circle at top left, #0072ff, #00c6ff, #6a00f4, #b400ff)',backgroundSize:'300% 300%'}}>
      <header style={{textAlign:'center',padding:'60px 20px 30px'}}>
        <h1 style={{fontSize:'2.8rem',fontWeight:700,letterSpacing:1,marginBottom:10}}>About Resume Keyword Generator</h1>
        <p style={{color:'rgba(255, 255, 255, 0.9)',fontSize:'1.2rem',maxWidth:700,margin:'0 auto'}}>
          Our platform leverages AI to evaluate resumes and match them with industry-relevant keywords — helping candidates optimize their profiles and recruiters find the best talent efficiently.
        </p>
      </header>

      <div style={{display:'flex',justifyContent:'space-around',flexWrap:'wrap',gap:30,maxWidth:1100,margin:'50px auto',padding:40,background:'rgba(255, 255, 255, 0.1)',borderRadius:25,backdropFilter:'blur(10px)',boxShadow:'0 10px 40px rgba(0, 0, 0, 0.25)',textAlign:'center'}}>
        {[{title:'🚀 Our Mission',text:'We aim to simplify the hiring process by empowering job seekers to build keyword-rich resumes and providing organizations with data-driven insights for effective candidate evaluation.'},{title:'🤖 AI-Powered Insight',text:'Our system uses NLP and machine learning models to analyze job descriptions and match the most impactful keywords for each role — ensuring your resume stands out.'},{title:'💼 Multi-Role Platform',text:'Built for Admins to manage data, Trainers to guide candidates, and Users to track their resume performance — all within one unified portal.'}].map((c,i)=> (
          <div key={i} style={{flex:'1 1 300px',background:'rgba(255, 255, 255, 0.15)',borderRadius:20,padding:'30px 25px',boxShadow:'0 8px 25px rgba(0,0,0,0.2)'}}>
            <h2 style={{fontSize:'1.6rem',marginBottom:15,color:'#fff'}}>{c.title}</h2>
            <p style={{color:'rgba(255, 255, 255, 0.9)',fontSize:'1rem',lineHeight:1.6}}>{c.text}</p>
          </div>
        ))}
      </div>

      <div style={{textAlign:'center',padding:'60px 20px'}}>
        <h2 style={{fontSize:'2.2rem',marginBottom:30,color:'#fff'}}>Meet the Pinnacle Group</h2>
        <div style={{display:'flex',justifyContent:'center',flexWrap:'wrap',gap:25}}>
          {[['Manoj','AI Engineer'],['Sri Varsha','Full Stack Developer'],['Yuvashri','UI/UX Designer'],['Arjun Hareesh','Backend Developer']].map(([name,role]) => (
            <div key={name} style={{background:'rgba(255, 255, 255, 0.15)',borderRadius:20,padding:'20px 25px',width:200,boxShadow:'0 5px 20px rgba(0,0,0,0.25)'}}>
              <h3 style={{margin:'10px 0 5px',fontSize:'1.2rem'}}>{name}</h3>
              <p style={{color:'rgba(255, 255, 255, 0.85)',fontSize:'0.95rem',margin:0}}>{role}</p>
            </div>
          ))}
        </div>
      </div>

      <footer style={{textAlign:'center',padding:'30px 10px',color:'rgba(255, 255, 255, 0.8)',fontSize:'0.95rem'}}>
        <p><Link to="/" style={{color:'#00e5ff',textDecoration:'none',fontWeight:'bold'}}>Back to Home</Link></p>
      </footer>
    </div>
  );
}


