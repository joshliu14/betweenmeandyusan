import React from 'react';
// If your image is in src/assets or similar, you might import it
// import myImage from './path/to/your/image.jpg';

const StaticPage = () => {
  return (
    <div>
      <h1>Welcome to My Image Page</h1>
      <img
        src="/path/to/your/image.jpg" // Or {myImage} if imported
        alt="A beautiful landscape"
        style={{ maxWidth: '100%', height: 'auto', display: 'block', margin: '0 auto' }}
      />
      <p>This is a simple page displaying one image.</p>
    </div>
  );
};

export default StaticPage;