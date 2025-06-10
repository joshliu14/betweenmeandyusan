// netlify/functions/put-veterans.js
const { MongoClient } = require('mongodb');

let cachedClient = null;
let cachedDb = null;

const connectToDatabase = async () => {
  if (!cachedClient || !cachedDb) {
    cachedClient = new MongoClient(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await cachedClient.connect();
    cachedDb = cachedClient.db('yusanstories');
  }
  return cachedDb;
};

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    // Parse the request body
    let storyData;
    try {
      storyData = JSON.parse(event.body);
    } catch (parseError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body' }),
      };
    }

    // Validate required fields
    const requiredFields = ['name', 'location', 'serviceYears', 'branch', 'story', 'consent'];
    const missingFields = requiredFields.filter(field => !storyData[field]);
    
    if (missingFields.length > 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: `Missing required fields: ${missingFields.join(', ')}` 
        }),
      };
    }

    // Validate consent
    if (!storyData.consent) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Consent is required to submit story' }),
      };
    }

    // Connect to MongoDB
    const db = await connectToDatabase();
    const collection = db.collection('betweenmeandyusan');

    // Prepare the document for insertion
    const veteranStory = {
      name: storyData.name.trim(),
      age: storyData.age ? parseInt(storyData.age) : null,
      location: storyData.location.trim(),
      serviceYears: storyData.serviceYears.trim(),
      branch: storyData.branch.trim(),
      rank: storyData.rank ? storyData.rank.trim() : null,
      unit: storyData.unit ? storyData.unit.trim() : null,
      story: storyData.story.trim(),
      contactEmail: storyData.contactEmail ? storyData.contactEmail.trim() : null,
      consent: true,
      submittedAt: new Date(),
      status: 'pending', // For moderation
      
      // Media fields
      photoUrl: storyData.photoUrl || null,
      photoId: storyData.photoId || null,
      videoUrl: storyData.videoUrl || null,
      videoId: storyData.videoId || null,
      
      // Additional optional fields
      biography: storyData.biography ? storyData.biography.trim() : null,
      medals: storyData.medals ? storyData.medals.trim() : null,
      campaigns: storyData.campaigns ? storyData.campaigns.trim() : null,
      additionalInfo: storyData.additionalInfo ? storyData.additionalInfo.trim() : null,
      country: storyData.country || 'United States', // Default to US
    };

    // Insert the story into the database
    const result = await collection.insertOne(veteranStory);

    if (!result.insertedId) {
      throw new Error('Failed to insert story into database');
    }

    // Return success response
    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Story submitted successfully',
        id: result.insertedId,
        veteranStory: {
          ...veteranStory,
          _id: result.insertedId
        }
      }),
    };

  } catch (error) {
    console.error('Function error:', error);
    
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({ error: 'A story with similar content already exists' }),
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Failed to submit story. Please try again later.'
      }),
    };
  }
};