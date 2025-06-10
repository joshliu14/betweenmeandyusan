// netlify/functions/put-veterans.js
const { MongoClient } = require('mongodb');

let cachedClient = null;
let cachedDb = null;

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
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
        body: JSON.stringify({ error: 'Invalid JSON in request body' }),
      };
    }

    // Validate required fields
    const requiredFields = ['name', 'location', 'serviceYears', 'branch', 'story', 'consent'];
    const missingFields = requiredFields.filter(field => !storyData[field]);
    
    if (missingFields.length > 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          error: `Missing required fields: ${missingFields.join(', ')}` 
        }),
      };
    }

    // Validate consent
    if (!storyData.consent) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Consent is required to submit story' }),
      };
    }

    // Connect to MongoDB
    if (!cachedClient || !cachedDb) {
      cachedClient = new MongoClient(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      await cachedClient.connect();
      cachedDb = cachedClient.db('yusanstories'); // Use your actual DB name
    }

    const collection = cachedDb.collection('betweenmeandyusan'); // Use your actual collection name

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
      consent: true, // We already validated this
      submittedAt: new Date(),
      // Add any additional fields you want to track
      status: 'pending', // You might want to moderate stories before making them public
    };

    // Insert the story into the database
    const result = await collection.insertOne(veteranStory);

    if (!result.insertedId) {
      throw new Error('Failed to insert story into database');
    }

    // Return success response
    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        message: 'Story submitted successfully',
        id: result.insertedId,
      }),
    };

  } catch (error) {
    console.error('Function error:', error);
    
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: 'A story with similar content already exists' }),
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal Server Error',
        message: 'Failed to submit story. Please try again later.'
      }),
    };
  }
};