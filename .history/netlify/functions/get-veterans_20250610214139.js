// netlify/functions/get-veterans.js
const { MongoClient, ObjectId, GridFSBucket } = require('mongodb');

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

const getMediaFromGridFS = async (db, fileId, type) => {
  const bucket = new GridFSBucket(db, { 
    bucketName: type === 'photo' ? 'photos' : 'videos' 
  });
  
  try {
    const fileInfo = await bucket.find({ _id: new ObjectId(fileId) }).next();
    if (!fileInfo) {
      throw new Error('File not found');
    }
    
    const downloadStream = bucket.openDownloadStream(new ObjectId(fileId));
    const chunks = [];
    
    return new Promise((resolve, reject) => {
      downloadStream.on('data', (chunk) => chunks.push(chunk));
      downloadStream.on('error', reject);
      downloadStream.on('end', () => {
        resolve({
          buffer: Buffer.concat(chunks),
          contentType: fileInfo.metadata?.contentType || 'application/octet-stream',
          filename: fileInfo.filename,
          size: fileInfo.length
        });
      });
    });
  } catch (error) {
    throw new Error(`Failed to retrieve file: ${error.message}`);
  }
};

const findVeteranById = async (collection, veteranId) => {
  const queries = [];
  
  if (ObjectId.isValid(veteranId)) {
    queries.push({ _id: new ObjectId(veteranId) });
  }
  
  queries.push(
    { _id: veteranId },
    { id: veteranId },
    { veteranId: veteranId }
  );
  
  for (const query of queries) {
    try {
      const veteran = await collection.findOne(query);
      if (veteran) {
        // Transform media URLs to be accessible via this same function
        if (veteran.photoId) {
          veteran.photo = `/.netlify/functions/get-veterans?media=${veteran.photoId}&type=photo`;
        }
        if (veteran.videoId) {
          veteran.videoUrl = `/.netlify/functions/get-veterans?media=${veteran.videoId}&type=video`;
        }
        return veteran;
      }
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
      { unit: { $regex: searchTerm, $options: 'i' } },
      { biography: { $regex: searchTerm, $options: 'i' } }
    ],
  } : {};
  
  query.status = { $ne: 'rejected' };
  
  const veterans = await collection.find(query)
    .limit(50)
    .sort({ submittedAt: -1 })
    .toArray();
  
  return veterans.map(veteran => {
    if (veteran.photoId) {
      veteran.photo = `/.netlify/functions/get-veterans?media=${veteran.photoId}&type=photo`;
    }
    if (veteran.videoId) {
      veteran.videoUrl = `/.netlify/functions/get-veterans?media=${veteran.videoId}&type=video`;
    }
    return veteran;
  });
};

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

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
    const db = await connectToDatabase();
    const { q: searchTerm, id: veteranId, media: mediaId, type } = event.queryStringParameters || {};

    // Handle media requests (formerly get-media functionality)
    if (mediaId && type) {
      if (!ObjectId.isValid(mediaId)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid file ID' }),
        };
      }

      if (!['photo', 'video'].includes(type)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Type must be photo or video' }),
        };
      }

      try {
        const file = await getMediaFromGridFS(db, mediaId, type);
        return {
          statusCode: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': file.contentType,
            'Content-Length': file.size.toString(),
            'Cache-Control': 'public, max-age=31536000',
            'Content-Disposition': `inline; filename="${file.filename}"`,
          },
          body: file.buffer.toString('base64'),
          isBase64Encoded: true,
        };
      } catch (error) {
        if (error.message.includes('File not found')) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'File not found' }),
          };
        }
        throw error;
      }
    }

    const collection = db.collection('betweenmeandyusan');

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
          'Cache-Control': 'public, max-age=300',
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
        'Cache-Control': 'public, max-age=60',
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