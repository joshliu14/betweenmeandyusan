import React, { useState } from 'react';

const StaticPage = () => {
  const [loading, setLoading] = useState(true); // State to track loading status

  const handleImageLoad = () => {
    setLoading(false); // Set loading to false once the image is loaded
  };

  return (
    <div style={{ textAlign: 'center', paddingTop: '50px' }}>
      {loading && ( // Conditionally render the loading sign
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '200px', // Adjust height as needed for your loading indicator
          fontSize: '20px',
          color: '#555'
        }}>
          Loading image...
          {/* You can replace this with a more sophisticated spinner or GIF */}
        </div>
      )}

      <img
        src="/static-page.jpg"
        alt="Valdemar story"
        onLoad={handleImageLoad} // Call handleImageLoad when the image is fully loaded
        style={{
          width: '100%',
          height: 'auto',
          display: loading ? 'none' : 'block', // Hide image while loading, show when loaded
          margin: '0 auto'
        }}
      />
    </div>
  );
};

export default StaticPage;