import { Link } from 'react-router-dom';

export default function Contact() {
  return (
    <div style={{minHeight:'100vh',color:'#fff',textAlign:'center',padding:60,background:'linear-gradient(135deg, #ff00cc, #333399, #00c9ff, #92fe9d)',backgroundSize:'400% 400%'}}>
      <h1 style={{fontSize:'2.8rem',marginBottom:30}}>Contact Us</h1>
      <div style={{background:'rgba(255,255,255,0.15)',borderRadius:15,padding:25,maxWidth:600,margin:'auto',backdropFilter:'blur(10px)'}}>
        <p>📧 <strong>Emails:</strong></p>
        <p>manojk.cs24@bitsathy.ac.in</p>
        <p>yuvashrim.cs24@bitsathy.ac.in</p>
        <p>srivarshap.cs24@bitsathy.ac.in</p>
        <br />
        <p>📞 <strong>Phone Numbers:</strong></p>
        <p>7010404284 | 7548842310</p>
      </div>
      <p style={{marginTop:40}}><Link to="/" style={{color:'#fff',textDecoration:'underline'}}>⬅ Back to Home</Link></p>
    </div>
  );
}


