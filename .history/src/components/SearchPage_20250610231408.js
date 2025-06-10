import React, { useState, useCallback, useMemo } from 'react';
import { Container, Row, Col, Form, Button, Card, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';

const SearchPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSearch = useCallback(async (e) => {
    e.preventDefault();
    const query = searchTerm.trim();

    setHasSearched(true);
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/.netlify/functions/get-veterans?q=${encodeURIComponent(query)}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch veterans`);
      }

      const data = await response.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching veterans:', error);
      setError('Failed to search veterans. Please try again.');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  const handleBrowseAll = useCallback(async () => {
    setSearchTerm('');
    setHasSearched(true);
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/.netlify/functions/get-veterans');

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch veterans`);
      }

      const data = await response.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching all veterans:', error);
      setError('Failed to load veterans. Please try again.');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleVeteranClick = useCallback((veteranId) => {
    // This always redirects to a specific static veteran page, as requested.
    navigate(`/veteran/bjarnechristensen`);
  }, [navigate]);

  const getFlagClass = useCallback((country) => {
    return country === 'Denmark' ? 'flag-icon flag-denmark' : 'flag-icon flag-us';
  }, []);

  const truncateStory = useCallback((story, maxLength = 200) => {
    if (!story) return '';
    if (story.length <= maxLength) return story;
    return story.substring(0, maxLength).trim() + '...';
  }, []);

  // --- START OF CHANGES FOR ALTERNATING IMAGES ---
  // Define your array of static image paths here.
  // Ensure these images are in your 'public' folder.
  const STATIC_VETERAN_IMAGES = useMemo(() => [
    '/bjarne.png', // Path to your first static image
    '/cresente.png'  // Path to your second static image
  ], []); // Memoize this array as it won't change

  // Memoize veteran cards to prevent unnecessary re-renders
  const veteranCards = useMemo(() => {
    return searchResults.map((veteran, index) => { // <--- Added 'index' here
      const veteranId = veteran._id || veteran.id;
      const veteranKey = `${veteranId}-${veteran.name}`;

      // Use the index to select an image from the array, cycling through them
      const currentStaticImagePath = STATIC_VETERAN_IMAGES[index % STATIC_VETERAN_IMAGES.length];

      return (
        <Card
          key={veteranKey}
          className="veteran-card clickable-card mb-3"
          onClick={() => handleVeteranClick(veteranId)}
          style={{ cursor: 'pointer' }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleVeteranClick(veteranId);
            }
          }}
          aria-label={`View details for ${veteran.name}`}
        >
          <Card.Body>
            <Row className="align-items-center">
              <Col md={3} className="text-center mb-3 mb-md-0">
                <img
                  src={currentStaticImagePath} // <--- Use the selected static image path
                  alt={`Portrait of ${veteran.name}`}
                  className="veteran-photo"
                  onError={(e) => {
                    e.target.src = '/default-veteran-photo.jpg'; // Fallback if a static image itself fails
                  }}
                  loading="lazy"
                />
              </Col>
              <Col md={9}>
                <div className="veteran-info">
                  <h3 className="veteran-name">
                    {veteran.name}
                  </h3>
                  <div className="veteran-details">
                    {veteran.location && (
                      <p className="veteran-location">#{veteran.location}</p>
                    )}
                    {veteran.branch && (
                      <p className="veteran-branch">
                        <strong>{veteran.branch}</strong>
                        {veteran.rank && ` • ${veteran.rank}`}
                        {veteran.serviceYears && ` • ${veteran.serviceYears}`}
                      </p>
                    )}
                  </div>
                  {veteran.story && (
                    <p className="veteran-story">{truncateStory(veteran.story)}</p>
                  )}
                  <div className="card-footer-actions">
                    <small className="text-muted">Click to read full story</small>
                  </div>
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      );
    });
  }, [searchResults, handleVeteranClick, getFlagClass, truncateStory, STATIC_VETERAN_IMAGES]);
  // --- END OF CHANGES FOR ALTERNATING IMAGES ---

  return (
    <div className="search-container">
      <Container>
        <div className="search-header">
          <div>
            <img src="/logo.png" alt="Between Me and Yusan Logo" className="search-logo" />
          </div>
          <h1 className="search-title">
            <span className="title-word">BETWEEN</span>{' '}
            <span className="title-word green">ME</span>{' '}
            <span className="title-word">AND</span>{' '}
            <span className="title-word green">YU</span>
            <span className="title-word">SAN</span>
          </h1>
          <Form onSubmit={handleSearch} className="search-form">
            <Row>
              <Col xs={8}>
                <Form.Control
                  type="text"
                  placeholder="Who is your veteran?"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                  aria-label="Search for veterans"
                />
              </Col>
              <Col xs={4}>
                <Button
                  type="submit"
                  className="search-btn w-100"
                  disabled={loading}
                >
                  {loading ? 'Searching...' : 'Search'}
                </Button>
              </Col>
            </Row>
          </Form>
        </div>

        {/* Error Message */}
        {error && (
          <Alert variant="danger" className="mt-4">
            <Alert.Heading>Search Error</Alert.Heading>
            <p>{error}</p>
            <Button variant="outline-danger" onClick={handleSearch}>
              Try Again
            </Button>
          </Alert>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center mt-4">
            <div className="spinner-border" role="status" aria-label="Loading search results">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2">Loading results...</p>
          </div>
        )}

        {/* Results */}
        {hasSearched && !loading && !error && (
          <div className="results-container mt-4">
            {searchResults.length > 0 ? (
              <>
                <div className="results-header mb-3">
                  <p className="text-muted">
                    Found {searchResults.length} veteran{searchResults.length !== 1 ? 's' : ''}
                    {searchTerm && ` for "${searchTerm}"`}
                  </p>
                </div>
                {veteranCards}
              </>
            ) : (
              <Card className="veteran-card text-center">
                <Card.Body>
                  <h4>No veterans found</h4>
                  <p>
                    {searchTerm
                      ? `No results found for "${searchTerm}". Try different keywords or browse all stories.`
                      : 'No veterans found in the database.'
                    }
                  </p>
                  <div className="mt-3">
                    <Button
                      variant="outline-primary"
                      onClick={handleBrowseAll}
                      className="me-2"
                    >
                      Browse All Stories
                    </Button>
                    {searchTerm && (
                      <Button
                        variant="outline-secondary"
                        onClick={() => {
                          setSearchTerm('');
                          setSearchResults([]);
                          setHasSearched(false);
                        }}
                      >
                        Clear Search
                      </Button>
                    )}
                  </div>
                </Card.Body>
              </Card>
            )}
          </div>
        )}

        <div className="text-center mt-5">
          <Link to="/" className="btn btn-secondary">
            Back to Home
          </Link>
        </div>
      </Container>
    </div>
  );
};

export default SearchPage;