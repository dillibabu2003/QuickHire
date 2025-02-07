/** @type {import('jest').Config} */
const config = {
    extensionsToTreatAsEsm: ['.ts'],
    transform: {
      '^.+\\.js$': 'babel-jest',
    },
    testEnvironment: 'node',
  };
  
  export default config;