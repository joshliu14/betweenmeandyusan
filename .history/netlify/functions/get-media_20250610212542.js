// netlify/functions/get-media.js
const { MongoClient, GridFSBucket, ObjectId } = require('mongodb');

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
    // Get file info
    const fileInfo = await bucket.find({ _id: new ObjectId(fileId) }).next();
    if (!fileInfo) {
      throw new Error('File not found');
    }
    
    // Get file data
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

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
    const { id, type } = event.queryStringParameters || {};
    
    if (!id || !type) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing id or type parameter' }),
      };
    }

    if (!ObjectId.isValid(id)) {
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

    const db = await connectToDatabase();
    const file = await getMediaFromGridFS(db, id, type);

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': file.contentType,
        'Content-Length': file.size.toString(),
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
        'Content-Disposition': `inline; filename="${file.filename}"`,
      },
      body: file.buffer.toString('base64'),
      isBase64Encoded: true,
    };

  } catch (error) {
    console.error('Get media error:', error);
    
    if (error.message