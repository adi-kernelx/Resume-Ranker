// Tailwind runs through PostCSS inside the CRA build; CRACO lets us add it without ejecting.
module.exports = {
  style: {
    postcss: {
      plugins: [require('tailwindcss'), require('autoprefixer')],
    },
  },
};
