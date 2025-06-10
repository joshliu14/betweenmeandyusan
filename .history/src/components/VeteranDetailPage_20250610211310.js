import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Alert, Spinner } from 'react-bootstrap';
import { Link, useParams, useNavigate } from 'react-router-dom';

const VeteranDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [veteran, setVeteran] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchVeteranDetail();
  }, [id]);

  const fetchVeteranDetail = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`/.netlify/functions/get-veteran-detail?id=${encodeURIComponent(id)}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Veteran not found');
        } else {
          throw new Error('Failed to fetch veteran details');
        }
        return;
      }
      
      const data = await response.json();
      setVeteran(data);
    } catch (error) {
      console.error('Error fetching veteran details:', error);
      setError('Failed to load veteran details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getFlagClass = (country) => {
    if (country === 'Denmark') return 'flag-icon flag-denmark';
    return 'flag-icon flag-us';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="veteran-detail-container">
        <Container>
          <div className="text-center mt-5">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
            <p className="mt-3">Loading veteran details...</p>
          </div>
        </Container>
      </div>
    );
  }

  if (error) {
    return (
      <div className="veteran-detail-container">
        <Container>
          <div className="text-center mt-5">
            <Alert variant="danger">
              <h4>Error</h4>
              <p>{error}</p>
              <div className="mt-3">
                <Button variant="primary" onClick={() => navigate('/search')}>
                  Back to Search
                </Button>
                <Button variant="outline-secondary" className="ms-2" onClick={fetchVeteranDetail}>
                  Try Again
                </Button>
              </div>
            </Alert>
          </div>
        </Container>
      </div>
    );
  }

  if (!veteran) {
    return (
      <div className="veteran-detail-container">
        <Container>
          <div className="text-center mt-5">
            <Alert variant="warning">
              <h4>Veteran Not Found</h4>
              <p>The veteran profile you're looking for could not be found.</p>
              <Button variant="primary" onClick={() => navigate('/search')}>
                Back to Search
              </Button>
            </Alert>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="veteran-detail-container">
      <Container>
        {/* Header */}
        <div className="veteran-detail-header mb-4">
          <Row className="align-items-center">
            <Col>
              <Button 
                variant="outline-secondary" 
                onClick={() => navigate(-1)}
                className="mb-3"
              >
                ← Back
              </Button>
              <h1 className="veteran-detail-title">
                <span className="title-word">BETWEEN</span>{' '}
                <span className="title-word green">ME</span>{' '}
                <span className="title-word">AND</span>{' '}
                <span className="title-word green">YU</span>
                <span className="title-word">SAN</span>
              </h1>
            </Col>
          </Row>
        </div>

        {/* Main Content */}
        <Row>
          {/* Left Column - Photo and Basic Info */}
          <Col lg={4} className="mb-4">
            <Card className="veteran-profile-card">
              <div className="text-center p-4">
                <img
                  src={veteran.photo || '/default-veteran-photo.jpg'}
                  alt={veteran.name}
                  className="veteran-detail-photo mb-3"
                  onError={(e) => {
                    e.target.src = '/default-veteran-photo.jpg';
                  }}
                />
                <h2 className="veteran-detail-name">
                  {veteran.name}
                  <span className={getFlagClass(veteran.country)}></span>
                </h2>
                
                {/* Service Information */}
                <div className="service-info mt-3">
                  {veteran.branch && (
                    <Badge bg="primary" className="me-2 mb-2">{veteran.branch}</Badge>
                  )}
                  {veteran.rank && (
                    <Badge bg="secondary" className="me-2 mb-2">{veteran.rank}</Badge>
                  )}
                  {veteran.unit && (
                    <Badge bg="info" className="me-2 mb-2">{veteran.unit}</Badge>
                  )}
                </div>

                {/* Basic Details */}
                <div className="basic-details mt-4 text-start">
                  {veteran.location && (
                    <p><strong>Location:</strong> {veteran.location}</p>
                  )}
                  {veteran.age && (
                    <p><strong>Age:</strong> {veteran.age}</p>
                  )}
                  {veteran.serviceYears && (
                    <p><strong>Service Years:</strong> {veteran.serviceYears}</p>
                  )}
                  {veteran.submittedAt && (
                    <p><strong>Story Submitted:</strong> {formatDate(veteran.submittedAt)}</p>
                  )}
                </div>
              </div>
            </Card>

            {/* Video Section */}
            {veteran.videoUrl && (
              <Card className="mt-4">
                <Card.Header>
                  <h5>Video Interview</h5>
                </Card.Header>
                <Card.Body className="p-0">
                  <div className="video-container">
                    <video
                      controls
                      width="100%"
                      poster={veteran.videoPoster || veteran.photo}
                    >
                      <source src={veteran.videoUrl} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  </div>
                </Card.Body>
              </Card>
            )}
          </Col>

          {/* Right Column - Story and Biography */}
          <Col lg={8}>
            {/* Story Section */}
            <Card className="mb-4">
              <Card.Header>
                <h3>Story</h3>
              </Card.Header>
              <Card.Body>
                <div className="story-content">
                  {veteran.story ? (
                    <div className="formatted-story">
                      {veteran.story.split('\n').map((paragraph, index) => (
                        paragraph.trim() && (
                          <p key={index} className="story-paragraph">
                            {paragraph}
                          </p>
                        )
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted">No story available.</p>
                  )}
                </div>
              </Card.Body>
            </Card>

            {/* Biography Section */}
            {veteran.biography && (
              <Card className="mb-4">
                <Card.Header>
                  <h3>Biography</h3>
                </Card.Header>
                <Card.Body>
                  <div className="biography-content">
                    {veteran.biography.split('\n').map((paragraph, index) => (
                      paragraph.trim() && (
                        <p key={index} className="biography-paragraph">
                          {paragraph}
                        </p>
                      )
                    ))}
                  </div>
                </Card.Body>
              </Card>
            )}

            {/* Additional Details */}
            {(veteran.medals || veteran.campaigns || veteran.additionalInfo) && (
              <Card className="mb-4">
                <Card.Header>
                  <h3>Additional Information</h3>
                </Card.Header>
                <Card.Body>
                  {veteran.medals && (
                    <div className="mb-3">
                      <h5>Medals & Awards</h5>
                      <p>{veteran.medals}</p>
                    </div>
                  )}
                  {veteran.campaigns && (
                    <div className="mb-3">
                      <h5>Campaigns</h5>
                      <p>{veteran.campaigns}</p>
                    </div>
                  )}
                  {veteran.additionalInfo && (
                    <div className="mb-3">
                      <h5>Additional Details</h5>
                      <p>{veteran.additionalInfo}</p>
                    </div>
                  )}
                </Card.Body>
              </Card>
            )}
          </Col>
        </Row>

        {/* Navigation Footer */}
        <div className="text-center mt-5 mb-4">
          <Link to="/search" className="btn btn-primary me-3">
            Back to Search
          </Link>
          <Link to="/" className="btn btn-secondary">
            Home
          </Link>
        </div>
      </Container>
    </div>
  );
};

export default VeteranDetailPage;