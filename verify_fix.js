const http = require('http');

const data = JSON.stringify({
    userId: "test_user",
    email: "test@example.com",
    fingerprint: {
        userAgent: "Mozilla/5.0",
        platform: "Win32",
        screenResolution: "1920x1080",
        timezone: "UTC",
        hardwareConcurrency: 8,
        language: "en-US",
        cookieEnabled: true,
        timestamp: Date.now()
    },
    simulateFlags: {
        apiBurst: true
    }
});

const options = {
    hostname: 'localhost',
    port: 8000,
    path: '/predict/risk',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    console.log(`Status Code: ${res.statusCode}`);
    let body = '';
    res.on('data', (d) => { body += d; });
    res.on('end', () => {
        try {
            console.log('Response Body:', JSON.parse(body));
        } catch (e) {
            console.log('Raw body:', body);
        }
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.write(data);
req.end();
