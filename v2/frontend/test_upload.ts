import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

async function testUpload() {
  try {
    // 1. Get token
    const loginRes = await axios.post('http://localhost:8080/api/v1/auth/login', {
      email: 'student@example.com',
      password: 'demo123'
    });
    const token = loginRes.data.accessToken;

    // 2. Create apiClient with default application/json
    const apiClient = axios.create({
      baseURL: 'http://localhost:8080/api/v1',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add auth interceptor
    apiClient.interceptors.request.use((config) => {
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    });

    // 3. Create dummy file
    fs.writeFileSync('dummy.pdf', 'dummy content');
    
    // 4. Try upload WITHOUT Content-Type (current state)
    console.log('Testing upload WITHOUT Content-Type override...');
    const form1 = new FormData();
    form1.append('file', fs.createReadStream('dummy.pdf'));
    try {
      await apiClient.post('/pdfs/upload', form1);
      console.log('SUCCESS: No override');
    } catch (e: any) {
      console.log('FAILED: No override', e.response?.status, e.response?.data);
    }

    // 5. Try upload WITH Content-Type: multipart/form-data (previous state)
    console.log('\nTesting upload WITH multipart/form-data override...');
    const form2 = new FormData();
    form2.append('file', fs.createReadStream('dummy.pdf'));
    try {
      await apiClient.post('/pdfs/upload', form2, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      console.log('SUCCESS: With override');
    } catch (e: any) {
      console.log('FAILED: With override', e.response?.status, e.response?.data);
    }

    // 6. Try upload with Content-Type undefined
    console.log('\nTesting upload WITH Content-Type: undefined...');
    const form3 = new FormData();
    form3.append('file', fs.createReadStream('dummy.pdf'));
    try {
      await apiClient.post('/pdfs/upload', form3, {
        headers: {
          // In axios, setting a header to false or undefined deletes it
          'Content-Type': undefined
        }
      });
      console.log('SUCCESS: With undefined');
    } catch (e: any) {
      console.log('FAILED: With undefined', e.response?.status, e.response?.data);
    }
  } catch (e: any) {
    console.error('Fatal error', e.message);
  }
}

testUpload();
