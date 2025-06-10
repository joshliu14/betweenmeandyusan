import React, { useState } from 'react';
import { Container, Row, Col, Form, Button, Card } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';

const SearchPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    setHasSearched(true);
    setLoading(true);
    
    try {
      const query = searchTerm.trim();
      const response = await fetch(`/.netlify/functions/get-veterans?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Error fetching veterans:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleVeteranClick = (veteranId) => {
    navigate(`/veteran/${veteranId}`);
  };

  const getFlagClass = (country) => {
    if (country === 'Denmark') return 'flag-icon flag-denmark';
    return 'flag-icon flag-us';
  };

  const truncateStory = (story, maxLength = 200) => {
    if (!story) return '';
    if (story.length <= maxLength) return story;
    return story.substring(0, maxLength).trim() + '...';
  };

  return (
    <div className="search-container">
      <Container>
        <div className="search-header">
          <div>
            <img src="/logo.png" alt="Logo" className="search-logo" />
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
                />
              </Col>
              <Col xs={4}>
                <Button type="submit" className="search-btn w-100">
                  Search
                </Button>
              </Col>
            </Row>
          </Form>
        </div>

        {loading && <p className="text-center mt-4">Loading results...</p>}

        {hasSearched && !loading && (
          <div className="results-container">
            {searchResults.length > 0 ? (
              searchResults.map((veteran) => (
                <Card 
                  key={veteran._id || veteran.id} 
                  className="veteran-card clickable-card"
                  onClick={() => handleVeteranClick(veteran._id || veteran.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <Row className="align-items-center">
                    <Col md={3} className="text-center">
                      <img
                        src={veteran.photo || '/default-veteran-photo.jpg'}
                        alt={veteran.name}
                        className="veteran-photo"
                        onError={(e) => {
                          e.target.src = '/default-veteran-photo.jpg';
                        }}
                      />
                    </Col>
                    <Col md={9}>
                      <div className="veteran-info">
                        <h3 className="veteran-name">
                          {veteran.name}
                          <span className={getFlagClass(veteran.country)}></span>
                        </h3>
                        <div className="veteran-details">
                          <p className="veteran-location">#{veteran.location}</p>
                          {veteran.branch && (
                            <p className="veteran-branch">
                              <strong>{veteran.branch}</strong>
                              {veteran.rank && ` • ${veteran.rank}`}
                              {veteran.serviceYears && ` • ${veteran.serviceYears}`}
                            </p>
                          )}
                        </div>
                        <p className="veteran-story">{truncateStory(veteran.story)}</p>
                        <div className="card-footer-actions">
                          <small className="text-muted">Click to read full story</small>
                        </div>
                      </div>
                    </Col>
                  </Row>
                </Card>
              ))
            ) : (
              <Card className="veteran-card text-center">
                <Card.Body>
                  <h4>No veterans found</h4>
                  <p>Try searching with different keywords or browse all stories.</p>
                  <Button 
                    variant="outline-primary" 
                    onClick={() => {
                      setSearchTerm('');
                      handleSearch({ preventDefault: () => {} });
                    }}
                  >
                    Browse All Stories
                  </Button>
                </Card.Body>
              </Card>
            )}
          </div>
        )}

        <div className="text-center mt-5">
          <Link to="/" className="btn-secondary">
            Back to Home
          </Link>
        </div>
      </Container>
    </div>
  );
};

export default SearchPage;