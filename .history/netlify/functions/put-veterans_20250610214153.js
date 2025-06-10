// netlify/functions/put-veterans.js
const { MongoClient, GridFSBucket } = require('mongodb');
const { Readable } = require('stream');

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

const uploadToGridFS = async (db, fileBuffer, filename, contentType, type) => {
  const bucket = new GridFSBucket(db, { 
    bucketName: type === 'photo' ? 'photos' : 'videos' 
  });
  
  const uploadStream = bucket.openUploadStream(filename, {
    metadata: {
      contentType: contentType,
      uploadDate: new Date(),
      fileSize: fileBuffer.length,
      type: type
    }
  });
  
  const readable = new Readable();
  readable.push(fileBuffer);
  readable.push(null);
  
  return new Promise((resolve, reject) => {
    uploadStream.on('error', reject);
    uploadStream.on('finish', () => {
      resolve({
        id: uploadStream.id,
        filename: filename,
        contentType: contentType,
        size: fileBuffer.length,
        url: `/.netlify/functions/get-veterans?media=${uploadStream.id}&type=${type}`
      });
    });
    
    readable.pipe(uploadStream);
  });
};

const parseMultipartForm = (body, boundary) => {
  const parts = body.split(`--${boundary}`);
  const files = {};
  const fields = {};

  for (const part of parts) {
    if (!part.includes('Content-Disposition')) continue;

    const lines = part.split('\r\n');
    const dispositionLine = lines.find(line => line.includes('Content-Disposition'));
    const contentTypeLine = lines.find(line => line.includes('Content-Type'));
    
    if (!dispositionLine) continue;

    const nameMatch = dispositionLine.match(/name="([^"]+)"/);
    if (!nameMatch) continue;

    const fieldName = nameMatch[1];
    const contentStart = part.indexOf('\r\n\r\n') + 4;
    const contentEnd = part.lastIndexOf('\r\n');
    
    if (contentStart >= contentEnd) continue;

    const content = part.substring(contentStart, contentEnd);

    if (dispositionLine.includes('filename=')) {
      const filenameMatch = dispositionLine.match(/filename="([^"]+)"/);
      const filename = filenameMatch ? filenameMatch[1] : 'unknown';
      const contentType = contentTypeLine ? contentTypeLine.split(': ')[1] : 'application/octet-stream';
      
      files[fieldName] = {
        filename: filename,
        contentType: contentType,
        buffer: Buffer.from(content, 'binary'),
        size: Buffer.from(content, 'binary').length
      };
    } else {
      fields[fieldName] = content.trim();
    }
  }

  return { files, fields };
};

const handleFileUpload = async (event, db) => {
  const contentType = event.headers['content-type'] || '';
  
  if (!contentType.includes('multipart/form-data')) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Content-Type must be multipart/form-data for file uploads' }),
    };
  }

  const boundary = contentType.split('boundary=')[1];
  if (!boundary) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid multipart data - no boundary found' }),
    };
  }

  const bodyBuffer = event.isBase64Encoded 
    ? Buffer.from(event.body, 'base64')
    : Buffer.from(event.body, 'utf8');
  
  const { files, fields } = parseMultipartForm(bodyBuffer.toString('binary'), boundary);
  
  if (!files.file) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'No file provided' }),
    };
  }

  const file = files.file;
  const type = fields.type;

  if (!type || !['photo', 'video'].includes(type)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Type must be "photo" or "video"' }),
    };
  }

  const validTypes = type === 'photo' 
    ? ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    : ['video/mp4', 'video/webm', 'video/mov'];
  
  if (!validTypes.includes(file.contentType.toLowerCase())) {
    return {
      statusCode: 400,
      body: JSON.stringify({ 
        error: `Invalid file type. Expected: ${validTypes.join(', ')}` 
      }),
    };
  }

  const maxSize = type === 'photo' ? 10 * 1024 * 1024 : 100 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      statusCode: 400,
      body: JSON.stringify({ 
        error: `File too large. Maximum size: ${type === 'photo' ? '10MB' : '100MB'}` 
      }),
    };
  }

  const result = await uploadToGridFS(db, file.buffer, file.filename, file.contentType, type);
  return {
    statusCode: 200,
    body: JSON.stringify(result),
  };
};

const handleStorySubmission = async (event, db) => {
  let storyData;
  try {
    storyData = JSON.parse(event.body);
  } catch (parseError) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON in request body' }),
    };
  }

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

  if (!storyData.consent) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Consent is required to submit story' }),
    };
  }

  const collection = db.collection('betweenmeandyusan');

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
    status: 'pending',
    
    photoUrl: storyData.photoUrl || null,
    photoId: storyData.photoId || null,
    videoUrl: storyData.videoUrl || null,
    videoId: storyData.videoId || null,
    
    biography: storyData.biography ? storyData.biography.trim() : null,
    medals: storyData.medals ? storyData.medals.trim() : null,
    campaigns: storyData.campaigns ? storyData.campaigns.trim() : null,
    additionalInfo: storyData.additionalInfo ? storyData.additionalInfo.trim() : null,
    country: storyData.country || 'United States',
  };

  const result = await collection.insertOne(veteranStory);

  if (!result.insertedId) {
    throw new Error('Failed to insert story into database');
  }

  return {
    statusCode: 201,
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
};

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  try {
    const db = await connectToDatabase();
    const contentType = event.headers['content-type'] || '';
    
    // Route based on content type
    let result;
    if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      result = await handleFileUpload(event, db);
    } else {
      // Handle story submission
      result = await handleStorySubmission(event, db);
    }

    return {
      ...result,
      headers: {
        ...headers,
        ...result.headers
      }
    };

  } catch (error) {
    console.error('Function error:', error);
    
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
        message: process.env.NODE_ENV === 'development' ? error.message : 'Failed to process request'
      }),
    };
  }
};