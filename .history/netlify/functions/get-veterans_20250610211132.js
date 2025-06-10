// netlify/functions/get-veterans.js
const { MongoClient, ObjectId } = require('mongodb');

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
  return cachedDb.collection('betweenmeandyusan');
};

const findVeteranById = async (collection, veteranId) => {
  // Try multiple ID formats
  const queries = [];
  
  // Try ObjectId if valid
  if (ObjectId.isValid(veteranId)) {
    queries.push({ _id: new ObjectId(veteranId) });
  }
  
  // Try string variations
  queries.push(
    { _id: veteranId },
    { id: veteranId },
    { veteranId: veteranId }
  );
  
  for (const query of queries) {
    try {
      const veteran = await collection.findOne(query);
      if (veteran) return veteran;
    } catch (error) {
      console.log(`Query failed for ${JSON.stringify(query)}:`, error.message);
    }
  }
  
  return null;
};

const searchVeterans = async (collection, searchTerm) => {
  const query = searchTerm ? {
    $or: [
      { name: { $regex: searchTerm, $options: 'i' } },
      { location: { $regex: searchTerm, $options: 'i' } },
      { story: { $regex: searchTerm, $options: 'i' } },
      { country: { $regex: searchTerm, $options: 'i' } },
      { branch: { $regex: searchTerm, $options: 'i' } },
      { rank: { $regex: searchTerm, $options: 'i' } },
      { unit: { $regex: searchTerm, $options: 'i' } }
    ],
  } : {};
  
  return await collection.find(query)
    .limit(50) // Prevent excessive results
    .toArray();
};

exports.handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const collection = await connectToDatabase();
    const { q: searchTerm, id: veteranId } = event.queryStringParameters || {};

    // Handle individual veteran detail request
    if (veteranId) {
      const veteran = await findVeteranById(collection, veteranId);
      
      if (!veteran) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Veteran not found' }),
        };
      }

      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        },
        body: JSON.stringify(veteran),
      };
    }

    // Handle search/list request
    const veterans = await searchVeterans(collection, searchTerm);

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Cache-Control': 'public, max-age=60', // Cache search results for 1 minute
      },
      body: JSON.stringify(veterans),
    };

  } catch (error) {
    console.error('Function error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Failed to fetch data'
      }),
    };
  }
};