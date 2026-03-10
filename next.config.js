/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Include question bank in serverless bundle (Vercel file tracing)
  outputFileTracingIncludes: {
    '/app': ['./data/questions/**'],
    '/api/next-question': ['./data/questions/**'],
    '/api/submit-answer': ['./data/questions/**'],
    '/api/scorecard': ['./data/questions/**'],
    '/api/scorecard/breakdown': ['./data/questions/**'],
  },
};

module.exports = nextConfig;
