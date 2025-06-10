// src/components/StorySubmissionPage.js
import React, { useState } from 'react';
import { Container, Row, Col, Form, Button, Card, Alert, ProgressBar } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const StorySubmissionPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    location: '',
    serviceYears: '',
    branch: '',
    rank: '',
    unit: '',
    story: '',
    consent: false,
    contactEmail: ''
  });
  
  const [files, setFiles] = useState({
    photo: null,
    video: null
  });
  
  const [previews, setPreviews] = useState({
    photo: null,
    video: null
  });
  
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleFileChange = (e) => {
    const { name, files: fileList } = e.target;
    const file = fileList[0];
    
    if (!file) return;
    
    // Validate file size (10MB limit for photos, 100MB for videos)
    const maxSize = name === 'photo' ? 10 * 1024 * 1024 : 100 * 1024 * 1024;
    if (file.size > maxSize) {
      setErrors(prev => ({
        ...prev,
        [name]: `File size must be less than ${name === 'photo' ? '10MB' : '100MB'}`
      }));
      return;
    }
    
    // Validate file type
    const validTypes = name === 'photo' 
      ? ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      : ['video/mp4', 'video/webm', 'video/mov'];
    
    if (!validTypes.includes(file.type)) {
      setErrors(prev => ({
        ...prev,
        [name]: `Invalid file type. Please upload ${name === 'photo' ? 'JPEG, PNG, or WebP' : 'MP4, WebM, or MOV'} files only.`
      }));
      return;
    }
    
    // Clear errors
    setErrors(prev => ({
      ...prev,
      [name]: ''
    }));
    
    // Set file
    setFiles(prev => ({
      ...prev,
      [name]: file
    }));
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviews(prev => ({
        ...prev,
        [name]: e.target.result
      }));
    };
    reader.readAsDataURL(file);
  };

  const removeFile = (type) => {
    setFiles(prev => ({
      ...prev,
      [type]: null
    }));
    setPreviews(prev => ({
      ...prev,
      [type]: null
    }));
    // Clear the file input
    const fileInput = document.querySelector(`input[name="${type}"]`);
    if (fileInput) fileInput.value = '';
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.location.trim()) newErrors.location = 'Location is required';
    if (!formData.serviceYears.trim()) newErrors.serviceYears = 'Service years are required';
    if (!formData.branch.trim()) newErrors.branch = 'Military branch is required';
    if (!formData.story.trim()) newErrors.story = 'Please share your story';
    if (!formData.consent) newErrors.consent = 'Consent is required to share your story';
    
    // Validate email format if provided
    if (formData.contactEmail && !/\S+@\S+\.\S+/.test(formData.contactEmail)) {
      newErrors.contactEmail = 'Please enter a valid email address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const uploadFileToNetlify = async (file, type) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    
    const response = await fetch('/.netlify/functions/upload-media', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to upload file');
    }
    
    return response.json();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      let photoData = null;
      let videoData = null;
      
      // Upload photo if provided
      if (files.photo) {
        setUploadProgress(25);
        photoData = await uploadFileToNetlify(files.photo, 'photo');
      }
      
      // Upload video if provided
      if (files.video) {
        setUploadProgress(50);
        videoData = await uploadFileToNetlify(files.video, 'video');
      }
      
      setUploadProgress(75);
      
      // Submit story data
      const storyData = {
        ...formData,
        submittedAt: new Date().toISOString(),
        age: formData.age ? parseInt(formData.age) : null,
        photoUrl: photoData?.url || null,
        photoId: photoData?.id || null,
        videoUrl: videoData?.url || null,
        videoId: videoData?.id || null
      };
      
      const response = await fetch('/.netlify/functions/put-veterans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(storyData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit story');
      }

      setUploadProgress(100);
      console.log('Story submitted successfully:', result);
      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting story:', error);
      setSubmitError(error.message || 'Failed to submit story. Please try again.');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  if (submitted) {
    return (
      <div className="portal-container">
        <Container>
          <Row className="justify-content-center">
            <Col lg={8}>
              <Card className="portal-card text-center">
                <Card.Body>
                  <h2 className="text-success mb-4">Thank You!</h2>
                  <p className="lead">
                    Your story has been submitted successfully. It will be reviewed and added to our archive soon.
                  </p>
                  <p>
                    Thank you for sharing your experiences and contributing to this important historical record.
                  </p>
                  <div className="mt-4">
                    <Link to="/" className="btn btn-primary me-3">
                      Return Home
                    </Link>
                    <Link to="/search" className="btn btn-secondary">
                      View Archive
                    </Link>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }

  return (
    <div className="portal-container">
      <Container>
        <div className="portal-content">
          <h1 className="portal-title">Share Your Story</h1>
          <p className="portal-subtitle">
            Help us preserve your important experiences for future generations.
          </p>

          <Row className="justify-content-center">
            <Col lg={10}>
              <Card className="portal-card">
                <Card.Body>
                  {submitError && (
                    <Alert variant="danger" className="mb-4">
                      {submitError}
                    </Alert>
                  )}
                  
                  {loading && uploadProgress > 0 && (
                    <div className="mb-4">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span>Uploading...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <ProgressBar now={uploadProgress} animated />
                    </div>
                  )}
                  
                  <Form onSubmit={handleSubmit} className="story-form">
                    <Row>
                      <Col md={6}>
                        <Form.Group className="form-group">
                          <Form.Label className="form-label">Full Name *</Form.Label>
                          <Form.Control
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            isInvalid={!!errors.name}
                            disabled={loading}
                          />
                          <Form.Control.Feedback type="invalid">
                            {errors.name}
                          </Form.Control.Feedback>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="form-group">
                          <Form.Label className="form-label">Age (optional)</Form.Label>
                          <Form.Control
                            type="number"
                            name="age"
                            value={formData.age}
                            onChange={handleChange}
                            disabled={loading}
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <Row>
                      <Col md={6}>
                        <Form.Group className="form-group">
                          <Form.Label className="form-label">Location/Hometown *</Form.Label>
                          <Form.Control
                            type="text"
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                            isInvalid={!!errors.location}
                            disabled={loading}
                          />
                          <Form.Control.Feedback type="invalid">
                            {errors.location}
                          </Form.Control.Feedback>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="form-group">
                          <Form.Label className="form-label">Years of Service *</Form.Label>
                          <Form.Control
                            type="text"
                            name="serviceYears"
                            placeholder="e.g., 1950-1953"
                            value={formData.serviceYears}
                            onChange={handleChange}
                            isInvalid={!!errors.serviceYears}
                            disabled={loading}
                          />
                          <Form.Control.Feedback type="invalid">
                            {errors.serviceYears}
                          </Form.Control.Feedback>
                        </Form.Group>
                      </Col>
                    </Row>

                    <Row>
                      <Col md={4}>
                        <Form.Group className="form-group">
                          <Form.Label className="form-label">Military Branch *</Form.Label>
                          <Form.Select
                            name="branch"
                            value={formData.branch}
                            onChange={handleChange}
                            isInvalid={!!errors.branch}
                            disabled={loading}
                          >
                            <option value="">Select Branch</option>
                            <option value="Army">Army</option>
                            <option value="Navy">Navy</option>
                            <option value="Air Force">Air Force</option>
                            <option value="Marines">Marines</option>
                            <option value="Coast Guard">Coast Guard</option>
                            <option value="Other">Other</option>
                          </Form.Select>
                          <Form.Control.Feedback type="invalid">
                            {errors.branch}
                          </Form.Control.Feedback>
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="form-group">
                          <Form.Label className="form-label">Rank (optional)</Form.Label>
                          <Form.Control
                            type="text"
                            name="rank"
                            value={formData.rank}
                            onChange={handleChange}
                            disabled={loading}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="form-group">
                          <Form.Label className="form-label">Unit (optional)</Form.Label>
                          <Form.Control
                            type="text"
                            name="unit"
                            value={formData.unit}
                            onChange={handleChange}
                            disabled={loading}
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <Form.Group className="form-group">
                      <Form.Label className="form-label">Contact Email (optional)</Form.Label>
                      <Form.Control
                        type="email"
                        name="contactEmail"
                        value={formData.contactEmail}
                        onChange={handleChange}
                        placeholder="For follow-up questions only"
                        isInvalid={!!errors.contactEmail}
                        disabled={loading}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.contactEmail}
                      </Form.Control.Feedback>
                    </Form.Group>

                    {/* Photo Upload Section */}
                    <Form.Group className="form-group">
                      <Form.Label className="form-label">Photo (optional)</Form.Label>
                      <Form.Control
                        type="file"
                        name="photo"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleFileChange}
                        isInvalid={!!errors.photo}
                        disabled={loading}
                      />
                      <Form.Text className="text-muted">
                        Upload a photo (JPEG, PNG, or WebP, max 10MB)
                      </Form.Text>
                      <Form.Control.Feedback type="invalid">
                        {errors.photo}
                      </Form.Control.Feedback>
                      
                      {previews.photo && (
                        <div className="mt-3">
                          <div className="position-relative d-inline-block">
                            <img
                              src={previews.photo}
                              alt="Preview"
                              style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'cover' }}
                              className="rounded"
                            />
                            <Button
                              variant="danger"
                              size="sm"
                              className="position-absolute top-0 end-0"
                              onClick={() => removeFile('photo')}
                              style={{ transform: 'translate(50%, -50%)' }}
                            >
                              ×
                            </Button>
                          </div>
                        </div>
                      )}
                    </Form.Group>

                    {/* Video Upload Section */}
                    <Form.Group className="form-group">
                      <Form.Label className="form-label">Video (optional)</Form.Label>
                      <Form.Control
                        type="file"
                        name="video"
                        accept="video/mp4,video/webm,video/mov"
                        onChange={handleFileChange}
                        isInvalid={!!errors.video}
                        disabled={loading}
                      />
                      <Form.Text className="text-muted">
                        Upload a video (MP4, WebM, or MOV, max 100MB)
                      </Form.Text>
                      <Form.Control.Feedback type="invalid">
                        {errors.video}
                      </Form.Control.Feedback>
                      
                      {previews.video && (
                        <div className="mt-3">
                          <div className="position-relative d-inline-block">
                            <video
                              src={previews.video}
                              controls
                              style={{ maxWidth: '300px', maxHeight: '200px' }}
                              className="rounded"
                            />
                            <Button
                              variant="danger"
                              size="sm"
                              className="position-absolute top-0 end-0"
                              onClick={() => removeFile('video')}
                              style={{ transform: 'translate(50%, -50%)' }}
                            >
                              ×
                            </Button>
                          </div>
                        </div>
                      )}
                    </Form.Group>

                    <Form.Group className="form-group">
                      <Form.Label className="form-label">Your Story *</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={8}
                        name="story"
                        value={formData.story}
                        onChange={handleChange}
                        placeholder="Please share your experiences, memories, and reflections from your time during the Korean War. Include details about battles you participated in, people you met, challenges you faced, or any other memories you'd like to preserve."
                        isInvalid={!!errors.story}
                        disabled={loading}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.story}
                      </Form.Control.Feedback>
                    </Form.Group>

                    <Form.Group className="form-group">
                      <Form.Check
                        type="checkbox"
                        name="consent"
                        checked={formData.consent}
                        onChange={handleChange}
                        label="I consent to sharing my story in the public archive and understand that it will be visible to visitors of this website."
                        isInvalid={!!errors.consent}
                        disabled={loading}
                      />
                      <Form.Control.Feedback type="invalid">
                        {errors.consent}
                      </Form.Control.Feedback>
                    </Form.Group>

                    <div className="text-center mt-4">
                      <Button 
                        type="submit" 
                        className="btn-primary me-3"
                        disabled={loading}
                      >
                        {loading ? 'Submitting...' : 'Submit Story'}
                      </Button>
                      <Link to="/portal" className="btn-secondary">
                        Back
                      </Link>
                    </div>
                  </Form>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </div>
      </Container>
    </div>
  );
};

export default StorySubmissionPage;