const StaticPage = () => {
  return (
    <div style={{ textAlign: 'center', paddingTop: '50px' }}> {/* Add padding-top to the container */}
      <img
        src="/static-page.png"
        alt="Valdemar story"
        style={{
          width: '100%',     // Make image fill 100% of its parent's width
          height: 'auto',     // Maintain aspect ratio
          display: 'block',   // Remove extra space below image if it's inline
          margin: '0 auto'    // Center the image if its parent has a width limit
        }}
      />
    </div>
  );
};

export default StaticPage;