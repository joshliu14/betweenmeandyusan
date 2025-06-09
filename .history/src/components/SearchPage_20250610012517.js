// src/components/SearchPage.js
import React, { useState } from 'react';
import { Container, Row, Col, Form, Button, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const SearchPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Sample veteran data
  const veteransData = [
    {
      id: 1,
      name: 'Valdemar Name',
      location: 'JUTLANDIA',
      photo: '/api/placeholder/150/200',
      story: 'Served in the Korean War from 1950-1953. Witnessed the Battle of Chosin Reservoir.',
      country: 'Denmark'
    },
    {
      id: 2,
      name: 'James Smith',
      location: 'CALIFORNIA',
      photo: '/api/placeholder/150/200',
      story: 'Marine Corps veteran who fought in the Inchon Landing.',
      country: 'United States'
    },
    {
      id: 3,
      name: 'Robert Johnson',
      location: 'TEXAS',
      photo: '/api/placeholder/150/200',
      story: 'Army veteran who served as a medic during the conflict.',
      country: 'United States'
    }
  ];

  const handleSearch = (e) => {
    e.preventDefault();
    setHasSearched(true);
    
    if (searchTerm.trim() === '') {
      setSearchResults(veteransData);
    } else {
      const filtered = veteransData.filter(veteran =>
        veteran.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        veteran.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        veteran.story.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setSearchResults(filtered);
    }
  };

  const getFlagClass = (country) => {
    if (country === 'Denmark') return 'flag-icon flag-denmark';
    return 'flag-icon flag-us';
  };

  return (
    <div className="search-container">
      <Container>
        <div className="search-header">
          <div className="logo-container">
          <img src="/logo.png" alt="Logo" className="navbar-logo" />
        </div>
          <h1 className="search-title">BETWEEN ME AND YUSAN</h1>
          
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

        {hasSearched && (
          <div className="results-container">
            {searchResults.length > 0 ? (
              searchResults.map((veteran) => (
                <Card key={veteran.id} className="veteran-card">
                  <Row className="align-items-center">
                    <Col md={3} className="text-center">
                      <img
                        src={veteran.photo}
                        alt={veteran.name}
                        className="veteran-photo"
                      />
                    </Col>
                    <Col md={9}>
                      <div className="veteran-info">
                        <h3 className="veteran-name">
                          {veteran.name}
                          <span className={getFlagClass(veteran.country)}></span>
                        </h3>
                        <p className="veteran-location">#{veteran.location}</p>
                        <p className="veteran-story">{veteran.story}</p>
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
