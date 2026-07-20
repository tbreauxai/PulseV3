import Groq from 'groq-sdk';
import * as fs from 'fs';
import { resolve } from 'path';

const envFile = fs.readFileSync(resolve(process.cwd(), '.env'), 'utf-8');
const env: Record<string, string> = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1]] = match[2].trim();
  }
});

const groq = new Groq({ apiKey: env['VITE_GROQ_API_KEY'] || 'test' }); // Wait, the user puts their key in localStorage.
