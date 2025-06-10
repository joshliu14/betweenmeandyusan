// netlify/functions/get-veteran-detail.js
const { MongoClient, ObjectId } = require('mongodb');

let cachedClient = null;
let cachedDb = null;

exports.handler = async (event) => {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    // Get the veteran ID from query parameters
    const veteranId = event.queryStringParameters?.id;
    
    if (!veteranId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Veteran ID is required' }),
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

    let veteran;
    
    // Try to find by ObjectId first
    try {
      if (ObjectId.isValid(veteranId)) {
        veteran = await collection.findOne({ _id: new ObjectId(veteranId) });
      }
    } catch (objectIdError) {
      console.log('Invalid ObjectId format, trying as string:', objectIdError.message);
    }

    // If not found by ObjectId, try finding by string ID
    if (!veteran) {
      veteran = await collection.findOne({ _id: veteranId });
    }

    // If still not found, try finding by other identifiers
    if (!veteran) {
      veteran = await collection.findOne({ 
        $or: [
          { id: veteranId },
          { veteranId: veteranId }
        ]
      });
    }

    if (!veteran) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Veteran not found' }),
      };
    }

    // Return the veteran data
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
      body: JSON.stringify(veteran),
    };

  } catch (error) {
    console.error('Function error:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal Server Error',
        message: 'Failed to fetch veteran details'
      }),
    };
  }
};