// src/components/PortalPage.js
import React from 'react';
import { Container, Row, Col, Card} from 'react-bootstrap';
import { Link } from 'react-router-dom';

const PortalPage = () => {
  return (
    <div className="portal-container">
      <Container>
        <div className="portal-content">
          <h1 className="portal-title">Veteran Portal</h1>
          <p className="portal-subtitle">
            Share your story with the world. Your experiences matter and deserve to be preserved for future generations.
          </p>

          <Row className="justify-content-center">
            <Col lg={8}>
              <Card className="portal-card">
                <Card.Body>
                  <h3 className="mb-4">Welcome, Veteran</h3>
                  <p className="lead mb-4">
                    This is a safe space to share your experiences from the Korean War. 
                    Your story will help preserve history and honor your service.
                  </p>
                  
                  <div className="mb-4">
                    <h5>What we'll ask you:</h5>
                    <ul className="text-left" style={{maxWidth: '400px', margin: '0 auto'}}>
                      <li>Your name and basic information</li>
                      <li>Your service details</li>
                      <li>Your story and experiences</li>
                      <li>Any photos you'd like to share (optional)</li>
                    </ul>
                  </div>

                  <div className="d-flex gap-3 justify-content-center flex-wrap">
                    <Link to="/submit-story" className="btn btn-primary">
                      Share My Story
                    </Link>
                    <Link to="/" className="btn btn-secondary">
                      Back to Home
                    </Link>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Row className="mt-5">
            <Col md={6}>
              <Card className="portal-card h-100">
                <Card.Body>
                  <h4>Your Privacy Matters</h4>
                  <p>
                    Your story will only be shared with your permission. 
                    You can choose what details to include and can request 
                    changes or removal at any time.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="portal-card h-100">
                <Card.Body>
                  <h4>Preserve History</h4>
                  <p>
                    By sharing your story, you're contributing to an important 
                    historical record that will help future generations understand 
                    the Korean War and honor those who served.
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </div>
      </Container>
    </div>
  );
};

export default PortalPage;
