Single File: 

curl -X POST http://your-server:3000/download \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/file.zip", "destination": "/downloads/myfile.zip"}'

  Multiple Files:

  curl -X POST http://your-server:3000/batch-download \
  -H "Content-Type: application/json" \
  -d '{
    "downloads": [
      {"url": "https://example.com/file1.zip", "destination": "/downloads/file1.zip"},
      {"url": "https://example.com/file2.pdf", "destination": "/downloads/documents/file2.pdf"}
    ]
  }'