const StaticPage = () => {
  return (
    <div>
      <img
        src="/static-page.png" // <--- CHANGED THIS LINE
        alt="Valdemar story"
        style={{ maxWidth: '100%', height: 'auto', display: 'block', margin: '0 auto' }}
      />
      <p>This is a simple page displaying one image.</p>
    </div>
  );
};

export default StaticPage;