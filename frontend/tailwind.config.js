export default {
  content: ['./index.html', './src/**/*.{js,ts}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#A92626',
          hover: '#8B1E1E',
          light: '#FDF2F2'
        },
        surface: {
          base: '#FFFFFF',
          nav: '#F8F9FA'
        },
        ink: {
          primary: '#1A1A1A',
          secondary: '#666666',
          border: '#E5E7EB'
        }
      }
    }
  },
  plugins: []
};
