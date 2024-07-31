# Ola Map

This project is a React JS application that integrates with the Ola Maps API using the ola-map-sdk to provide place autocomplete and directions functionalities. The app displays a map using MapLibre and allows users to search for places, see autocomplete suggestions, and get directions to a selected place.

## Features

- **Place Autocomplete**: As you type in the search box, autocomplete suggestions appear based on the input.
- **Map Display**: Displays a map using MapLibre with a custom style.
- **Directions**: Calculates and displays the distance and duration from the user's current location to the selected place.
- **Recenter Button**: A button to recenter the map on the user's current location.

## Setup

### Installation

1. Clone the repository:
```bash
git clone https://github.com/kunalkcube/ola-map.git
cd ola-map
```

2. Install dependencies:
```bash
npm install 
```

3. Create a `.env` file in the root of the project and add your Ola Maps API key:
```
VITE_API_KEY=your_ola_maps_api_key
```

4. Start the development server:
```bash
npm run dev
```

## Usage

1. Open the application in your browser (http://localhost:5173).

2. Type a place name in the search box to see autocomplete suggestions.

3. Select a suggestion to see the map centered on the selected place. If a place is selected, it will display the distance and duration from the user's current location to the selected place.

4. Use the recenter button at the bottom right to recenter the map on your current location.

## Contributing
Contributions are welcome! Feel free to submit pull requests.

## License
MIT
