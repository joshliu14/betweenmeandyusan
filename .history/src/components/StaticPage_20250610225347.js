import React from 'react';

const StaticPage = () => {
  return (
    <div>
      <h1>Welcome to My Image Page</h1>
      <img
        src="../../public/static-page.png"
        alt="Valdemar story"
        style={{ maxWidth: '100%', height: 'auto', display: 'block', margin: '0 auto' }}
      />
      <p>This is a simple page displaying one image.</p>
    </div>
  );
};

export default StaticPage;