// src/components/HomePage.js

function HomePage() {
  return (
    <div className="home-container">
      {/* Animated background pattern */}
      <div className="background-pattern"></div>
      
      {/* Yin-Yang Wave Container with integrated buttons */}
      <div className="yin-yang-container">
        <svg className="yin-yang-wave" viewBox="0 0 1200 800" preserveAspectRatio="none">
          {/* Top section (Archive) - Red */}
          <defs>
            <clipPath id="topClip">
              <path d="M0,0 L1200,0 L1200,400 Q900,500 600,400 T0,400 Z" />
            </clipPath>
            <clipPath id="bottomClip">
              <path d="M0,400 Q300,300 600,400 T1200,400 L1200,800 L0,800 Z" />
            </clipPath>
          </defs>
          
          {/* Top clickable area with shape AND text */}
          <a href="/search" style={{textDecoration: 'none'}} className="top-button-group">
            <rect x="0" y="0" width="1200" height="400" fill="var(--korean-red)" clipPath="url(#topClip)" className="clickable-section top-shape" />
            <path d="M0,0 L1200,0 L1200,400 Q900,500 600,400 T0,400 Z" fill="var(--korean-red)" className="clickable-section top-shape" />
            <text x="600" y="180" textAnchor="middle" className="section-text archive-text top-text">ARCHIVE</text>
          </a>
          
          {/* Bottom clickable area with shape AND text */}
          <a href="/portal" style={{textDecoration: 'none'}} className="bottom-button-group">
            <rect x="0" y="400" width="1200" height="400" fill="var(--korean-blue)" clipPath="url(#bottomClip)" className="clickable-section bottom-shape" />
            <path d="M0,400 Q300,300 600,400 T1200,400 L1200,800 L0,800 Z" fill="var(--korean-blue)" className="clickable-section bottom-shape" />
            <text x="600" y="650" textAnchor="middle" className="section-text portal-text bottom-text">PORTAL</text>
          </a>
        </svg>
        
        {/* Main title with new animation */}
        <div className="main-title-container">
          <h1 className="main-title">
            <span className="title-word">BETWEEN</span>
            <span className="title-word">ME</span>
            <span className="title-word">AND</span>
            <span className="title-word">YUSAN</span>
          </h1>
        </div>
      </div>
    </div>
  );
}

export default HomePage;