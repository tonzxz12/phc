/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      screens: {
            'custom': '768px', // Your custom breakpoint    
            'phone': '368px',   
            'custom1020': '1020px', 
            'custom1130': '1130px', 
            'chatroom' : '414px',
            'smallest' : '375px'
          },
      colors: {
        primary: {
          1: "#212529",
          2: "#1f2e4d",
          3: "#f5a425",
        }
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif']
      },
      fontSize: {
        '25px': '25px'
      },
      boxShadow: {
        'blue': '0 10px 15px -3px rgba(59, 130, 246, 0.3)',
        'blue-lg': '0 10px 15px -3px rgba(59, 130, 246, 0.5)',
        'blue-xl': '0 10px 15px -3px rgba(59, 130, 246, 0.7)',
        'blue-2xl': '0 10px 15px -3px rgba(59, 130, 246, 0.9)',
      }
    },
  },
  plugins: [require('tailwindcss-primeui')]
  
}
