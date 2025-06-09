// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import HomePage from './components/HomePage';
import SearchPage from './components/SearchPage';
import PortalPage from './components/PortalPage';
import StorySubmissionPage from './components/StorySubmissionPage';
import Navigation from './components/Navigation';

function App() {
  return (
    <Router>
      <div className="App">
        <Navigation />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/portal" element={<PortalPage />} />
          <Route path="/submit-story" element={<StorySubmissionPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
