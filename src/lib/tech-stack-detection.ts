/**
 * Tech Stack Detection - Categorizes npm packages into technology categories
 * Based on package names and known technology stacks
 */

export type TechCategory = 'frontend' | 'backend' | 'testing';

export type TechStack = {
  name: string;
  category: TechCategory;
  type?: string; // e.g., "framework", "library", "database", etc.
};

export type TechStackInfo = {
  frontend: TechStack[];
  backend: TechStack[];
  testing: TechStack[];
};

// Comprehensive mapping of known packages to their categories
const TECH_MAPPING: Record<string, TechStack> = {
  // Frontend Frameworks
  react: { name: 'React', category: 'frontend', type: 'framework' },
  'react-dom': { name: 'React', category: 'frontend', type: 'framework' },
  vue: { name: 'Vue', category: 'frontend', type: 'framework' },
  'vue-next': { name: 'Vue', category: 'frontend', type: 'framework' },
  svelte: { name: 'Svelte', category: 'frontend', type: 'framework' },
  next: { name: 'Next.js', category: 'frontend', type: 'framework' },
  'next.js': { name: 'Next.js', category: 'frontend', type: 'framework' },
  nuxt: { name: 'Nuxt', category: 'frontend', type: 'framework' },
  gatsby: { name: 'Gatsby', category: 'frontend', type: 'framework' },
  remix: { name: 'Remix', category: 'frontend', type: 'framework' },
  astro: { name: 'Astro', category: 'frontend', type: 'framework' },
  'solid-js': { name: 'SolidJS', category: 'frontend', type: 'framework' },
  qwik: { name: 'Qwik', category: 'frontend', type: 'framework' },

  // Frontend - UI Libraries & Styling
  'react-router': { name: 'React Router', category: 'frontend', type: 'library' },
  'react-router-dom': { name: 'React Router', category: 'frontend', type: 'library' },
  tailwindcss: { name: 'Tailwind CSS', category: 'frontend', type: 'styling' },
  'tailwind-css': { name: 'Tailwind CSS', category: 'frontend', type: 'styling' },
  'styled-components': { name: 'Styled Components', category: 'frontend', type: 'styling' },
  sass: { name: 'Sass', category: 'frontend', type: 'styling' },
  scss: { name: 'Sass', category: 'frontend', type: 'styling' },
  'less': { name: 'Less', category: 'frontend', type: 'styling' },
  
  // Component Libraries
  '@mui/material': { name: 'Material-UI', category: 'frontend', type: 'component-library' },
  '@chakra-ui/react': { name: 'Chakra UI', category: 'frontend', type: 'component-library' },
  bootstrap: { name: 'Bootstrap', category: 'frontend', type: 'component-library' },
  '@nextui-org/react': { name: 'NextUI', category: 'frontend', type: 'component-library' },
  '@radix-ui/react-dialog': { name: 'Radix UI', category: 'frontend', type: 'component-library' },
  '@shadcn/ui': { name: 'shadcn/ui', category: 'frontend', type: 'component-library' },
  'flowbite': { name: 'Flowbite', category: 'frontend', type: 'component-library' },
  'daisyui': { name: 'daisyUI', category: 'frontend', type: 'component-library' },

  // Frontend - State Management
  redux: { name: 'Redux', category: 'frontend', type: 'state-management' },
  '@reduxjs/toolkit': { name: 'Redux Toolkit', category: 'frontend', type: 'state-management' },
  mobx: { name: 'MobX', category: 'frontend', type: 'state-management' },
  'react-query': { name: 'React Query', category: 'frontend', type: 'state-management' },
  '@tanstack/react-query': { name: 'TanStack Query', category: 'frontend', type: 'state-management' },
  zustand: { name: 'Zustand', category: 'frontend', type: 'state-management' },
  jotai: { name: 'Jotai', category: 'frontend', type: 'state-management' },
  recoil: { name: 'Recoil', category: 'frontend', type: 'state-management' },
  pinia: { name: 'Pinia', category: 'frontend', type: 'state-management' },
  vuex: { name: 'Vuex', category: 'frontend', type: 'state-management' },

  // Frontend - Icons & Graphics
  'lucide-react': { name: 'Lucide Icons', category: 'frontend', type: 'icons' },
  'react-icons': { name: 'React Icons', category: 'frontend', type: 'icons' },
  'font-awesome': { name: 'Font Awesome', category: 'frontend', type: 'icons' },
  'three': { name: 'Three.js', category: 'frontend', type: 'graphics' },
  'framer-motion': { name: 'Framer Motion', category: 'frontend', type: 'animation' },
  'react-spring': { name: 'React Spring', category: 'frontend', type: 'animation' },

  // Frontend - Forms & Validation
  formik: { name: 'Formik', category: 'frontend', type: 'forms' },
  'react-hook-form': { name: 'React Hook Form', category: 'frontend', type: 'forms' },
  'zod': { name: 'Zod', category: 'frontend', type: 'validation' },
  yup: { name: 'Yup', category: 'frontend', type: 'validation' },
  joi: { name: 'Joi', category: 'frontend', type: 'validation' },

  // Backend Frameworks
  express: { name: 'Express', category: 'backend', type: 'framework' },
  'express.js': { name: 'Express', category: 'backend', type: 'framework' },
  fastify: { name: 'Fastify', category: 'backend', type: 'framework' },
  '@fastify/fastify': { name: 'Fastify', category: 'backend', type: 'framework' },
  koa: { name: 'Koa', category: 'backend', type: 'framework' },
  nest: { name: 'NestJS', category: 'backend', type: 'framework' },
  '@nestjs/core': { name: 'NestJS', category: 'backend', type: 'framework' },
  hapi: { name: 'Hapi', category: 'backend', type: 'framework' },
  'restify': { name: 'Restify', category: 'backend', type: 'framework' },
  
  // Backend - APIs & GraphQL
  apollo: { name: 'Apollo', category: 'backend', type: 'graphql' },
  '@apollo/server': { name: 'Apollo Server', category: 'backend', type: 'graphql' },
  graphql: { name: 'GraphQL', category: 'backend', type: 'graphql' },
  'graphql-core': { name: 'GraphQL', category: 'backend', type: 'graphql' },
  'prisma': { name: 'Prisma', category: 'backend', type: 'orm' },
  '@prisma/client': { name: 'Prisma', category: 'backend', type: 'orm' },
  sequelize: { name: 'Sequelize', category: 'backend', type: 'orm' },

  // Backend - Authentication
  passport: { name: 'Passport', category: 'backend', type: 'auth' },
  jsonwebtoken: { name: 'JWT', category: 'backend', type: 'auth' },
  'next-auth': { name: 'NextAuth.js', category: 'backend', type: 'auth' },
  '@auth/nextjs': { name: 'Auth.js', category: 'backend', type: 'auth' },

  // Backend - Utilities & Tools
  axios: { name: 'Axios', category: 'backend', type: 'http-client' },
  fetch: { name: 'Fetch', category: 'backend', type: 'http-client' },
  'node-fetch': { name: 'Node Fetch', category: 'backend', type: 'http-client' },
  lodash: { name: 'Lodash', category: 'backend', type: 'utility' },
  'date-fns': { name: 'date-fns', category: 'backend', type: 'date' },
  dayjs: { name: 'Day.js', category: 'backend', type: 'date' },
  moment: { name: 'Moment.js', category: 'backend', type: 'date' },
  dotenv: { name: 'dotenv', category: 'backend', type: 'config' },

  // Backend - Databases
  postgres: { name: 'PostgreSQL', category: 'backend', type: 'database' },
  postgresql: { name: 'PostgreSQL', category: 'backend', type: 'database' },
  mysql: { name: 'MySQL', category: 'backend', type: 'database' },
  mongodb: { name: 'MongoDB', category: 'backend', type: 'database' },
  mongoose: { name: 'Mongoose', category: 'backend', type: 'database' },
  sqlite: { name: 'SQLite', category: 'backend', type: 'database' },
  'better-sqlite3': { name: 'SQLite', category: 'backend', type: 'database' },
  redis: { name: 'Redis', category: 'backend', type: 'cache' },
  elasticsearch: { name: 'Elasticsearch', category: 'backend', type: 'search' },
  dynamodb: { name: 'DynamoDB', category: 'backend', type: 'database' },
  firestore: { name: 'Firestore', category: 'backend', type: 'database' },
  supabase: { name: 'Supabase', category: 'backend', type: 'database' },

  // Backend - DevOps & Cloud
  docker: { name: 'Docker', category: 'backend', type: 'containerization' },
  kubernetes: { name: 'Kubernetes', category: 'backend', type: 'orchestration' },
  terraform: { name: 'Terraform', category: 'backend', type: 'infrastructure' },
  serverless: { name: 'Serverless', category: 'backend', type: 'framework' },
  aws: { name: 'AWS', category: 'backend', type: 'cloud' },
  '@aws-sdk/client-s3': { name: 'AWS', category: 'backend', type: 'cloud' },
  vercel: { name: 'Vercel', category: 'backend', type: 'deployment' },
  netlify: { name: 'Netlify', category: 'backend', type: 'deployment' },
  heroku: { name: 'Heroku', category: 'backend', type: 'deployment' },

  // Testing
  jest: { name: 'Jest', category: 'testing', type: 'testing-framework' },
  mocha: { name: 'Mocha', category: 'testing', type: 'testing-framework' },
  vitest: { name: 'Vitest', category: 'testing', type: 'testing-framework' },
  cypress: { name: 'Cypress', category: 'testing', type: 'e2e' },
  playwright: { name: 'Playwright', category: 'testing', type: 'e2e' },
  selenium: { name: 'Selenium', category: 'testing', type: 'e2e' },
  '@testing-library/react': { name: 'React Testing Library', category: 'testing', type: 'testing-library' },
  '@testing-library/vue': { name: 'Vue Testing Library', category: 'testing', type: 'testing-library' },
  sinon: { name: 'Sinon', category: 'testing', type: 'mocking' },
  faker: { name: 'Faker', category: 'testing', type: 'mock-data' },
  '@faker-js/faker': { name: 'Faker', category: 'testing', type: 'mock-data' },

  // Backend - Build Tools & Languages
  webpack: { name: 'Webpack', category: 'backend', type: 'bundler' },
  vite: { name: 'Vite', category: 'backend', type: 'bundler' },
  rollup: { name: 'Rollup', category: 'backend', type: 'bundler' },
  parcel: { name: 'Parcel', category: 'backend', type: 'bundler' },
  esbuild: { name: 'esbuild', category: 'backend', type: 'bundler' },
  turbopack: { name: 'Turbopack', category: 'backend', type: 'bundler' },
  gulp: { name: 'Gulp', category: 'backend', type: 'task-runner' },
  grunt: { name: 'Grunt', category: 'backend', type: 'task-runner' },
  typescript: { name: 'TypeScript', category: 'backend', type: 'language' },

  // Backend - Linting & Code Quality
  eslint: { name: 'ESLint', category: 'backend', type: 'linter' },
  prettier: { name: 'Prettier', category: 'backend', type: 'formatter' },
  husky: { name: 'Husky', category: 'backend', type: 'git-hooks' },
  'lint-staged': { name: 'Lint Staged', category: 'backend', type: 'git-hooks' },
  commitlint: { name: 'Commitlint', category: 'backend', type: 'git-hooks' },
};

/**
 * Extracts and categorizes the tech stack from dependencies
 * @param dependencies - The dependencies object from package.json
 * @param devDependencies - The devDependencies object from package.json
 * @param peerDependencies - The peerDependencies object from package.json
 * @returns Array of categorized tech stacks
 */
export function detectTechStack(
  dependencies?: Record<string, string>,
  devDependencies?: Record<string, string>,
  peerDependencies?: Record<string, string>,
): TechStack[] {
  const allDeps = {
    ...(peerDependencies || {}),
    ...(dependencies || {}),
    ...(devDependencies || {}),
  };

  const detected = new Map<string, TechStack>();

  for (const [packageName] of Object.entries(allDeps)) {
    const normalizedName = packageName.toLowerCase();
    
    // Check exact match first
    let match = TECH_MAPPING[normalizedName];
    
    // Check for scoped packages (@org/package)
    if (!match && normalizedName.includes('/')) {
      const parts = normalizedName.split('/');
      const mainPart = parts[1];
      match = TECH_MAPPING[mainPart];
    }
    
    // Check for partial matches (e.g., @mui/material matches @mui)
    if (!match) {
      for (const [key, value] of Object.entries(TECH_MAPPING)) {
        if (normalizedName.includes(key) || key.includes(normalizedName.split('/')[normalizedName.includes('/') ? 1 : 0])) {
          match = value;
          break;
        }
      }
    }
    
    if (match) {
      // Use the tech name as key to avoid duplicates (e.g., react and react-dom both map to "React")
      detected.set(match.name, match);
    }
  }

  return Array.from(detected.values());
}

/**
 * Groups tech stack by category
 */
export function groupTechStackByCategory(techStack: TechStack[]): Record<TechCategory, TechStack[]> {
  const grouped: Record<TechCategory, TechStack[]> = {
    frontend: [],
    backend: [],
    testing: [],
  };

  for (const tech of techStack) {
    grouped[tech.category].push(tech);
  }

  return grouped;
}

/**
 * Gets a display-friendly label for a category
 */
export function getCategoryLabel(category: TechCategory): string {
  const labels: Record<TechCategory, string> = {
    frontend: 'Frontend',
    backend: 'Backend',
    testing: 'Testing',
  };
  return labels[category];
}

/**
 * Gets a color for a category (useful for UI)
 */
export function getCategoryColor(category: TechCategory): string {
  const colors: Record<TechCategory, string> = {
    frontend: 'bg-blue-100 text-blue-800',
    backend: 'bg-purple-100 text-purple-800',
    testing: 'bg-red-100 text-red-800',
  };
  return colors[category];
}

/**
 * Detects Swift framework and libraries from source code patterns
 */
export function detectSwiftTechStack(sourceContent: string): TechStack[] {
  const detected = new Map<string, TechStack>();
  const lowerContent = sourceContent.toLowerCase();

  // Swift frameworks and libraries
  const swiftPatterns: Record<string, TechStack> = {
    'import SwiftUI': { name: 'SwiftUI', category: 'frontend', type: 'framework' },
    'import UIKit': { name: 'UIKit', category: 'frontend', type: 'framework' },
    'import AppKit': { name: 'AppKit', category: 'frontend', type: 'framework' },
    'import Foundation': { name: 'Foundation', category: 'backend', type: 'library' },
    'import Combine': { name: 'Combine', category: 'backend', type: 'reactive' },
    'import Alamofire': { name: 'Alamofire', category: 'backend', type: 'http-client' },
    'import Moya': { name: 'Moya', category: 'backend', type: 'http-client' },
    'import RealmSwift': { name: 'Realm', category: 'backend', type: 'database' },
    'import FirebaseCore': { name: 'Firebase', category: 'backend', type: 'platform' },
    'import Firebase': { name: 'Firebase', category: 'backend', type: 'platform' },
    'import RxSwift': { name: 'RxSwift', category: 'backend', type: 'reactive' },
    'import SnapKit': { name: 'SnapKit', category: 'frontend', type: 'layout' },
    'import Kingfisher': { name: 'Kingfisher', category: 'backend', type: 'image-loading' },
    'import SwiftyJSON': { name: 'SwiftyJSON', category: 'backend', type: 'json' },
    'import ObjectMapper': { name: 'ObjectMapper', category: 'backend', type: 'mapping' },
    'import XCTest': { name: 'XCTest', category: 'testing', type: 'testing-framework' },
    'import Quick': { name: 'Quick', category: 'testing', type: 'testing-framework' },
    'import Nimble': { name: 'Nimble', category: 'testing', type: 'assertion' },
  };

  for (const [pattern, tech] of Object.entries(swiftPatterns)) {
    if (lowerContent.includes(pattern.toLowerCase())) {
      detected.set(tech.name, tech);
    }
  }

  // Detect Swift language itself
  detected.set('Swift', { name: 'Swift', category: 'backend', type: 'language' });

  return Array.from(detected.values());
}

/**
 * Detects C++ and Arduino libraries from source code patterns
 */
export function detectCppArduinoTechStack(sourceContent: string): TechStack[] {
  const detected = new Map<string, TechStack>();
  const lowerContent = sourceContent.toLowerCase();

  // C++ and Arduino patterns
  const cppPatterns: Record<string, TechStack> = {
    '#include <Arduino.h>': { name: 'Arduino', category: 'backend', type: 'platform' },
    '#include "Arduino.h"': { name: 'Arduino', category: 'backend', type: 'platform' },
    'setup()': { name: 'Arduino', category: 'backend', type: 'platform' },
    'loop()': { name: 'Arduino', category: 'backend', type: 'platform' },
    '#include <Adafruit': { name: 'Adafruit Libraries', category: 'backend', type: 'libraries' },
    '#include <SPI.h>': { name: 'SPI', category: 'backend', type: 'protocol' },
    '#include <Wire.h>': { name: 'I2C/Wire', category: 'backend', type: 'protocol' },
    '#include <MQTT': { name: 'MQTT', category: 'backend', type: 'protocol' },
    '#include <HTTPClient.h>': { name: 'HTTP Client', category: 'backend', type: 'http-client' },
    '#include <ESP': { name: 'ESP32/ESP8266', category: 'backend', type: 'microcontroller' },
    '#include <NeoPixel': { name: 'NeoPixel', category: 'backend', type: 'led-library' },
    '#include <Servo.h>': { name: 'Servo', category: 'backend', type: 'library' },
    '#include <LiquidCrystal': { name: 'LiquidCrystal', category: 'backend', type: 'display' },
    '#include <DHT': { name: 'DHT Sensor Library', category: 'backend', type: 'sensor-library' },
  };

  for (const [pattern, tech] of Object.entries(cppPatterns)) {
    if (lowerContent.includes(pattern.toLowerCase())) {
      detected.set(tech.name, tech);
    }
  }

  // Detect C++ language itself
  detected.set('C++', { name: 'C++', category: 'backend', type: 'language' });

  return Array.from(detected.values());
}

/**
 * Detects HTML/CSS/JavaScript frameworks and libraries from source code patterns
 */
export function detectHtmlTechStack(sourceContent: string): TechStack[] {
  const detected = new Map<string, TechStack>();
  const lowerContent = sourceContent.toLowerCase();

  // HTML/CSS/JS framework patterns
  const htmlPatterns: Record<string, TechStack> = {
    '<meta name="viewport"': { name: 'HTML5', category: 'frontend', type: 'markup' },
    '<!DOCTYPE html>': { name: 'HTML5', category: 'frontend', type: 'markup' },
    'bootstrap': { name: 'Bootstrap', category: 'frontend', type: 'framework' },
    'tailwind': { name: 'Tailwind CSS', category: 'frontend', type: 'styling' },
    'w-': { name: 'Tailwind CSS', category: 'frontend', type: 'styling' },
    'flex': { name: 'Flexbox', category: 'frontend', type: 'css' },
    'grid': { name: 'CSS Grid', category: 'frontend', type: 'css' },
    '@media': { name: 'CSS Media Queries', category: 'frontend', type: 'css' },
    'font-awesome': { name: 'Font Awesome', category: 'frontend', type: 'icons' },
    'material-icons': { name: 'Material Icons', category: 'frontend', type: 'icons' },
    '<script': { name: 'JavaScript', category: 'frontend', type: 'language' },
    'const ': { name: 'JavaScript', category: 'frontend', type: 'language' },
    'function ': { name: 'JavaScript', category: 'frontend', type: 'language' },
    'fetch(': { name: 'Fetch API', category: 'frontend', type: 'api' },
    'axios': { name: 'Axios', category: 'frontend', type: 'http-client' },
    'jquery': { name: 'jQuery', category: 'frontend', type: 'library' },
    'react': { name: 'React', category: 'frontend', type: 'framework' },
    'vue': { name: 'Vue', category: 'frontend', type: 'framework' },
    'alpine': { name: 'Alpine.js', category: 'frontend', type: 'framework' },
    'htmx': { name: 'HTMX', category: 'frontend', type: 'library' },
    '<style': { name: 'CSS', category: 'frontend', type: 'styling' },
    'css': { name: 'CSS', category: 'frontend', type: 'styling' },
  };

  for (const [pattern, tech] of Object.entries(htmlPatterns)) {
    if (lowerContent.includes(pattern.toLowerCase())) {
      detected.set(tech.name, tech);
    }
  }

  // Detect HTML itself
  detected.set('HTML', { name: 'HTML', category: 'frontend', type: 'markup' });

  return Array.from(detected.values());
}
