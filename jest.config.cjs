module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\.(jsx?|mjs)$': 'babel-jest'
  },
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  moduleFileExtensions: ['js', 'jsx', 'mjs'],
  transformIgnorePatterns: ['/node_modules/(?!.*\.mjs$)']
};
